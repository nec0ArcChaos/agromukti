import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, ConflictError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import { tulisMutasiStok } from "@/server/modules/pupuk/pupuk.service";
import { sisaBolehSalur } from "@/server/modules/permintaan/permintaan.service";

export const skemaBuatDistribusi = z.object({
  permintaanId: z.string().min(1, "Pilih permintaan yang akan disalurkan."),
  tanggalDistribusi: z.coerce.date().optional(),
  keterangan: z.string().trim().optional(),
  item: z
    .array(
      z.object({
        produkPupukId: z.string().min(1),
        jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0."),
        satuan: z.string().trim().default("KG"),
      }),
    )
    .min(1, "Isi sekurang-kurangnya satu jenis pupuk yang disalurkan."),
});

export const skemaFilterDistribusi = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["DIPROSES", "DIKIRIM", "DITERIMA", "DIBATALKAN"]).optional(),
});

const SERTAKAN = {
  permintaan: {
    select: {
      id: true,
      nomor: true,
      status: true,
      petani: { select: { kode: true, warga: { select: { nama: true, dusun: true } } } },
    },
  },
  detail: { include: { produkPupuk: { select: { kode: true, nama: true, satuan: true } } } },
} satisfies Prisma.DistribusiPupukInclude;

export async function daftarDistribusi(f: z.infer<typeof skemaFilterDistribusi>) {
  const where: Prisma.DistribusiPupukWhereInput = f.status ? { status: f.status } : {};

  const [rows, total] = await Promise.all([
    prisma.distribusiPupuk.findMany({
      where,
      include: SERTAKAN,
      orderBy: { tanggalDistribusi: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.distribusiPupuk.count({ where }),
  ]);

  return { rows, total };
}

export async function ambilDistribusi(id: string) {
  const d = await prisma.distribusiPupuk.findUnique({ where: { id }, include: SERTAKAN });
  if (!d) throw new NotFoundError("Distribusi pupuk");
  return d;
}

/**
 * Menyalurkan pupuk atas sebuah permintaan yang sudah DISETUJUI.
 *
 * Dua penjagaan yang berbeda dan keduanya perlu:
 *  1. Tidak boleh melebihi yang DISETUJUI - dijaga di sini lewat
 *     sisaBolehSalur(), supaya penyaluran bertahap tidak menumpuk melebihi
 *     permintaan aslinya.
 *  2. Tidak boleh melebihi STOK - dijaga di tulisMutasiStok(), satu tempat
 *     untuk semua jalur yang mengurangi stok.
 *
 * Stok langsung berkurang saat distribusi dibuat, bukan menunggu status
 * DITERIMA: barangnya memang sudah keluar gudang sejak dikirim.
 */
export async function buatDistribusi(input: z.infer<typeof skemaBuatDistribusi>, userId: string) {
  const permintaan = await prisma.permintaanPupuk.findUnique({
    where: { id: input.permintaanId },
    include: { petani: { select: { kode: true, warga: { select: { nama: true } } } } },
  });
  if (!permintaan) throw new NotFoundError("Permintaan pupuk");
  if (permintaan.status !== "DISETUJUI") {
    throw new ConflictError(
      "BELUM_DISETUJUI",
      `Permintaan ${permintaan.nomor} berstatus ${permintaan.status}. Hanya permintaan yang sudah disetujui bisa disalurkan.`,
    );
  }

  const sisa = await sisaBolehSalur(input.permintaanId);
  const petaSisa = new Map(sisa.map((s) => [s.produkPupukId, s]));

  for (const item of input.item) {
    const s = petaSisa.get(item.produkPupukId);
    if (!s) {
      const produk = await prisma.produkPupuk.findUnique({ where: { id: item.produkPupukId } });
      throw new AppError(
        "DI_LUAR_PERMINTAAN",
        `${produk?.nama ?? "Produk itu"} tidak ada dalam permintaan ${permintaan.nomor}.`,
        409,
      );
    }
    if (new Prisma.Decimal(item.jumlah).greaterThan(s.sisa)) {
      const produk = await prisma.produkPupuk.findUnique({ where: { id: item.produkPupukId } });
      throw new AppError(
        "MELEBIHI_PERMINTAAN",
        `${produk?.nama ?? "Produk"}: sisa yang boleh disalurkan ${s.sisa.toString()} ` +
          `${produk?.satuan.toLowerCase() ?? ""}, diminta ${item.jumlah}. ` +
          `Dari ${s.diminta.toString()} yang disetujui, ${s.terkirim.toString()} sudah disalurkan.`,
        409,
      );
    }
  }

  const tanggal = input.tanggalDistribusi ?? new Date();

  const hasil = await prisma.$transaction(async (tx) => {
    const nomor = await ambilNomor(tx, "DISTRIBUSI", tanggal);

    const distribusi = await tx.distribusiPupuk.create({
      data: {
        nomor,
        permintaanId: input.permintaanId,
        tanggalDistribusi: tanggal,
        keterangan: input.keterangan,
        operatorId: userId,
        detail: { create: input.item },
      },
    });

    for (const item of input.item) {
      await tulisMutasiStok(tx, {
        produkPupukId: item.produkPupukId,
        arah: "KELUAR",
        jumlah: item.jumlah,
        refTipe: "DISTRIBUSI",
        refId: distribusi.id,
        sumber: `Penyaluran ${nomor}`,
        keterangan: `Kepada ${permintaan.petani.warga.nama} (${permintaan.nomor})`,
        tanggal,
      });
    }

    await catatAudit(
      {
        userId,
        aksi: "CREATE",
        tabel: "DistribusiPupuk",
        recordId: distribusi.id,
        dataBaru: { nomor, permintaan: permintaan.nomor, jumlahItem: input.item.length },
      },
      tx,
    );

    return distribusi;
  });

  await perbaruiStatusPermintaan(input.permintaanId);
  return ambilDistribusi(hasil.id);
}

/**
 * Menandai permintaan SELESAI bila seluruh item sudah tersalurkan penuh.
 * Dipanggil setelah distribusi dibuat atau dibatalkan.
 */
async function perbaruiStatusPermintaan(permintaanId: string) {
  const sisa = await sisaBolehSalur(permintaanId);
  const lunas = sisa.every((s) => s.sisa.equals(0));

  const p = await prisma.permintaanPupuk.findUnique({ where: { id: permintaanId } });
  if (!p) return;

  if (lunas && p.status === "DISETUJUI") {
    await prisma.permintaanPupuk.update({ where: { id: permintaanId }, data: { status: "SELESAI" } });
  } else if (!lunas && p.status === "SELESAI") {
    // Pembatalan distribusi membuka kembali sisa yang harus disalurkan.
    await prisma.permintaanPupuk.update({ where: { id: permintaanId }, data: { status: "DISETUJUI" } });
  }
}

export async function ubahStatusDistribusi(
  id: string,
  status: "DIKIRIM" | "DITERIMA",
  userId: string,
) {
  const d = await prisma.distribusiPupuk.findUnique({ where: { id } });
  if (!d) throw new NotFoundError("Distribusi pupuk");
  if (d.status === "DIBATALKAN") {
    throw new ConflictError("SUDAH_DIBATALKAN", `Distribusi ${d.nomor} sudah dibatalkan.`);
  }

  const hasil = await prisma.distribusiPupuk.update({ where: { id }, data: { status }, include: SERTAKAN });
  await catatAudit({ userId, aksi: "UPDATE", tabel: "DistribusiPupuk", recordId: id, dataBaru: { status } });
  return hasil;
}

/** Membatalkan distribusi: stok dikembalikan, sisa permintaan terbuka lagi. */
export async function batalDistribusi(id: string, alasan: string, userId: string) {
  const d = await prisma.distribusiPupuk.findUnique({ where: { id }, include: { detail: true } });
  if (!d) throw new NotFoundError("Distribusi pupuk");
  if (d.status === "DIBATALKAN") {
    throw new ConflictError("SUDAH_DIBATALKAN", `Distribusi ${d.nomor} sudah dibatalkan sebelumnya.`);
  }

  await prisma.$transaction(async (tx) => {
    for (const item of d.detail) {
      await tulisMutasiStok(tx, {
        produkPupukId: item.produkPupukId,
        arah: "MASUK",
        jumlah: item.jumlah,
        refTipe: "DISTRIBUSI",
        refId: d.id,
        sumber: `Pembatalan ${d.nomor}`,
        keterangan: alasan,
      });
    }

    await tx.distribusiPupuk.update({
      where: { id },
      data: { status: "DIBATALKAN", keterangan: `Dibatalkan: ${alasan}` },
    });

    await catatAudit(
      { userId, aksi: "VOID", tabel: "DistribusiPupuk", recordId: id, dataBaru: { status: "DIBATALKAN", alasan } },
      tx,
    );
  });

  await perbaruiStatusPermintaan(d.permintaanId);
  return ambilDistribusi(id);
}

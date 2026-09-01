import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, ConflictError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import { hitungSubtotal } from "@/server/lib/money";

export const STATUS_PERMINTAAN = ["DIAJUKAN", "DIPROSES", "DISETUJUI", "DITOLAK", "SELESAI"] as const;

export const skemaBuatPermintaan = z.object({
  petaniId: z.string().min(1, "Pilih petani terlebih dahulu."),
  tanggal: z.coerce.date().optional(),
  keterangan: z.string().trim().optional(),
  item: z
    .array(
      z.object({
        produkPupukId: z.string().min(1),
        jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0."),
        satuan: z.string().trim().default("KG"),
      }),
    )
    .min(1, "Isi sekurang-kurangnya satu jenis pupuk yang diminta."),
});

export const skemaKeputusan = z.object({
  alasan: z.string().trim().optional(),
});

export const skemaFilterPermintaan = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  petaniId: z.string().optional(),
  status: z.enum(STATUS_PERMINTAAN).optional(),
});

const SERTAKAN = {
  petani: {
    select: {
      id: true,
      kode: true,
      kelompokTani: true,
      warga: {
        select: {
          nama: true,
          dusun: true,
          // Saldo ditampilkan ke PETUGAS (bukan portal publik) supaya
          // terlihat apakah warga mampu membayar pupuknya dari tabungan.
          nasabah: { select: { kode: true, saldo: true, status: true } },
        },
      },
    },
  },
  detail: {
    include: { produkPupuk: { select: { id: true, kode: true, nama: true, satuan: true, stok: true, harga: true } } },
  },
  distribusi: {
    select: { id: true, nomor: true, status: true, tanggalDistribusi: true, detail: true },
  },
} satisfies Prisma.PermintaanPupukInclude;

export async function daftarPermintaan(f: z.infer<typeof skemaFilterPermintaan>) {
  const where: Prisma.PermintaanPupukWhereInput = {
    ...(f.petaniId ? { petaniId: f.petaniId } : {}),
    ...(f.status ? { status: f.status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.permintaanPupuk.findMany({
      where,
      include: SERTAKAN,
      orderBy: { tanggal: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.permintaanPupuk.count({ where }),
  ]);

  return { rows, total };
}

export async function ambilPermintaan(id: string) {
  const p = await prisma.permintaanPupuk.findUnique({ where: { id }, include: SERTAKAN });
  if (!p) throw new NotFoundError("Permintaan pupuk");
  return p;
}

/**
 * Mengajukan permintaan pupuk.
 *
 * Stok TIDAK divalidasi di sini - permintaan boleh melebihi stok yang ada,
 * karena itulah gunanya permintaan: memberi tahu pengelola berapa
 * kebutuhan sebenarnya. Stok baru mengikat saat distribusi.
 */
export async function buatPermintaan(input: z.infer<typeof skemaBuatPermintaan>, userId: string) {
  const petani = await prisma.petani.findUnique({
    where: { id: input.petaniId },
    include: { warga: { select: { nama: true } } },
  });
  if (!petani) throw new NotFoundError("Petani");
  if (petani.status !== "AKTIF") {
    throw new AppError("PETANI_NONAKTIF", `${petani.warga.nama} berstatus nonaktif.`, 409);
  }

  const idProduk = [...new Set(input.item.map((i) => i.produkPupukId))];
  const produkList = await prisma.produkPupuk.findMany({ where: { id: { in: idProduk } } });
  if (produkList.length !== idProduk.length) throw new NotFoundError("Produk pupuk");
  const petaProduk = new Map(produkList.map((p) => [p.id, p]));

  // Perkiraan biaya disimpan agar petani tahu ancar-ancarnya sejak
  // mengajukan. Ini BUKAN harga yang mengikat - yang mengikat adalah
  // snapshot saat penyaluran, karena harga bisa berubah di antaranya.
  const baris = input.item.map((i) => {
    const p = petaProduk.get(i.produkPupukId)!;
    return { ...i, hargaSatuan: p.harga, subtotal: hitungSubtotal(i.jumlah, p.harga) };
  });

  const tanggal = input.tanggal ?? new Date();

  const permintaan = await prisma.$transaction(async (tx) => {
    const nomor = await ambilNomor(tx, "PERMINTAAN", tanggal);
    return tx.permintaanPupuk.create({
      data: {
        nomor,
        petaniId: input.petaniId,
        tanggal,
        keterangan: input.keterangan,
        detail: { create: baris },
      },
      include: SERTAKAN,
    });
  });

  await catatAudit({
    userId,
    aksi: "CREATE",
    tabel: "PermintaanPupuk",
    recordId: permintaan.id,
    dataBaru: { nomor: permintaan.nomor, jumlahItem: input.item.length },
  });
  return permintaan;
}

export async function setujuiPermintaan(id: string, userId: string) {
  const p = await prisma.permintaanPupuk.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Permintaan pupuk");
  if (p.status !== "DIAJUKAN" && p.status !== "DIPROSES") {
    throw new ConflictError("BUKAN_DIAJUKAN", `Permintaan ${p.nomor} sudah diproses sebelumnya (${p.status}).`);
  }

  const hasil = await prisma.permintaanPupuk.update({
    where: { id },
    data: { status: "DISETUJUI" },
    include: SERTAKAN,
  });
  await catatAudit({ userId, aksi: "APPROVE", tabel: "PermintaanPupuk", recordId: id, dataBaru: { status: "DISETUJUI" } });
  return hasil;
}

export async function tolakPermintaan(id: string, alasan: string, userId: string) {
  const p = await prisma.permintaanPupuk.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Permintaan pupuk");
  if (p.status !== "DIAJUKAN" && p.status !== "DIPROSES") {
    throw new ConflictError("BUKAN_DIAJUKAN", `Permintaan ${p.nomor} sudah diproses sebelumnya (${p.status}).`);
  }

  const hasil = await prisma.permintaanPupuk.update({
    where: { id },
    data: { status: "DITOLAK", alasanTolak: alasan },
    include: SERTAKAN,
  });
  await catatAudit({ userId, aksi: "REJECT", tabel: "PermintaanPupuk", recordId: id, dataBaru: { status: "DITOLAK", alasan } });
  return hasil;
}

/**
 * Berapa yang MASIH boleh disalurkan untuk tiap produk pada permintaan ini.
 *
 * Satu permintaan boleh disalurkan bertahap (mis. stok baru cukup
 * sebagian). Sisa dihitung dari yang diminta dikurangi seluruh distribusi
 * yang belum dibatalkan - tanpa ini, distribusi berulang bisa menyalurkan
 * jauh lebih banyak daripada yang pernah disetujui.
 */
export async function sisaBolehSalur(permintaanId: string) {
  const p = await prisma.permintaanPupuk.findUnique({
    where: { id: permintaanId },
    include: {
      detail: true,
      distribusi: { where: { status: { not: "DIBATALKAN" } }, include: { detail: true } },
    },
  });
  if (!p) throw new NotFoundError("Permintaan pupuk");

  const sudah = new Map<string, Prisma.Decimal>();
  for (const d of p.distribusi) {
    for (const item of d.detail) {
      sudah.set(item.produkPupukId, (sudah.get(item.produkPupukId) ?? new Prisma.Decimal(0)).add(item.jumlah));
    }
  }

  return p.detail.map((d) => {
    const terkirim = sudah.get(d.produkPupukId) ?? new Prisma.Decimal(0);
    return {
      produkPupukId: d.produkPupukId,
      diminta: d.jumlah,
      terkirim,
      sisa: Prisma.Decimal.max(d.jumlah.sub(terkirim), new Prisma.Decimal(0)),
    };
  });
}

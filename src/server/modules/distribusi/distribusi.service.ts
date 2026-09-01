import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, ConflictError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import { hitungSubtotal, formatRupiah } from "@/server/lib/money";
import { tulisMutasiStok } from "@/server/modules/pupuk/pupuk.service";
import { sisaBolehSalur } from "@/server/modules/permintaan/permintaan.service";

export const METODE_BAYAR = ["SALDO", "TUNAI", "SUBSIDI"] as const;

export const skemaBuatDistribusi = z.object({
  permintaanId: z.string().min(1, "Pilih permintaan yang akan disalurkan."),
  tanggalDistribusi: z.coerce.date().optional(),
  metodeBayar: z.enum(METODE_BAYAR).default("SALDO"),
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
    include: {
      petani: {
        select: {
          kode: true,
          warga: {
            select: {
              nama: true,
              nasabah: { select: { id: true, kode: true, saldo: true, status: true } },
            },
          },
        },
      },
    },
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

  // Harga di-snapshot sekarang, sama seperti harga setoran: perubahan
  // harga pupuk bulan depan tidak boleh mengubah nilai penyaluran yang
  // sudah memotong saldo warga.
  const produkList = await prisma.produkPupuk.findMany({
    where: { id: { in: input.item.map((i) => i.produkPupukId) } },
  });
  const petaProduk = new Map(produkList.map((p) => [p.id, p]));

  const baris = input.item.map((item) => {
    const produk = petaProduk.get(item.produkPupukId);
    if (!produk) throw new NotFoundError("Produk pupuk");
    return {
      ...item,
      hargaSatuan: produk.harga,
      subtotal: hitungSubtotal(item.jumlah, produk.harga),
    };
  });
  const totalNilai = baris.reduce((a, b) => a + b.subtotal, 0);

  const nasabah = permintaan.petani.warga.nasabah.find((n) => n.status === "AKTIF") ?? null;

  // Pembayaran dari saldo hanya mungkin bila petaninya memang punya
  // rekening aktif dan saldonya cukup. Pesannya menyebut angka dan kedua
  // jalan keluarnya, karena operator perlu bisa menjelaskan ke warga di
  // depan meja - bukan sekadar tahu bahwa sistem menolak.
  if (input.metodeBayar === "SALDO") {
    if (!nasabah) {
      throw new AppError(
        "TIDAK_PUNYA_REKENING",
        `${permintaan.petani.warga.nama} tidak punya rekening bank sampah yang aktif, ` +
          `sehingga tidak bisa membayar dari tabungan. Pilih pembayaran tunai, atau daftarkan rekeningnya dulu.`,
        409,
      );
    }
    if (nasabah.saldo < totalNilai) {
      const kurang = totalNilai - nasabah.saldo;
      throw new AppError(
        "SALDO_TIDAK_CUKUP",
        `Saldo ${permintaan.petani.warga.nama} ${formatRupiah(nasabah.saldo)}, ` +
          `sedangkan pupuk ini bernilai ${formatRupiah(totalNilai)} - kurang ${formatRupiah(kurang)}. ` +
          `Pilihannya: warga menyetor sampah lagi ke bank sampah untuk menambah saldo, ` +
          `atau membayar tunai ke petugas.`,
        409,
        { metodeBayar: `Kurang ${formatRupiah(kurang)}` },
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
        totalNilai,
        metodeBayar: input.metodeBayar,
        nasabahId: input.metodeBayar === "SALDO" ? nasabah!.id : null,
        keterangan: input.keterangan,
        operatorId: userId,
        detail: { create: baris },
      },
    });

    for (const item of baris) {
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

    if (input.metodeBayar === "SALDO" && totalNilai > 0) {
      // Memotong tabungan: kewajiban bank sampah kepada warga berkurang.
      // TIDAK menambah kas - tidak ada uang tunai yang bergerak, dan
      // mencatatnya sebagai kas masuk akan menggandakan pencatatan.
      const saldoSesudah = nasabah!.saldo - totalNilai;
      await tx.mutasiTabungan.create({
        data: {
          nasabahId: nasabah!.id,
          tanggal,
          jenis: "PEMBELIAN_PUPUK",
          debit: totalNilai,
          saldoSesudah,
          refTipe: "DISTRIBUSI",
          refId: distribusi.id,
          keterangan: `Pembelian pupuk ${nomor} (${permintaan.nomor})`,
        },
      });
      await tx.nasabah.update({ where: { id: nasabah!.id }, data: { saldo: saldoSesudah } });
    }

    if (input.metodeBayar === "TUNAI" && totalNilai > 0) {
      // Uang tunai benar-benar masuk ke kas lembaga.
      const kasTerakhir = await tx.mutasiKas.findFirst({ orderBy: { createdAt: "desc" } });
      await tx.mutasiKas.create({
        data: {
          tanggal,
          arah: "MASUK",
          kategori: "PENJUALAN_PUPUK",
          jumlah: totalNilai,
          saldoSesudah: (kasTerakhir?.saldoSesudah ?? 0) + totalNilai,
          refTipe: "DISTRIBUSI",
          refId: distribusi.id,
          keterangan: `Pembayaran tunai pupuk ${nomor} oleh ${permintaan.petani.warga.nama}`,
        },
      });
    }

    await catatAudit(
      {
        userId,
        aksi: "CREATE",
        tabel: "DistribusiPupuk",
        recordId: distribusi.id,
        dataBaru: {
          nomor,
          permintaan: permintaan.nomor,
          totalNilai,
          metodeBayar: input.metodeBayar,
          jumlahItem: baris.length,
        },
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

  // Pembayarannya juga harus dikembalikan, bukan hanya stoknya. Kalau
  // hanya stok yang balik, warga tetap kehilangan saldo untuk pupuk yang
  // tidak pernah ia terima.
  if (d.metodeBayar === "TUNAI" && d.totalNilai > 0) {
    const kasTerakhir = await prisma.mutasiKas.findFirst({ orderBy: { createdAt: "desc" } });
    const saldoKas = kasTerakhir?.saldoSesudah ?? 0;
    if (saldoKas < d.totalNilai) {
      throw new AppError(
        "KAS_TIDAK_CUKUP_UNTUK_BATAL",
        `Kas saat ini ${formatRupiah(saldoKas)}, kurang dari ${formatRupiah(d.totalNilai)} ` +
          `yang harus dikembalikan atas pembatalan ini.`,
        409,
      );
    }
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

    if (d.metodeBayar === "SALDO" && d.nasabahId && d.totalNilai > 0) {
      const n = await tx.nasabah.findUniqueOrThrow({ where: { id: d.nasabahId } });
      const saldoSesudah = n.saldo + d.totalNilai;
      await tx.mutasiTabungan.create({
        data: {
          nasabahId: d.nasabahId,
          jenis: "PEMBATALAN",
          kredit: d.totalNilai,
          saldoSesudah,
          refTipe: "DISTRIBUSI",
          refId: d.id,
          keterangan: `Pengembalian pembelian pupuk ${d.nomor}: ${alasan}`,
        },
      });
      await tx.nasabah.update({ where: { id: d.nasabahId }, data: { saldo: saldoSesudah } });
    }

    if (d.metodeBayar === "TUNAI" && d.totalNilai > 0) {
      const kasTerakhir = await tx.mutasiKas.findFirst({ orderBy: { createdAt: "desc" } });
      await tx.mutasiKas.create({
        data: {
          arah: "KELUAR",
          kategori: "KOREKSI",
          jumlah: d.totalNilai,
          saldoSesudah: (kasTerakhir?.saldoSesudah ?? 0) - d.totalNilai,
          refTipe: "DISTRIBUSI",
          refId: d.id,
          keterangan: `Pengembalian tunai atas pembatalan ${d.nomor}: ${alasan}`,
        },
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

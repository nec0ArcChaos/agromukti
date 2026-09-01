import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";

export const JENIS_PUPUK = ["KOMPOS_PADAT", "PUPUK_CAIR"] as const;

export const skemaBuatProdukPupuk = z.object({
  kode: z.string().trim().min(1, "Kode wajib diisi."),
  nama: z.string().trim().min(1, "Nama wajib diisi."),
  jenis: z.enum(JENIS_PUPUK).default("KOMPOS_PADAT"),
  deskripsi: z.string().trim().optional(),
  harga: z.coerce.number().int().min(0).default(0),
  satuan: z.string().trim().default("KG"),
});

export const skemaUbahProdukPupuk = skemaBuatProdukPupuk
  .omit({ kode: true })
  .partial()
  .extend({ aktif: z.boolean().optional() });

/** Penyesuaian stok manual - untuk saldo awal, susut, atau koreksi hitung. */
export const skemaPenyesuaianStok = z.object({
  produkPupukId: z.string().min(1),
  arah: z.enum(["MASUK", "KELUAR"]),
  jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0."),
  sumber: z.string().trim().optional(),
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi agar penyesuaian bisa ditelusuri."),
});

export async function daftarProdukPupuk(hanyaAktif = false) {
  return prisma.produkPupuk.findMany({
    where: hanyaAktif ? { aktif: true } : {},
    orderBy: { nama: "asc" },
  });
}

export async function ambilProdukPupuk(id: string) {
  const p = await prisma.produkPupuk.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Produk pupuk");
  return p;
}

export async function buatProdukPupuk(input: z.infer<typeof skemaBuatProdukPupuk>, userId: string) {
  const ada = await prisma.produkPupuk.findUnique({ where: { kode: input.kode } });
  if (ada) {
    throw new AppError("KODE_DIPAKAI", `Kode "${input.kode}" sudah digunakan.`, 409, { kode: "Sudah digunakan" });
  }
  const produk = await prisma.produkPupuk.create({ data: input });
  await catatAudit({ userId, aksi: "CREATE", tabel: "ProdukPupuk", recordId: produk.id, dataBaru: produk });
  return produk;
}

export async function ubahProdukPupuk(
  id: string,
  input: z.infer<typeof skemaUbahProdukPupuk>,
  userId: string,
) {
  const lama = await ambilProdukPupuk(id);
  const produk = await prisma.produkPupuk.update({ where: { id }, data: input });
  await catatAudit({ userId, aksi: "UPDATE", tabel: "ProdukPupuk", recordId: id, dataLama: lama, dataBaru: produk });
  return produk;
}

/**
 * Menulis satu mutasi stok pupuk dan memperbarui cache ProdukPupuk.stok.
 *
 * WAJIB dipanggil di dalam transaksi bersama dokumen sumbernya (produksi,
 * distribusi), supaya stok tidak pernah bergerak tanpa dokumen yang
 * menjelaskannya - dan sebaliknya.
 *
 * Stok tidak boleh negatif: divalidasi di sini, satu tempat, sehingga
 * setiap jalur yang mengurangi stok ikut terlindungi tanpa harus
 * mengingat aturannya masing-masing.
 */
export async function tulisMutasiStok(
  tx: Prisma.TransactionClient,
  arg: {
    produkPupukId: string;
    arah: "MASUK" | "KELUAR" | "PENYESUAIAN";
    jumlah: Prisma.Decimal | number;
    refTipe?: string;
    refId?: string;
    sumber?: string;
    keterangan?: string;
    tanggal?: Date;
  },
) {
  const produk = await tx.produkPupuk.findUnique({ where: { id: arg.produkPupukId } });
  if (!produk) throw new NotFoundError("Produk pupuk");

  const jumlah = new Prisma.Decimal(arg.jumlah);
  const delta = arg.arah === "KELUAR" ? jumlah.neg() : jumlah;
  const stokSesudah = produk.stok.add(delta);

  if (stokSesudah.lessThan(0)) {
    throw new AppError(
      "STOK_PUPUK_TIDAK_CUKUP",
      `Stok ${produk.nama} tersisa ${produk.stok.toString()} ${produk.satuan.toLowerCase()}, ` +
        `diminta ${jumlah.toString()} ${produk.satuan.toLowerCase()}.`,
      409,
    );
  }

  await tx.mutasiStokPupuk.create({
    data: {
      produkPupukId: arg.produkPupukId,
      tanggal: arg.tanggal ?? new Date(),
      arah: arg.arah,
      jumlah,
      refTipe: arg.refTipe,
      refId: arg.refId,
      sumber: arg.sumber,
      keterangan: arg.keterangan,
    },
  });

  await tx.produkPupuk.update({ where: { id: arg.produkPupukId }, data: { stok: stokSesudah } });
  return stokSesudah;
}

export async function penyesuaianStok(
  input: z.infer<typeof skemaPenyesuaianStok>,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const stokSesudah = await tulisMutasiStok(tx, {
      produkPupukId: input.produkPupukId,
      arah: input.arah,
      jumlah: input.jumlah,
      refTipe: "PENYESUAIAN",
      sumber: input.sumber ?? "Penyesuaian manual",
      keterangan: input.keterangan,
    });

    await catatAudit(
      {
        userId,
        aksi: "UPDATE",
        tabel: "ProdukPupuk",
        recordId: input.produkPupukId,
        dataBaru: { arah: input.arah, jumlah: input.jumlah, keterangan: input.keterangan },
      },
      tx,
    );

    return { stokSesudah };
  });
}

export async function daftarMutasiStok(f: { produkPupukId?: string; page: number; perPage: number }) {
  const where: Prisma.MutasiStokPupukWhereInput = f.produkPupukId
    ? { produkPupukId: f.produkPupukId }
    : {};

  const [rows, total] = await Promise.all([
    prisma.mutasiStokPupuk.findMany({
      where,
      include: { produkPupuk: { select: { kode: true, nama: true, satuan: true } } },
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.mutasiStokPupuk.count({ where }),
  ]);

  return { rows, total };
}

/**
 * Menghitung ulang cache stok dari buku besar mutasi.
 * Padanan rekonsiliasi saldo nasabah - kebenaran ada di mutasi, bukan cache.
 */
export async function rekonsiliasiStokPupuk() {
  const produkList = await prisma.produkPupuk.findMany({ select: { id: true, nama: true, stok: true } });
  const hasil: { id: string; nama: string; sebelum: string; sesudah: string }[] = [];

  for (const p of produkList) {
    const mutasi = await prisma.mutasiStokPupuk.findMany({
      where: { produkPupukId: p.id },
      select: { arah: true, jumlah: true },
    });
    const benar = mutasi.reduce(
      (acc, m) => (m.arah === "KELUAR" ? acc.sub(m.jumlah) : acc.add(m.jumlah)),
      new Prisma.Decimal(0),
    );

    if (!benar.equals(p.stok)) {
      await prisma.produkPupuk.update({ where: { id: p.id }, data: { stok: benar } });
      hasil.push({ id: p.id, nama: p.nama, sebelum: p.stok.toString(), sesudah: benar.toString() });
    }
  }

  return { diperiksa: produkList.length, diperbaiki: hasil.length, detail: hasil };
}

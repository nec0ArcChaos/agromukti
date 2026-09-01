import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";

export const skemaBuatProdukUmkm = z.object({
  kode: z.string().trim().min(1, "Kode wajib diisi."),
  nama: z.string().trim().min(1, "Nama wajib diisi."),
  kategori: z.string().trim().optional(),
  deskripsi: z.string().trim().optional(),
  harga: z.coerce.number().int().min(0).default(0),
  stok: z.coerce.number().min(0).default(0),
  satuan: z.string().trim().default("PCS"),
});

export const skemaUbahProdukUmkm = skemaBuatProdukUmkm
  .omit({ kode: true })
  .partial()
  .extend({ status: z.enum(["TERSEDIA", "HABIS", "NONAKTIF"]).optional() });

export async function daftarProdukUmkm(hanyaTersedia = false) {
  return prisma.produkUmkm.findMany({
    where: hanyaTersedia ? { status: "TERSEDIA" } : {},
    orderBy: { nama: "asc" },
  });
}

export async function ambilProdukUmkm(id: string) {
  const p = await prisma.produkUmkm.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Produk UMKM");
  return p;
}

export async function buatProdukUmkm(input: z.infer<typeof skemaBuatProdukUmkm>, userId: string) {
  const ada = await prisma.produkUmkm.findUnique({ where: { kode: input.kode } });
  if (ada) {
    throw new AppError("KODE_DIPAKAI", `Kode "${input.kode}" sudah digunakan.`, 409, { kode: "Sudah digunakan" });
  }

  const produk = await prisma.produkUmkm.create({ data: input });
  await catatAudit({ userId, aksi: "CREATE", tabel: "ProdukUmkm", recordId: produk.id, dataBaru: produk });
  return produk;
}

export async function ubahProdukUmkm(
  id: string,
  input: z.infer<typeof skemaUbahProdukUmkm>,
  userId: string,
) {
  const lama = await ambilProdukUmkm(id);

  // Status mengikuti stok kecuali dinonaktifkan manual - supaya daftar
  // produk publik tidak menawarkan barang yang stoknya habis.
  const stokBaru = input.stok ?? Number(lama.stok);
  const status =
    input.status ?? (lama.status === "NONAKTIF" ? "NONAKTIF" : stokBaru > 0 ? "TERSEDIA" : "HABIS");

  const produk = await prisma.produkUmkm.update({ where: { id }, data: { ...input, status } });
  await catatAudit({ userId, aksi: "UPDATE", tabel: "ProdukUmkm", recordId: id, dataLama: lama, dataBaru: produk });
  return produk;
}

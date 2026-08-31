import { prisma } from "@/server/lib/db";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import type { InputBuatKategori, InputUbahKategori } from "./kategori-sampah.schema";

export async function daftarKategori(hanyaAktif = false) {
  return prisma.kategoriSampah.findMany({ where: hanyaAktif ? { aktif: true } : {}, orderBy: { nama: "asc" } });
}

export async function ambilKategori(id: string) {
  const k = await prisma.kategoriSampah.findUnique({ where: { id } });
  if (!k) throw new NotFoundError("Kategori sampah");
  return k;
}

export async function buatKategori(input: InputBuatKategori, userId: string) {
  const ada = await prisma.kategoriSampah.findUnique({ where: { kode: input.kode } });
  if (ada) throw new AppError("KODE_DIPAKAI", `Kode "${input.kode}" sudah digunakan.`, 409, { kode: "Sudah digunakan" });

  const kategori = await prisma.kategoriSampah.create({ data: input });
  await catatAudit({ userId, aksi: "CREATE", tabel: "KategoriSampah", recordId: kategori.id, dataBaru: kategori });
  return kategori;
}

export async function ubahKategori(id: string, input: InputUbahKategori, userId: string) {
  const lama = await ambilKategori(id);
  const kategori = await prisma.kategoriSampah.update({ where: { id }, data: input });
  await catatAudit({ userId, aksi: "UPDATE", tabel: "KategoriSampah", recordId: id, dataLama: lama, dataBaru: kategori });
  return kategori;
}

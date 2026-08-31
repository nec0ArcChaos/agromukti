import { prisma } from "@/server/lib/db";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import type { InputBuatPengepul, InputUbahPengepul } from "./pengepul.schema";

export async function daftarPengepul(hanyaAktif = false) {
  return prisma.pengepul.findMany({ where: hanyaAktif ? { aktif: true } : {}, orderBy: { nama: "asc" } });
}

export async function ambilPengepul(id: string) {
  const p = await prisma.pengepul.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Pengepul");
  return p;
}

export async function buatPengepul(input: InputBuatPengepul, userId: string) {
  const ada = await prisma.pengepul.findUnique({ where: { kode: input.kode } });
  if (ada) throw new AppError("KODE_DIPAKAI", `Kode "${input.kode}" sudah digunakan.`, 409, { kode: "Sudah digunakan" });

  const pengepul = await prisma.pengepul.create({ data: input });
  await catatAudit({ userId, aksi: "CREATE", tabel: "Pengepul", recordId: pengepul.id, dataBaru: pengepul });
  return pengepul;
}

export async function ubahPengepul(id: string, input: InputUbahPengepul, userId: string) {
  const lama = await ambilPengepul(id);
  const pengepul = await prisma.pengepul.update({ where: { id }, data: input });
  await catatAudit({ userId, aksi: "UPDATE", tabel: "Pengepul", recordId: id, dataLama: lama, dataBaru: pengepul });
  return pengepul;
}

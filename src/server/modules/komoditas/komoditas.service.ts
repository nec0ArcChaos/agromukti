import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";

export const skemaBuatKomoditas = z.object({
  kode: z.string().trim().min(1, "Kode wajib diisi."),
  nama: z.string().trim().min(1, "Nama wajib diisi."),
  deskripsi: z.string().trim().optional(),
  /// Dosis anjuran pupuk per hektare, dipakai menghitung usulan alokasi.
  dosisPupukPerHa: z.coerce.number().min(0, "Dosis tidak boleh negatif.").default(5),
});
export type InputBuatKomoditas = z.infer<typeof skemaBuatKomoditas>;

export const skemaUbahKomoditas = skemaBuatKomoditas
  .omit({ kode: true })
  .partial()
  .extend({ aktif: z.boolean().optional() });

export async function daftarKomoditas(hanyaAktif = false) {
  return prisma.komoditas.findMany({
    where: hanyaAktif ? { aktif: true } : {},
    include: { _count: { select: { lahan: true, panen: true } } },
    orderBy: { nama: "asc" },
  });
}

export async function ambilKomoditas(id: string) {
  const k = await prisma.komoditas.findUnique({ where: { id } });
  if (!k) throw new NotFoundError("Komoditas");
  return k;
}

export async function buatKomoditas(input: InputBuatKomoditas, userId: string) {
  const ada = await prisma.komoditas.findUnique({ where: { kode: input.kode } });
  if (ada) {
    throw new AppError("KODE_DIPAKAI", `Kode "${input.kode}" sudah digunakan.`, 409, {
      kode: "Sudah digunakan",
    });
  }

  const komoditas = await prisma.komoditas.create({ data: input });
  await catatAudit({ userId, aksi: "CREATE", tabel: "Komoditas", recordId: komoditas.id, dataBaru: komoditas });
  return komoditas;
}

export async function ubahKomoditas(
  id: string,
  input: z.infer<typeof skemaUbahKomoditas>,
  userId: string,
) {
  const lama = await ambilKomoditas(id);
  const komoditas = await prisma.komoditas.update({ where: { id }, data: input });
  await catatAudit({
    userId,
    aksi: "UPDATE",
    tabel: "Komoditas",
    recordId: id,
    dataLama: lama,
    dataBaru: komoditas,
  });
  return komoditas;
}

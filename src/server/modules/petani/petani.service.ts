import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { ConflictError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import { keHektare } from "@/server/lib/satuan";
import type { InputBuatPetani, InputUbahPetani, skemaFilterPetani } from "./petani.schema";
import type { z } from "zod";

type FilterPetani = z.infer<typeof skemaFilterPetani>;

const SERTAKAN = {
  warga: { select: { id: true, nama: true, noHp: true, alamat: true, dusun: true, rt: true, rw: true } },
} satisfies Prisma.PetaniInclude;

export async function daftarPetani(f: FilterPetani) {
  const where: Prisma.PetaniWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(f.kelompokTani ? { kelompokTani: f.kelompokTani } : {}),
    ...(f.dusun ? { warga: { dusun: f.dusun } } : {}),
    ...(f.q
      ? {
          OR: [
            { kode: { contains: f.q } },
            { kelompokTani: { contains: f.q } },
            { warga: { nama: { contains: f.q } } },
            { warga: { noHp: { contains: f.q } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.petani.findMany({
      where,
      include: { ...SERTAKAN, _count: { select: { lahan: true, panen: true } } },
      orderBy: { warga: { nama: "asc" } },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.petani.count({ where }),
  ]);

  return { rows, total };
}

export async function ambilPetani(id: string) {
  const petani = await prisma.petani.findUnique({
    where: { id },
    include: {
      ...SERTAKAN,
      lahan: { include: { komoditas: { select: { id: true, nama: true, dosisPupukPerHa: true } } } },
    },
  });
  if (!petani) throw new NotFoundError("Petani");

  // Total luas garapan dinormalkan ke hektare, karena tiap lahan boleh
  // memakai satuan berbeda (m² atau ha).
  const totalHektare = petani.lahan
    .filter((l) => l.status === "AKTIF")
    .reduce((acc, l) => acc.add(keHektare(l.luas, l.satuan)), new Prisma.Decimal(0));

  return { ...petani, totalHektare };
}

export async function daftarKelompokTani() {
  const rows = await prisma.petani.findMany({
    where: { kelompokTani: { not: null } },
    distinct: ["kelompokTani"],
    select: { kelompokTani: true },
    orderBy: { kelompokTani: "asc" },
  });
  return rows.map((r) => r.kelompokTani).filter(Boolean) as string[];
}

export async function buatPetani(input: InputBuatPetani, userId: string) {
  if (input.wargaId) {
    const warga = await prisma.warga.findUnique({
      where: { id: input.wargaId },
      include: { petani: { select: { id: true, kode: true } } },
    });
    if (!warga) throw new NotFoundError("Warga");

    // Satu warga tidak perlu dua kartu petani - kalau sudah ada, itu
    // hampir pasti kekeliruan input, bukan kehendak operator.
    if (warga.petani.length > 0) {
      throw new ConflictError(
        "SUDAH_JADI_PETANI",
        `${warga.nama} sudah terdaftar sebagai petani dengan kode ${warga.petani[0].kode}.`,
      );
    }
  }

  const petani = await prisma.$transaction(async (tx) => {
    const kode = await ambilNomor(tx, "PETANI");

    const wargaId =
      input.wargaId ??
      (await tx.warga.create({ data: { ...input.warga!, nik: input.warga!.nik || null } })).id;

    return tx.petani.create({
      data: { kode, wargaId, kelompokTani: input.kelompokTani },
      include: SERTAKAN,
    });
  });

  await catatAudit({ userId, aksi: "CREATE", tabel: "Petani", recordId: petani.id, dataBaru: petani });
  return petani;
}

export async function ubahPetani(id: string, input: InputUbahPetani, userId: string) {
  const lama = await prisma.petani.findUnique({ where: { id }, include: SERTAKAN });
  if (!lama) throw new NotFoundError("Petani");

  const petani = await prisma.$transaction(async (tx) => {
    if (input.warga && Object.keys(input.warga).length > 0) {
      await tx.warga.update({ where: { id: lama.wargaId }, data: input.warga });
    }
    return tx.petani.update({
      where: { id },
      data: { kelompokTani: input.kelompokTani, status: input.status },
      include: SERTAKAN,
    });
  });

  await catatAudit({ userId, aksi: "UPDATE", tabel: "Petani", recordId: id, dataLama: lama, dataBaru: petani });
  return petani;
}

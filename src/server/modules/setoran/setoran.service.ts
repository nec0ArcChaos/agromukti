import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { AppError, ConflictError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import type { InputBuatSetoran, skemaFilterSetoran } from "./setoran.schema";
import type { z } from "zod";

type FilterSetoran = z.infer<typeof skemaFilterSetoran>;

const SERTAKAN = {
  nasabah: { select: { id: true, kode: true, nama: true, dusun: true } },
  operator: { select: { id: true, nama: true } },
  kategoriSampah: { select: { id: true, kode: true, nama: true } },
  pengambilan: { select: { id: true, nomor: true, tanggal: true, pengepul: { select: { nama: true } } } },
} satisfies Prisma.SetoranInclude;

export async function daftarSetoran(f: FilterSetoran) {
  const where: Prisma.SetoranWhereInput = {
    ...(f.nasabahId ? { nasabahId: f.nasabahId } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.dari || f.sampai
      ? { tanggal: { ...(f.dari ? { gte: f.dari } : {}), ...(f.sampai ? { lte: f.sampai } : {}) } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.setoran.findMany({
      where,
      include: SERTAKAN,
      orderBy: { tanggal: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.setoran.count({ where }),
  ]);

  return { rows, total };
}

export async function ambilSetoran(id: string) {
  const setoran = await prisma.setoran.findUnique({ where: { id }, include: SERTAKAN });
  if (!setoran) throw new NotFoundError("Setoran");
  return setoran;
}

/**
 * Mencatat setoran sampah anorganik. HANYA mencatat berat - TIDAK ada
 * nilai rupiah di sini, karena bank sampah ini tidak menetapkan harga
 * sendiri. Nilai baru muncul saat pengepul membeli lewat
 * pengambilan-pengepul, yang membagi pembayarannya proporsional ke setiap
 * setoran MENUNGGU yang diikutsertakan.
 */
export async function buatSetoran(input: InputBuatSetoran, operatorId: string) {
  const nasabah = await prisma.nasabah.findUnique({ where: { id: input.nasabahId } });
  if (!nasabah) throw new NotFoundError("Nasabah");
  if (nasabah.status !== "AKTIF") {
    throw new AppError("NASABAH_NONAKTIF", `${nasabah.nama} berstatus nonaktif dan tidak dapat menyetor.`, 409);
  }

  if (input.kategoriSampahId) {
    const kategori = await prisma.kategoriSampah.findUnique({ where: { id: input.kategoriSampahId } });
    if (!kategori) throw new NotFoundError("Kategori sampah");
    if (!kategori.aktif) throw new AppError("KATEGORI_NONAKTIF", `${kategori.nama} sedang tidak diterima.`, 409);
  }

  const tanggal = input.tanggal ?? new Date();

  const setoran = await prisma.$transaction(async (tx) => {
    const nomor = await ambilNomor(tx, "SETORAN", tanggal);
    const dibuat = await tx.setoran.create({
      data: {
        nomor,
        nasabahId: nasabah.id,
        kategoriSampahId: input.kategoriSampahId,
        tanggal,
        beratKg: input.beratKg,
        catatan: input.catatan,
        operatorId,
      },
      include: SERTAKAN,
    });

    await catatAudit(
      { userId: operatorId, aksi: "CREATE", tabel: "Setoran", recordId: dibuat.id, dataBaru: { nomor, beratKg: input.beratKg } },
      tx,
    );

    return dibuat;
  });

  return setoran;
}

/**
 * Membatalkan setoran. HANYA diizinkan selagi status MENUNGGU - belum ada
 * uang atau kredit tabungan yang tersentuh, jadi pembatalan tidak perlu
 * mutasi pembalik apa pun. Setoran yang sudah DIPROSES (sudah dibeli
 * pengepul dan nasabah sudah dikredit) hanya bisa dikoreksi lewat
 * pembatalan SELURUH PengambilanPengepul terkait - lihat
 * pengambilan.service.ts batalPengambilan().
 */
export async function batalSetoran(id: string, alasan: string, userId: string) {
  const setoran = await prisma.setoran.findUnique({ where: { id } });
  if (!setoran) throw new NotFoundError("Setoran");

  if (setoran.status === "VOID") {
    throw new ConflictError("SUDAH_DIBATALKAN", "Setoran ini sudah dibatalkan sebelumnya.");
  }
  if (setoran.status === "DIPROSES") {
    throw new AppError(
      "SUDAH_DIPROSES",
      `Setoran ${setoran.nomor} sudah dibeli pengepul dan nasabah sudah dikredit. ` +
        `Untuk mengoreksi, batalkan seluruh pengambilan pengepul terkait, bukan setoran ini sendiri.`,
      409,
    );
  }

  const hasil = await prisma.setoran.update({
    where: { id },
    data: { status: "VOID", alasanBatal: alasan },
    include: SERTAKAN,
  });

  await catatAudit({ userId, aksi: "VOID", tabel: "Setoran", recordId: id, dataLama: { status: "MENUNGGU" }, dataBaru: { status: "VOID", alasan } });
  return hasil;
}

/** Setoran MENUNGGU yang siap diikutsertakan saat pengepul datang. */
export async function daftarSetoranMenunggu() {
  return prisma.setoran.findMany({
    where: { status: "MENUNGGU" },
    include: SERTAKAN,
    orderBy: { tanggal: "asc" },
  });
}

import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import type { InputBuatNasabah, InputUbahNasabah, skemaFilterNasabah } from "./nasabah.schema";
import type { z } from "zod";

type FilterNasabah = z.infer<typeof skemaFilterNasabah>;

const SERTAKAN = {
  warga: { select: { id: true, nama: true, nik: true, noHp: true, alamat: true, dusun: true, rt: true, rw: true } },
} satisfies Prisma.NasabahInclude;

export async function daftarNasabah(f: FilterNasabah) {
  const where: Prisma.NasabahWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(f.dusun ? { warga: { dusun: f.dusun } } : {}),
    ...(f.q
      ? {
          OR: [
            { kode: { contains: f.q } },
            { warga: { nama: { contains: f.q } } },
            { warga: { noHp: { contains: f.q } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.nasabah.findMany({
      where,
      include: SERTAKAN,
      orderBy: { warga: { nama: "asc" } },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.nasabah.count({ where }),
  ]);

  return { rows, total };
}

export async function ambilNasabah(id: string) {
  const nasabah = await prisma.nasabah.findUnique({ where: { id }, include: SERTAKAN });
  if (!nasabah) throw new NotFoundError("Nasabah");
  return nasabah;
}

export async function daftarDusun() {
  const rows = await prisma.warga.findMany({
    where: { dusun: { not: null } },
    distinct: ["dusun"],
    select: { dusun: true },
    orderBy: { dusun: "asc" },
  });
  return rows.map((r) => r.dusun).filter(Boolean) as string[];
}

/**
 * Mendaftarkan nasabah. Bila `wargaId` diberikan, identitas yang sudah ada
 * dipakai ulang (orang itu mungkin sudah terdaftar sebagai petani);
 * bila tidak, baris Warga baru dibuat dalam transaksi yang sama.
 */
export async function buatNasabah(input: InputBuatNasabah, userId: string) {
  if (input.wargaId) {
    const warga = await prisma.warga.findUnique({ where: { id: input.wargaId } });
    if (!warga) throw new NotFoundError("Warga");
  }

  const nasabah = await prisma.$transaction(async (tx) => {
    const kode = await ambilNomor(tx, "NASABAH");

    const wargaId =
      input.wargaId ??
      (await tx.warga.create({ data: { ...input.warga!, nik: input.warga!.nik || null } })).id;

    return tx.nasabah.create({
      data: { kode, wargaId, catatan: input.catatan },
      include: SERTAKAN,
    });
  });

  await catatAudit({
    userId,
    aksi: "CREATE",
    tabel: "Nasabah",
    recordId: nasabah.id,
    dataBaru: nasabah,
  });

  return nasabah;
}

export async function ubahNasabah(id: string, input: InputUbahNasabah, userId: string) {
  const lama = await ambilNasabah(id);

  const nasabah = await prisma.$transaction(async (tx) => {
    if (input.warga && Object.keys(input.warga).length > 0) {
      await tx.warga.update({ where: { id: lama.wargaId }, data: input.warga });
    }
    return tx.nasabah.update({
      where: { id },
      data: { status: input.status, catatan: input.catatan },
      include: SERTAKAN,
    });
  });

  await catatAudit({
    userId,
    aksi: "UPDATE",
    tabel: "Nasabah",
    recordId: id,
    dataLama: lama,
    dataBaru: nasabah,
  });

  return nasabah;
}

export async function mutasiNasabah(id: string, page: number, perPage: number) {
  await ambilNasabah(id);

  const [rows, total] = await Promise.all([
    prisma.mutasiTabungan.findMany({
      where: { nasabahId: id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.mutasiTabungan.count({ where: { nasabahId: id } }),
  ]);

  return { rows, total };
}

/**
 * Menghitung ulang saldo seluruh nasabah dari MutasiTabungan.
 *
 * Nasabah.saldo hanyalah cache; kebenaran ada di buku besar. Jalankan ini
 * bila dicurigai ada selisih (mis. setelah pemulihan cadangan data), atau
 * secara berkala sebagai pemeriksaan kewarasan sistem.
 */
export async function rekonsiliasiSaldo() {
  const nasabahList = await prisma.nasabah.findMany({ select: { id: true, saldo: true } });
  const hasil: { id: string; sebelum: number; sesudah: number; selisih: number }[] = [];

  for (const n of nasabahList) {
    const agg = await prisma.mutasiTabungan.aggregate({
      where: { nasabahId: n.id },
      _sum: { kredit: true, debit: true },
    });
    const saldoBenar = (agg._sum.kredit ?? 0) - (agg._sum.debit ?? 0);

    if (saldoBenar !== n.saldo) {
      await prisma.nasabah.update({ where: { id: n.id }, data: { saldo: saldoBenar } });
      hasil.push({ id: n.id, sebelum: n.saldo, sesudah: saldoBenar, selisih: saldoBenar - n.saldo });
    }
  }

  return { diperiksa: nasabahList.length, diperbaiki: hasil.length, detail: hasil };
}

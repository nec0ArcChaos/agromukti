import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { AppError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import type { InputEntriKas, skemaFilterKas } from "./kas.schema";
import type { z } from "zod";

type FilterKas = z.infer<typeof skemaFilterKas>;

export async function daftarKas(f: FilterKas) {
  const where: Prisma.MutasiKasWhereInput = {
    ...(f.kategori ? { kategori: f.kategori } : {}),
    ...(f.dari || f.sampai
      ? { tanggal: { ...(f.dari ? { gte: f.dari } : {}), ...(f.sampai ? { lte: f.sampai } : {}) } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.mutasiKas.findMany({ where, orderBy: { createdAt: "desc" }, skip: (f.page - 1) * f.perPage, take: f.perPage }),
    prisma.mutasiKas.count({ where }),
  ]);
  return { rows, total };
}

export async function saldoKasSaatIni() {
  const terakhir = await prisma.mutasiKas.findFirst({ orderBy: { createdAt: "desc" } });
  return terakhir?.saldoSesudah ?? 0;
}

/**
 * Entri kas manual: modal awal, biaya operasional, hibah. Kategori
 * PENJUALAN dan PENARIKAN_NASABAH TIDAK boleh masuk lewat sini - keduanya
 * hanya ditulis otomatis oleh service penjualan dan penarikan supaya kas
 * selalu berpadanan dengan dokumen sumbernya.
 */
export async function catatEntriKas(input: InputEntriKas, userId: string) {
  const tanggal = input.tanggal ?? new Date();
  const arahNilai = input.arah === "MASUK" ? input.jumlah : -input.jumlah;

  const hasil = await prisma.$transaction(async (tx) => {
    const terakhir = await tx.mutasiKas.findFirst({ orderBy: { createdAt: "desc" } });
    const saldoBaru = (terakhir?.saldoSesudah ?? 0) + arahNilai;

    if (saldoBaru < 0) {
      throw new AppError(
        "KAS_TIDAK_CUKUP",
        `Kas saat ini tidak mencukupi untuk pengeluaran ini. Saldo kas akan menjadi negatif.`,
        409,
      );
    }

    const entri = await tx.mutasiKas.create({
      data: {
        tanggal,
        arah: input.arah,
        kategori: input.kategori,
        jumlah: input.jumlah,
        saldoSesudah: saldoBaru,
        keterangan: input.keterangan,
      },
    });

    await catatAudit({ userId, aksi: "CREATE", tabel: "MutasiKas", recordId: entri.id, dataBaru: entri }, tx);
    return entri;
  });

  return hasil;
}

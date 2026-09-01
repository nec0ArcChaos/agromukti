import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";

/**
 * Buku besar stok bahan baku sampah organik.
 *
 * Sistem lama memakai SATU BARIS penghitung (`jumlahsampahorganik`) yang
 * di-UPDATE langsung setiap ada perubahan. Akibatnya riwayatnya hilang:
 * kalau angkanya janggal, tidak ada cara menelusuri dari mana asalnya.
 * Di sini diganti buku besar mutasi - pola yang sama dengan tabungan
 * nasabah dan stok pupuk.
 */

export const skemaSetoranOrganik = z.object({
  wargaId: z.string().min(1).optional(),
  beratKg: z.coerce.number().positive("Berat harus lebih dari 0."),
  sumber: z.string().trim().optional(),
  keterangan: z.string().trim().optional(),
  tanggal: z.coerce.date().optional(),
});

export const skemaKoreksiOrganik = z.object({
  arah: z.enum(["MASUK", "KELUAR"]),
  beratKg: z.coerce.number().positive("Berat harus lebih dari 0."),
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi agar koreksi bisa ditelusuri."),
});

export const skemaFilterOrganik = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  arah: z.enum(["MASUK", "KELUAR", "KOREKSI"]).optional(),
});

/** Posisi stok bahan baku, dihitung dari buku besar - tidak ada cache. */
export async function stokOrganik(): Promise<Prisma.Decimal> {
  const agg = await prisma.mutasiSampahOrganik.groupBy({
    by: ["arah"],
    _sum: { beratKg: true },
  });

  return agg.reduce((acc, a) => {
    const jumlah = a._sum.beratKg ?? new Prisma.Decimal(0);
    return a.arah === "KELUAR" ? acc.sub(jumlah) : acc.add(jumlah);
  }, new Prisma.Decimal(0));
}

/**
 * Menulis mutasi bahan baku organik, dengan penjagaan stok tak boleh
 * negatif di satu tempat - sama seperti stok pupuk.
 */
export async function tulisMutasiOrganik(
  tx: Prisma.TransactionClient,
  arg: {
    arah: "MASUK" | "KELUAR" | "KOREKSI";
    beratKg: Prisma.Decimal | number;
    wargaId?: string | null;
    refTipe?: string;
    refId?: string;
    sumber?: string;
    keterangan?: string;
    operatorId?: string;
    tanggal?: Date;
  },
) {
  const berat = new Prisma.Decimal(arg.beratKg);

  if (arg.arah === "KELUAR") {
    const agg = await tx.mutasiSampahOrganik.groupBy({ by: ["arah"], _sum: { beratKg: true } });
    const stok = agg.reduce((acc, a) => {
      const j = a._sum.beratKg ?? new Prisma.Decimal(0);
      return a.arah === "KELUAR" ? acc.sub(j) : acc.add(j);
    }, new Prisma.Decimal(0));

    if (berat.greaterThan(stok)) {
      throw new AppError(
        "STOK_ORGANIK_TIDAK_CUKUP",
        `Stok sampah organik tersisa ${stok.toString()} kg, diminta ${berat.toString()} kg.`,
        409,
      );
    }
  }

  return tx.mutasiSampahOrganik.create({
    data: {
      tanggal: arg.tanggal ?? new Date(),
      arah: arg.arah,
      beratKg: berat,
      wargaId: arg.wargaId ?? null,
      refTipe: arg.refTipe,
      refId: arg.refId,
      sumber: arg.sumber,
      keterangan: arg.keterangan,
      operatorId: arg.operatorId,
    },
  });
}

export async function daftarMutasiOrganik(f: z.infer<typeof skemaFilterOrganik>) {
  const where: Prisma.MutasiSampahOrganikWhereInput = f.arah ? { arah: f.arah } : {};

  const [rows, total] = await Promise.all([
    prisma.mutasiSampahOrganik.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.mutasiSampahOrganik.count({ where }),
  ]);

  // wargaId sengaja bukan relasi Prisma (mutasi boleh tanpa warga tertentu),
  // jadi namanya diambil terpisah lalu ditempelkan.
  const idWarga = [...new Set(rows.map((r) => r.wargaId).filter(Boolean))] as string[];
  const wargaList = idWarga.length
    ? await prisma.warga.findMany({ where: { id: { in: idWarga } }, select: { id: true, nama: true } })
    : [];
  const petaWarga = new Map(wargaList.map((w) => [w.id, w.nama]));

  return {
    rows: rows.map((r) => ({ ...r, namaWarga: r.wargaId ? (petaWarga.get(r.wargaId) ?? null) : null })),
    total,
  };
}

export async function catatSetoranOrganik(
  input: z.infer<typeof skemaSetoranOrganik>,
  operatorId: string,
) {
  if (input.wargaId) {
    const warga = await prisma.warga.findUnique({ where: { id: input.wargaId } });
    if (!warga) throw new NotFoundError("Warga");
  }

  const mutasi = await prisma.$transaction((tx) =>
    tulisMutasiOrganik(tx, {
      arah: "MASUK",
      beratKg: input.beratKg,
      wargaId: input.wargaId,
      refTipe: "SETORAN",
      sumber: input.sumber ?? "Setoran warga",
      keterangan: input.keterangan,
      operatorId,
      tanggal: input.tanggal,
    }),
  );

  await catatAudit({
    userId: operatorId,
    aksi: "CREATE",
    tabel: "MutasiSampahOrganik",
    recordId: mutasi.id,
    dataBaru: { beratKg: input.beratKg, sumber: input.sumber },
  });
  return mutasi;
}

export async function koreksiOrganik(input: z.infer<typeof skemaKoreksiOrganik>, operatorId: string) {
  const mutasi = await prisma.$transaction((tx) =>
    tulisMutasiOrganik(tx, {
      arah: input.arah,
      beratKg: input.beratKg,
      refTipe: "KOREKSI",
      sumber: "Koreksi manual",
      keterangan: input.keterangan,
      operatorId,
    }),
  );

  await catatAudit({
    userId: operatorId,
    aksi: "UPDATE",
    tabel: "MutasiSampahOrganik",
    recordId: mutasi.id,
    dataBaru: input,
  });
  return mutasi;
}

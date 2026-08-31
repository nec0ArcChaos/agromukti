import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { keKilogram, SATUAN_BERAT } from "@/server/lib/satuan";

export const skemaBuatPanen = z.object({
  petaniId: z.string().min(1, "Pilih petani terlebih dahulu."),
  komoditasId: z.string().min(1, "Pilih komoditas terlebih dahulu."),
  jumlahPanen: z.coerce.number().positive("Jumlah panen harus lebih dari 0."),
  satuan: z.enum(SATUAN_BERAT).default("KG"),
  tanggalPanen: z.coerce.date(),
  keterangan: z.string().trim().optional(),
});
export type InputBuatPanen = z.infer<typeof skemaBuatPanen>;

export const skemaUbahPanen = skemaBuatPanen.partial();

export const skemaFilterPanen = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  petaniId: z.string().optional(),
  komoditasId: z.string().optional(),
  dari: z.coerce.date().optional(),
  sampai: z.coerce.date().optional(),
});

const SERTAKAN = {
  petani: { select: { id: true, kode: true, kelompokTani: true, warga: { select: { nama: true, dusun: true } } } },
  komoditas: { select: { id: true, nama: true } },
} satisfies Prisma.PanenInclude;

/**
 * Panen tidak boleh bertanggal masa depan. Panen dicatat setelah terjadi,
 * jadi tanggal di depan hampir pasti salah ketik tahun atau bulan - dan
 * kalau lolos, ia akan mengacaukan rekap periode berjalan.
 */
function pastikanTanggalWajar(tanggal: Date) {
  const besok = new Date();
  besok.setHours(23, 59, 59, 999);
  if (tanggal > besok) {
    throw new AppError(
      "TANGGAL_MASA_DEPAN",
      "Tanggal panen tidak boleh melewati hari ini. Periksa kembali tanggalnya.",
      400,
      { tanggalPanen: "Tidak boleh di masa depan" },
    );
  }
}

export async function daftarPanen(f: z.infer<typeof skemaFilterPanen>) {
  const where: Prisma.PanenWhereInput = {
    ...(f.petaniId ? { petaniId: f.petaniId } : {}),
    ...(f.komoditasId ? { komoditasId: f.komoditasId } : {}),
    ...(f.dari || f.sampai
      ? { tanggalPanen: { ...(f.dari ? { gte: f.dari } : {}), ...(f.sampai ? { lte: f.sampai } : {}) } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.panen.findMany({
      where,
      include: SERTAKAN,
      orderBy: { tanggalPanen: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.panen.count({ where }),
  ]);

  const rowsPlus = rows.map((p) => ({ ...p, jumlahKg: keKilogram(p.jumlahPanen, p.satuan) }));
  return { rows: rowsPlus, total };
}

export async function ambilPanen(id: string) {
  const panen = await prisma.panen.findUnique({ where: { id }, include: SERTAKAN });
  if (!panen) throw new NotFoundError("Panen");
  return panen;
}

export async function buatPanen(input: InputBuatPanen, userId: string) {
  pastikanTanggalWajar(input.tanggalPanen);

  const [petani, komoditas] = await Promise.all([
    prisma.petani.findUnique({ where: { id: input.petaniId } }),
    prisma.komoditas.findUnique({ where: { id: input.komoditasId } }),
  ]);
  if (!petani) throw new NotFoundError("Petani");
  if (!komoditas) throw new NotFoundError("Komoditas");

  const panen = await prisma.panen.create({ data: input, include: SERTAKAN });
  await catatAudit({ userId, aksi: "CREATE", tabel: "Panen", recordId: panen.id, dataBaru: panen });
  return panen;
}

export async function ubahPanen(id: string, input: z.infer<typeof skemaUbahPanen>, userId: string) {
  if (input.tanggalPanen) pastikanTanggalWajar(input.tanggalPanen);

  const lama = await ambilPanen(id);
  const panen = await prisma.panen.update({ where: { id }, data: input, include: SERTAKAN });
  await catatAudit({ userId, aksi: "UPDATE", tabel: "Panen", recordId: id, dataLama: lama, dataBaru: panen });
  return panen;
}

/**
 * Rekap panen per komoditas atau per dusun, seluruhnya dinormalkan ke
 * kilogram - baris panen boleh dicatat dalam kg, kuintal, maupun ton.
 */
export async function rekapPanen(f: {
  dari?: Date;
  sampai?: Date;
  groupBy: "komoditas" | "dusun" | "petani";
}) {
  const rows = await prisma.panen.findMany({
    where:
      f.dari || f.sampai
        ? { tanggalPanen: { ...(f.dari ? { gte: f.dari } : {}), ...(f.sampai ? { lte: f.sampai } : {}) } }
        : {},
    include: SERTAKAN,
  });

  const kunciDari = (p: (typeof rows)[number]) => {
    if (f.groupBy === "komoditas") return { key: p.komoditasId, label: p.komoditas.nama };
    if (f.groupBy === "dusun") {
      return { key: p.petani.warga.dusun ?? "-", label: p.petani.warga.dusun ?? "Tanpa dusun" };
    }
    return { key: p.petaniId, label: p.petani.warga.nama };
  };

  const peta = new Map<string, { label: string; jumlahKg: Prisma.Decimal; jumlahCatatan: number }>();
  for (const p of rows) {
    const { key, label } = kunciDari(p);
    const ada = peta.get(key) ?? { label, jumlahKg: new Prisma.Decimal(0), jumlahCatatan: 0 };
    ada.jumlahKg = ada.jumlahKg.add(keKilogram(p.jumlahPanen, p.satuan));
    ada.jumlahCatatan += 1;
    peta.set(key, ada);
  }

  const hasil = [...peta.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.jumlahKg.comparedTo(a.jumlahKg));

  return {
    rows: hasil,
    totalKg: hasil.reduce((acc, r) => acc.add(r.jumlahKg), new Prisma.Decimal(0)),
  };
}

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { keHektare, SATUAN_LUAS } from "@/server/lib/satuan";

export const skemaBuatLahan = z.object({
  petaniId: z.string().min(1, "Pilih petani terlebih dahulu."),
  komoditasId: z.string().min(1, "Pilih komoditas terlebih dahulu."),
  luas: z.coerce.number().positive("Luas harus lebih dari 0."),
  satuan: z.enum(SATUAN_LUAS).default("M2"),
  lokasi: z.string().trim().optional(),
});
export type InputBuatLahan = z.infer<typeof skemaBuatLahan>;

export const skemaUbahLahan = skemaBuatLahan
  .omit({ petaniId: true })
  .partial()
  .extend({ status: z.enum(["AKTIF", "NONAKTIF"]).optional() });

export const skemaFilterLahan = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  petaniId: z.string().optional(),
  komoditasId: z.string().optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
});

const SERTAKAN = {
  petani: { select: { id: true, kode: true, kelompokTani: true, warga: { select: { nama: true, dusun: true } } } },
  komoditas: { select: { id: true, nama: true, dosisPupukPerHa: true } },
} satisfies Prisma.LahanInclude;

export async function daftarLahan(f: z.infer<typeof skemaFilterLahan>) {
  const where: Prisma.LahanWhereInput = {
    ...(f.petaniId ? { petaniId: f.petaniId } : {}),
    ...(f.komoditasId ? { komoditasId: f.komoditasId } : {}),
    ...(f.status ? { status: f.status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.lahan.findMany({
      where,
      include: SERTAKAN,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.lahan.count({ where }),
  ]);

  // Luas dinormalkan ke hektare supaya bisa dijumlahkan - tiap baris boleh
  // memakai satuan berbeda.
  const rowsPlus = rows.map((l) => ({
    ...l,
    luasHektare: keHektare(l.luas, l.satuan),
    /// Usulan kebutuhan pupuk = luas (ha) x dosis anjuran komoditas.
    usulanPupukKg: keHektare(l.luas, l.satuan).mul(l.komoditas.dosisPupukPerHa),
  }));

  return { rows: rowsPlus, total };
}

export async function ambilLahan(id: string) {
  const lahan = await prisma.lahan.findUnique({ where: { id }, include: SERTAKAN });
  if (!lahan) throw new NotFoundError("Lahan");
  return lahan;
}

export async function buatLahan(input: InputBuatLahan, userId: string) {
  const [petani, komoditas] = await Promise.all([
    prisma.petani.findUnique({ where: { id: input.petaniId } }),
    prisma.komoditas.findUnique({ where: { id: input.komoditasId } }),
  ]);
  if (!petani) throw new NotFoundError("Petani");
  if (!komoditas) throw new NotFoundError("Komoditas");

  const lahan = await prisma.lahan.create({ data: input, include: SERTAKAN });
  await catatAudit({ userId, aksi: "CREATE", tabel: "Lahan", recordId: lahan.id, dataBaru: lahan });
  return lahan;
}

export async function ubahLahan(id: string, input: z.infer<typeof skemaUbahLahan>, userId: string) {
  const lama = await ambilLahan(id);
  const lahan = await prisma.lahan.update({ where: { id }, data: input, include: SERTAKAN });
  await catatAudit({ userId, aksi: "UPDATE", tabel: "Lahan", recordId: id, dataLama: lama, dataBaru: lahan });
  return lahan;
}

/** Rekap luas garapan per komoditas, dalam hektare. */
export async function rekapLuasPerKomoditas() {
  const lahan = await prisma.lahan.findMany({
    where: { status: "AKTIF" },
    include: { komoditas: { select: { id: true, nama: true, dosisPupukPerHa: true } } },
  });

  const peta = new Map<string, { nama: string; hektare: Prisma.Decimal; jumlahLahan: number; usulanPupukKg: Prisma.Decimal }>();
  for (const l of lahan) {
    const ha = keHektare(l.luas, l.satuan);
    const ada = peta.get(l.komoditasId) ?? {
      nama: l.komoditas.nama,
      hektare: new Prisma.Decimal(0),
      jumlahLahan: 0,
      usulanPupukKg: new Prisma.Decimal(0),
    };
    ada.hektare = ada.hektare.add(ha);
    ada.usulanPupukKg = ada.usulanPupukKg.add(ha.mul(l.komoditas.dosisPupukPerHa));
    ada.jumlahLahan += 1;
    peta.set(l.komoditasId, ada);
  }

  return [...peta.entries()]
    .map(([komoditasId, v]) => ({ komoditasId, ...v }))
    .sort((a, b) => b.hektare.comparedTo(a.hektare));
}

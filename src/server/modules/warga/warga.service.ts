import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { z } from "zod";

export const skemaBuatWarga = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi."),
  nik: z.string().trim().length(16, "NIK harus 16 digit.").optional(),
  noHp: z.string().trim().optional(),
  alamat: z.string().trim().optional(),
  dusun: z.string().trim().optional(),
  rt: z.string().trim().optional(),
  rw: z.string().trim().optional(),
});
export type InputBuatWarga = z.infer<typeof skemaBuatWarga>;

export const skemaUbahWarga = skemaBuatWarga.partial().extend({
  aktif: z.boolean().optional(),
});

export const skemaFilterWarga = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  dusun: z.string().trim().optional(),
});

/**
 * Daftar warga beserta peran yang melekat padanya di tiap pilar.
 * `nik` sengaja TIDAK disertakan di daftar - hanya muncul di detail, dan
 * tidak pernah di endpoint publik.
 */
export async function daftarWarga(f: z.infer<typeof skemaFilterWarga>) {
  const where: Prisma.WargaWhereInput = {
    ...(f.dusun ? { dusun: f.dusun } : {}),
    ...(f.q
      ? { OR: [{ nama: { contains: f.q } }, { noHp: { contains: f.q } }] }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.warga.findMany({
      where,
      select: {
        id: true,
        nama: true,
        noHp: true,
        dusun: true,
        rt: true,
        rw: true,
        aktif: true,
        nasabah: { select: { id: true, kode: true, saldo: true, status: true } },
        petani: { select: { id: true, kode: true, kelompokTani: true, status: true } },
      },
      orderBy: { nama: "asc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.warga.count({ where }),
  ]);

  return { rows, total };
}

export async function ambilWarga(id: string) {
  const warga = await prisma.warga.findUnique({
    where: { id },
    include: {
      nasabah: { select: { id: true, kode: true, saldo: true, status: true } },
      petani: { select: { id: true, kode: true, kelompokTani: true, status: true } },
    },
  });
  if (!warga) throw new NotFoundError("Warga");
  return warga;
}

export async function buatWarga(input: InputBuatWarga, userId: string) {
  if (input.nik) {
    const ada = await prisma.warga.findUnique({ where: { nik: input.nik } });
    if (ada) {
      throw new AppError("NIK_DIPAKAI", `NIK tersebut sudah terdaftar atas nama ${ada.nama}.`, 409, {
        nik: "Sudah terdaftar",
      });
    }
  }

  const warga = await prisma.warga.create({ data: { ...input, nik: input.nik || null } });
  await catatAudit({ userId, aksi: "CREATE", tabel: "Warga", recordId: warga.id, dataBaru: warga });
  return warga;
}

export async function ubahWarga(id: string, input: z.infer<typeof skemaUbahWarga>, userId: string) {
  const lama = await ambilWarga(id);

  if (input.nik && input.nik !== lama.nik) {
    const ada = await prisma.warga.findUnique({ where: { nik: input.nik } });
    if (ada && ada.id !== id) {
      throw new AppError("NIK_DIPAKAI", `NIK tersebut sudah terdaftar atas nama ${ada.nama}.`, 409, {
        nik: "Sudah terdaftar",
      });
    }
  }

  const warga = await prisma.warga.update({ where: { id }, data: input });
  await catatAudit({ userId, aksi: "UPDATE", tabel: "Warga", recordId: id, dataLama: lama, dataBaru: warga });
  return warga;
}

/**
 * Mencari kemungkinan data warga ganda berdasarkan kemiripan nama + dusun.
 *
 * Master data warga hanya bermanfaat bila benar-benar tunggal. Operator
 * yang mendaftarkan orang yang sama dua kali (mis. sekali lewat bank
 * sampah, sekali lewat pertanian) tetap menghasilkan dua baris, dan
 * pemeriksaan ini yang memunculkannya supaya bisa dirapikan.
 */
export async function cariWargaGanda() {
  const semua = await prisma.warga.findMany({
    select: { id: true, nama: true, dusun: true, noHp: true },
    orderBy: { nama: "asc" },
  });

  const peta = new Map<string, typeof semua>();
  for (const w of semua) {
    const kunci = `${w.nama.trim().toLowerCase()}|${(w.dusun ?? "").trim().toLowerCase()}`;
    peta.set(kunci, [...(peta.get(kunci) ?? []), w]);
  }

  return [...peta.values()].filter((g) => g.length > 1);
}

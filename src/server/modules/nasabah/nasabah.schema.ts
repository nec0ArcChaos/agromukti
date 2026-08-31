import { z } from "zod";

export const skemaBuatNasabah = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi."),
  noHp: z.string().trim().optional(),
  alamat: z.string().trim().optional(),
  dusun: z.string().trim().optional(),
  rt: z.string().trim().optional(),
  rw: z.string().trim().optional(),
  catatan: z.string().trim().optional(),
});
export type InputBuatNasabah = z.infer<typeof skemaBuatNasabah>;

export const skemaUbahNasabah = skemaBuatNasabah.partial().extend({
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
});
export type InputUbahNasabah = z.infer<typeof skemaUbahNasabah>;

export const skemaFilterNasabah = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  dusun: z.string().trim().optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
});

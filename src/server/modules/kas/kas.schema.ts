import { z } from "zod";

export const skemaEntriKas = z.object({
  tanggal: z.coerce.date().optional(),
  arah: z.enum(["MASUK", "KELUAR"]),
  kategori: z.enum(["MODAL_AWAL", "OPERASIONAL", "HIBAH", "LAINNYA"]),
  jumlah: z.coerce.number().int().positive("Jumlah harus lebih dari 0."),
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi untuk entri manual."),
});
export type InputEntriKas = z.infer<typeof skemaEntriKas>;

export const skemaFilterKas = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  dari: z.coerce.date().optional(),
  sampai: z.coerce.date().optional(),
  kategori: z.string().optional(),
});

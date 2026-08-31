import { z } from "zod";

export const skemaBuatSetoran = z.object({
  nasabahId: z.string().min(1, "Pilih nasabah terlebih dahulu."),
  kategoriSampahId: z.string().min(1).optional(),
  beratKg: z.coerce.number().positive("Berat harus lebih dari 0."),
  tanggal: z.coerce.date().optional(),
  catatan: z.string().trim().optional(),
});
export type InputBuatSetoran = z.infer<typeof skemaBuatSetoran>;

export const skemaBatalSetoran = z.object({
  alasan: z.string().trim().min(1, "Alasan pembatalan wajib diisi."),
});

export const skemaFilterSetoran = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  nasabahId: z.string().optional(),
  dari: z.coerce.date().optional(),
  sampai: z.coerce.date().optional(),
  status: z.enum(["MENUNGGU", "DIPROSES", "VOID"]).optional(),
});

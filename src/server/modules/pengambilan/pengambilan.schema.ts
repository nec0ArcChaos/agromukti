import { z } from "zod";

export const skemaBuatPengambilan = z.object({
  pengepulId: z.string().min(1, "Pilih pengepul terlebih dahulu."),
  tanggal: z.coerce.date().optional(),
  setoranIds: z.array(z.string().min(1)).min(1, "Pilih sekurang-kurangnya satu setoran yang diambil."),
  /// Nilai yang BENAR-BENAR dibayarkan pengepul, bukan perkiraan.
  totalNilai: z.coerce.number().int().positive("Total nilai harus lebih dari 0."),
  catatan: z.string().trim().optional(),
});
export type InputBuatPengambilan = z.infer<typeof skemaBuatPengambilan>;

export const skemaBatalPengambilan = z.object({
  alasan: z.string().trim().min(1, "Alasan pembatalan wajib diisi."),
});

export const skemaFilterPengambilan = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  pengepulId: z.string().optional(),
  status: z.enum(["POSTED", "VOID"]).optional(),
});

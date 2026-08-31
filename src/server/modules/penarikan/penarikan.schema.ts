import { z } from "zod";

export const skemaAjukanPenarikan = z.object({
  nasabahId: z.string().min(1, "Pilih nasabah terlebih dahulu."),
  jumlah: z.coerce.number().int().positive("Jumlah penarikan harus lebih dari 0."),
  metode: z.enum(["TUNAI", "TRANSFER", "SEMBAKO"]).default("TUNAI"),
});
export type InputAjukanPenarikan = z.infer<typeof skemaAjukanPenarikan>;

export const skemaTolakPenarikan = z.object({
  alasan: z.string().trim().min(1, "Alasan penolakan wajib diisi."),
});

export const skemaFilterPenarikan = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  nasabahId: z.string().optional(),
  status: z.enum(["PENDING", "DISETUJUI", "DITOLAK"]).optional(),
});

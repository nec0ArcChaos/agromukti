import { z } from "zod";

export const skemaBuatPengepul = z.object({
  kode: z.string().trim().min(1, "Kode wajib diisi."),
  nama: z.string().trim().min(1, "Nama wajib diisi."),
  noHp: z.string().trim().optional(),
  alamat: z.string().trim().optional(),
});
export type InputBuatPengepul = z.infer<typeof skemaBuatPengepul>;

export const skemaUbahPengepul = skemaBuatPengepul
  .omit({ kode: true })
  .partial()
  .extend({ aktif: z.boolean().optional() });
export type InputUbahPengepul = z.infer<typeof skemaUbahPengepul>;

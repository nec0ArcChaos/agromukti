import { z } from "zod";

export const skemaBuatKategori = z.object({
  kode: z.string().trim().min(1, "Kode wajib diisi."),
  nama: z.string().trim().min(1, "Nama wajib diisi."),
});
export type InputBuatKategori = z.infer<typeof skemaBuatKategori>;

export const skemaUbahKategori = z.object({
  nama: z.string().trim().min(1).optional(),
  aktif: z.boolean().optional(),
});
export type InputUbahKategori = z.infer<typeof skemaUbahKategori>;

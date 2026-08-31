import { z } from "zod";
import { skemaIdentitasWarga } from "@/server/modules/nasabah/nasabah.schema";

/**
 * Mendaftarkan petani. Sama seperti nasabah: bisa menautkan ke warga yang
 * sudah ada, atau membuat identitas baru. Seorang warga yang sudah jadi
 * nasabah bank sampah cukup ditautkan - tidak perlu diketik ulang.
 */
export const skemaBuatPetani = z
  .object({
    wargaId: z.string().min(1).optional(),
    warga: skemaIdentitasWarga.optional(),
    kelompokTani: z.string().trim().optional(),
  })
  .refine((v) => v.wargaId || v.warga, {
    message: "Pilih warga yang sudah terdaftar, atau isi identitas warga baru.",
    path: ["warga"],
  });
export type InputBuatPetani = z.infer<typeof skemaBuatPetani>;

export const skemaUbahPetani = z.object({
  kelompokTani: z.string().trim().optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
  warga: skemaIdentitasWarga.partial().optional(),
});
export type InputUbahPetani = z.infer<typeof skemaUbahPetani>;

export const skemaFilterPetani = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  dusun: z.string().trim().optional(),
  kelompokTani: z.string().trim().optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
});

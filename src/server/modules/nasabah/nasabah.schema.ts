import { z } from "zod";

/**
 * Identitas warga. Dipakai saat mendaftarkan nasabah baru yang wargannya
 * belum ada di sistem.
 */
export const skemaIdentitasWarga = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi."),
  nik: z.string().trim().length(16, "NIK harus 16 digit.").optional(),
  noHp: z.string().trim().optional(),
  alamat: z.string().trim().optional(),
  dusun: z.string().trim().optional(),
  rt: z.string().trim().optional(),
  rw: z.string().trim().optional(),
});

/**
 * Mendaftarkan nasabah. Dua cara:
 *  - `wargaId` diisi  -> menautkan ke warga yang SUDAH ada (mis. orang itu
 *    sudah terdaftar sebagai petani di modul pertanian)
 *  - `wargaId` kosong -> identitas baru dibuat dari field di `warga`
 *
 * Inilah gunanya master data warga: satu orang yang menjadi nasabah
 * sekaligus petani tidak perlu diketik dua kali dan tidak menghasilkan
 * dua baris identitas yang bisa berbeda isinya.
 */
export const skemaBuatNasabah = z
  .object({
    wargaId: z.string().min(1).optional(),
    warga: skemaIdentitasWarga.optional(),
    catatan: z.string().trim().optional(),
  })
  .refine((v) => v.wargaId || v.warga, {
    message: "Pilih warga yang sudah terdaftar, atau isi identitas warga baru.",
    path: ["warga"],
  });
export type InputBuatNasabah = z.infer<typeof skemaBuatNasabah>;

export const skemaUbahNasabah = z.object({
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
  catatan: z.string().trim().optional(),
  /// Perubahan identitas diteruskan ke baris Warga terkait.
  warga: skemaIdentitasWarga.partial().optional(),
});
export type InputUbahNasabah = z.infer<typeof skemaUbahNasabah>;

export const skemaFilterNasabah = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  dusun: z.string().trim().optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
});

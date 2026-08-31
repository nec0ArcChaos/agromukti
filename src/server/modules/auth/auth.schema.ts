import { z } from "zod";

export const skemaLogin = z.object({
  username: z.string().trim().min(1, "Username wajib diisi."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});
export type InputLogin = z.infer<typeof skemaLogin>;

export const skemaBuatUser = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .regex(/^[a-z0-9_.]+$/, "Username hanya huruf kecil, angka, titik, dan garis bawah."),
  password: z.string().min(6, "Kata sandi minimal 6 karakter."),
  nama: z.string().trim().min(1, "Nama wajib diisi."),
  role: z
    .enum(["ADMIN", "OPERATOR_SAMPAH", "OPERATOR_ORGANIK", "OPERATOR_TANI", "KEPALA_DESA"])
    .default("OPERATOR_SAMPAH"),
});
export type InputBuatUser = z.infer<typeof skemaBuatUser>;

export const skemaGantiPassword = z.object({
  passwordLama: z.string().min(1),
  passwordBaru: z.string().min(6, "Kata sandi baru minimal 6 karakter."),
});

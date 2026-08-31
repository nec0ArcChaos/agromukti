import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

export type MetaPaginasi = {
  page: number;
  perPage: number;
  total: number;
  totalPage: number;
};

/**
 * Amplop seragam untuk SELURUH endpoint.
 * Kolaborator front end tidak perlu menebak bentuk data per route.
 */
export function sukses<T>(data: T, meta?: MetaPaginasi, status = 200) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

export function gagal(
  kode: string,
  message: string,
  status = 400,
  fields?: Record<string, string>,
) {
  return NextResponse.json(
    { success: false, error: { code: kode, message, ...(fields ? { fields } : {}) } },
    { status },
  );
}

/**
 * Menerjemahkan galat apa pun menjadi respons yang layak dibaca operator.
 * Galat tak dikenal sengaja TIDAK membocorkan pesan aslinya ke klien —
 * detailnya masuk ke log server.
 */
export function tangkapGalat(err: unknown) {
  if (err instanceof AppError) {
    return gagal(err.kode, err.message, err.status, err.fields);
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      if (!fields[key]) fields[key] = issue.message;
    }
    return gagal(
      "VALIDASI_GAGAL",
      "Ada isian yang belum benar. Periksa kembali formulir.",
      422,
      fields,
    );
  }

  console.error("[GALAT TAK TERTANGANI]", err);
  return gagal(
    "GALAT_SERVER",
    "Terjadi gangguan pada sistem. Coba lagi, dan bila berulang hubungi pengelola.",
    500,
  );
}

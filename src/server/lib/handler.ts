import { NextRequest, NextResponse } from "next/server";
import { tangkapGalat } from "./response";

/**
 * Pembungkus route handler.
 *
 * Route handler di proyek ini dibuat setipis mungkin: baca input, panggil
 * service, kembalikan hasil. Tidak ada try/catch bertebaran — semua galat
 * ditangkap di sini dan diterjemahkan oleh `tangkapGalat`, sehingga bentuk
 * respons galat dijamin sama di seluruh endpoint.
 *
 *   export const GET = route(async (req) => {
 *     const sesi = await wajibMasuk();
 *     return sukses(await daftarNasabah(bacaQuery(req)));
 *   });
 */
export function route<C = unknown>(
  fn: (req: NextRequest, ctx: C) => Promise<NextResponse> | NextResponse,
) {
  return async (req: NextRequest, ctx: C): Promise<NextResponse> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return tangkapGalat(err);
    }
  };
}

/** Baca body JSON; body kosong atau rusak jadi objek kosong agar Zod yang menegur. */
export async function bacaBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/** Alamat IP pemanggil, untuk audit log dan log integrasi. */
export function bacaIp(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}

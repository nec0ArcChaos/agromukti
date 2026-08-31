/**
 * Klien fetch tipis untuk front end uji coba.
 *
 * Front end "sesungguhnya" akan dikerjakan kolaborator dengan shadcn/ui.
 * Halaman-halaman di src/app/(app) di sini HANYA untuk memverifikasi
 * bahwa logika back end benar - stylingnya sengaja polos.
 */

export type Amplop<T> =
  | { success: true; data: T; meta?: { page: number; perPage: number; total: number; totalPage: number } }
  | { success: false; error: { code: string; message: string; fields?: Record<string, string> } };

export class ApiError extends Error {
  constructor(readonly kode: string, message: string, readonly fields?: Record<string, string>) {
    super(message);
  }
}

type Meta = { page: number; perPage: number; total: number; totalPage: number };

/**
 * Menerjemahkan amplop gagal menjadi ApiError.
 *
 * Khusus BELUM_MASUK (sesi habis, dicabut, atau usernya sudah tidak ada),
 * pengguna langsung diarahkan ke halaman masuk - menampilkan galat itu di
 * dalam formulir hanya membuat operator bingung karena tidak ada yang bisa
 * mereka perbaiki di sana. LOGIN_GAGAL sengaja TIDAK ikut diarahkan,
 * karena itu memang terjadi di halaman masuk dan pesannya perlu dibaca.
 */
function lempar(error: { code: string; message: string; fields?: Record<string, string> }): never {
  if (error.code === "BELUM_MASUK" && typeof window !== "undefined") {
    // Sengaja navigasi keras, bukan router.push(): sesi sudah tidak valid,
    // jadi seluruh state klien yang terlanjur dimuat dengan sesi lama harus
    // dibuang dan server component wajib mengevaluasi ulang sesinya dari nol.
    // Modul ini juga bukan komponen React, sehingga tidak bisa memakai hook.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }
  throw new ApiError(error.code, error.message, error.fields);
}

async function panggil<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
  });
  const amplop = (await res.json()) as Amplop<T>;
  if (!amplop.success) lempar(amplop.error);
  return amplop.data;
}

async function panggilMeta<T>(path: string): Promise<{ data: T; meta?: Meta }> {
  const res = await fetch(path, { credentials: "include" });
  const amplop = (await res.json()) as Amplop<T>;
  if (!amplop.success) lempar(amplop.error);
  return { data: amplop.data, meta: "meta" in amplop ? amplop.meta : undefined };
}

export const api = {
  get: <T>(path: string) => panggil<T>(path),
  getMeta: <T>(path: string) => panggilMeta<T>(path),
  post: <T>(path: string, body?: unknown) => panggil<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => panggil<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
};

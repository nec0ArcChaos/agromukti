import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { AuthError, ForbiddenError } from "./errors";

/**
 * Peran pengguna lintas tiga pilar AgroMukti.
 *
 * KEPALA_DESA sengaja dibuat baca-saja: ia memantau dan mencetak laporan
 * resmi, bukan menginput transaksi.
 */
export const PERAN = [
  "ADMIN",
  "OPERATOR_SAMPAH",
  "OPERATOR_ORGANIK",
  "OPERATOR_TANI",
  "KEPALA_DESA",
] as const;

export type Peran = (typeof PERAN)[number];

export function peranValid(nilai: unknown): nilai is Peran {
  return typeof nilai === "string" && (PERAN as readonly string[]).includes(nilai);
}

export type Sesi = {
  userId: string;
  username: string;
  nama: string;
  role: Peran;
};

const NAMA_COOKIE = "bsa_sesi";
const MAX_AGE_JAM = Number(process.env.SESSION_MAX_AGE_HOURS ?? 12);

/**
 * Tanda `Secure` pada cookie sesi.
 *
 * JANGAN diikatkan ke NODE_ENV. Sistem ini dijalankan di komputer balai
 * desa lewat HTTP biasa dan diakses pengurus dari telepon dengan alamat IP
 * lokal (mis. http://192.168.1.5:3000). Peramban MENOLAK menyimpan cookie
 * bertanda Secure pada origin HTTP non-localhost, sehingga login akan
 * gagal diam-diam - halamannya terbuka, tetapi sesi tidak pernah tersimpan.
 * Dari localhost gejalanya tidak terlihat, karena localhost dianggap
 * konteks aman; jadi kekeliruan ini mudah lolos saat diuji di satu mesin.
 *
 * Default: aktif hanya bila memang dilayani lewat HTTPS (Vercel), atau
 * bila dinyalakan sendiri lewat SESSION_COOKIE_SECURE=true.
 */
const COOKIE_SECURE =
  process.env.SESSION_COOKIE_SECURE === "true" || Boolean(process.env.VERCEL);

function kunci(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET belum diisi atau kurang dari 32 karakter. Lihat .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

// --- password ---

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function cocokPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- sesi ---

export async function buatSesi(sesi: Sesi): Promise<void> {
  const token = await new SignJWT({ ...sesi })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_JAM}h`)
    .sign(kunci());

  const store = await cookies();
  store.set(NAMA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: MAX_AGE_JAM * 3600,
  });
}

export async function hapusSesi(): Promise<void> {
  const store = await cookies();
  store.delete(NAMA_COOKIE);
}

/** Sesi saat ini, atau null bila belum masuk / token kedaluwarsa. */
export async function bacaSesi(): Promise<Sesi | null> {
  const store = await cookies();
  const token = store.get(NAMA_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, kunci());
    return {
      userId: String(payload.userId),
      username: String(payload.username),
      nama: String(payload.nama),
      role: peranValid(payload.role) ? payload.role : "KEPALA_DESA",
    };
  } catch {
    return null;
  }
}

/**
 * Sesi yang sudah DIVERIFIKASI terhadap basis data, bukan sekadar token
 * yang tanda tangannya sah.
 *
 * Token JWT bersifat mandiri dan berlaku sampai kedaluwarsa - isinya tidak
 * ikut berubah bila keadaan di basis data berubah. Tanpa pemeriksaan ini:
 *
 *  - Operator yang baru dinonaktifkan admin tetap bisa bekerja sampai
 *    tokennya habis (bisa belasan jam). Itu lubang keamanan.
 *  - Token yang menunjuk User yang sudah tidak ada (mis. basis data
 *    dipulihkan dari cadangan atau dibangun ulang) akan lolos otentikasi,
 *    lalu menjatuhkan setiap operasi tulis dengan galat foreign key yang
 *    tidak informatif - karena Setoran.operatorId, Penarikan.diajukanOleh,
 *    dan AuditLog.userId semuanya menunjuk ke User.
 *
 * Peran dan nama juga diambil ulang dari basis data, bukan dari token,
 * supaya perubahan peran langsung berlaku.
 */
export async function bacaSesiTerverifikasi(): Promise<Sesi | null> {
  const sesi = await bacaSesi();
  if (!sesi) return null;

  const user = await prisma.user.findUnique({
    where: { id: sesi.userId },
    select: { id: true, username: true, nama: true, role: true, aktif: true },
  });
  if (!user || !user.aktif) return null;

  // Fail-closed: peran yang tidak dikenal (mis. sisa data lama) TIDAK
  // diberi hak apa pun - lebih baik pengguna terkunci dan lapor daripada
  // diam-diam mendapat akses yang tidak diniatkan.
  if (!peranValid(user.role)) return null;

  return {
    userId: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
  };
}

/** Sesi wajib ada dan usernya masih valid; kalau tidak, lempar 401. */
export async function wajibMasuk(): Promise<Sesi> {
  const sesi = await bacaSesiTerverifikasi();
  if (!sesi) throw new AuthError();
  return sesi;
}

/**
 * Sesi wajib ada DAN perannya termasuk yang diizinkan.
 * Dipakai untuk tindakan yang menyentuh uang atau data induk:
 * menyetujui penarikan, mengubah harga, menerbitkan API key.
 */
export async function wajibPeran(...izin: Peran[]): Promise<Sesi> {
  // Dipanggil tanpa peran berarti daftar izin kosong, dan SETIAP pengguna
  // akan ditolak diam-diam - terlihat seperti bug perizinan, padahal salah
  // tulis. Sudah pernah terjadi saat berkas rute digenerate dan argumennya
  // hilang, jadi jadikan galat yang berisik, bukan penolakan senyap.
  if (izin.length === 0) {
    throw new Error("wajibPeran() dipanggil tanpa peran - sebutkan minimal satu peran yang diizinkan.");
  }

  const sesi = await wajibMasuk();
  if (!izin.includes(sesi.role)) throw new ForbiddenError();
  return sesi;
}

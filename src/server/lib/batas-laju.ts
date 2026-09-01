import { AppError } from "./errors";

/**
 * Pembatas laju sederhana berbasis memori.
 *
 * Dipakai untuk endpoint PUBLIK yang bisa menulis ke basis data - tanpa
 * ini, satu orang bisa membanjiri tabel permintaan pupuk dari formulir
 * yang tidak butuh login.
 *
 * Keterbatasan yang disengaja: hitungannya per proses dan hilang saat
 * server dimulai ulang. Untuk satu server di balai desa itu memadai.
 * Bila kelak dijalankan di beberapa instans, ganti dengan penyimpanan
 * bersama (mis. tabel basis data atau Redis).
 */
type Jejak = { jumlah: number; resetPada: number };

const jejak = new Map<string, Jejak>();

export function batasiLaju(kunci: string, maksimal: number, jendelaDetik: number) {
  const sekarang = Date.now();
  const adanya = jejak.get(kunci);

  if (!adanya || sekarang > adanya.resetPada) {
    jejak.set(kunci, { jumlah: 1, resetPada: sekarang + jendelaDetik * 1000 });
    return;
  }

  adanya.jumlah += 1;
  if (adanya.jumlah > maksimal) {
    const sisaDetik = Math.ceil((adanya.resetPada - sekarang) / 1000);
    throw new AppError(
      "TERLALU_SERING",
      `Terlalu banyak percobaan. Coba lagi dalam ${sisaDetik} detik.`,
      429,
    );
  }
}

/** Membuang jejak kedaluwarsa supaya peta tidak tumbuh tanpa batas. */
export function bersihkanJejak() {
  const sekarang = Date.now();
  for (const [kunci, j] of jejak) {
    if (sekarang > j.resetPada) jejak.delete(kunci);
  }
}

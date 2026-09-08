import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/lib/db";

/**
 * Perkakas bersama untuk uji integrasi.
 *
 * PENJAGA KESELAMATAN
 * Berkas ini mengosongkan seluruh tabel. Kalau sampai tersambung ke basis
 * data kerja, seluruh catatan desa hilang dalam sekejap dan tidak ada
 * yang bisa mengembalikannya. Karena itu setiap pengosongan didahului
 * pemeriksaan nama basis data: harus berakhiran "_uji". Pemeriksaan ini
 * tidak boleh dilonggarkan - biayanya satu baris, ruginya seluruh data.
 */

const AKHIRAN_WAJIB = "_uji";

function namaBasisData() {
  const url = process.env.DATABASE_URL ?? "";
  const cocok = url.match(/\/([^/?]+)(\?|$)/);
  return cocok?.[1] ?? "";
}

export function pastikanBasisDataUji() {
  const nama = namaBasisData();
  if (!nama.endsWith(AKHIRAN_WAJIB)) {
    throw new Error(
      `MENOLAK BERJALAN. Pengujian tersambung ke basis data "${nama || "(tidak terbaca)"}", ` +
        `padahal namanya harus berakhiran "${AKHIRAN_WAJIB}".\n` +
        `Uji ini mengosongkan seluruh tabel; menjalankannya di basis data kerja akan menghapus data desa.\n` +
        `Periksa DATABASE_URL pada vitest.config.ts, lalu jalankan "npm run uji:siapkan".`,
    );
  }
  return nama;
}

/** Mengosongkan seluruh tabel kecuali riwayat migrasi Prisma. */
export async function kosongkanBasisData() {
  pastikanBasisDataUji();

  const tabel = await prisma.$queryRaw<{ TABLE_NAME: string }[]>`
    SELECT TABLE_NAME FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`;

  // Kunci asing dimatikan sementara supaya urutan pengosongan tidak
  // perlu mengikuti rantai relasi yang panjang.
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const t of tabel) {
      const nama = t.TABLE_NAME;
      if (nama === "_prisma_migrations") continue;
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${nama}\``);
    }
  } finally {
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
}

export type Dasar = Awaited<ReturnType<typeof siapkanDasar>>;

/**
 * Data pokok yang dibutuhkan hampir semua uji: pengaturan, satu akun
 * operator, dan dua produk pupuk sebagai tujuan hasil produksi.
 */
export async function siapkanDasar(opsi?: { rendemenPersen?: number; pocPerKg?: number }) {
  await kosongkanBasisData();

  const pengaturan = await prisma.pengaturan.create({
    data: {
      id: "SINGLETON",
      namaBankSampah: "Bank Sampah Uji",
      desa: "Argamukti",
      kecamatan: "Argapura",
      kabupaten: "Majalengka",
      rendemenKomposPersen: opsi?.rendemenPersen ?? 30,
      hasilPocLiterPerKg: opsi?.pocPerKg ?? 0.05,
    },
  });

  const operator = await prisma.user.create({
    data: {
      username: "uji.operator",
      // Bukan kata sandi sungguhan; uji ini tidak melewati jalur masuk.
      passwordHash: "$2b$10$ujiujiujiujiujiujiujiuOujiujiujiujiujiujiujiujiujiujiu",
      nama: "Operator Uji",
      role: "ADMIN",
    },
  });

  const padat = await prisma.produkPupuk.create({
    data: { kode: "UJI-PADAT", nama: "Kompos Uji", jenis: "KOMPOS_PADAT", harga: 1500, satuan: "KG" },
  });
  const cair = await prisma.produkPupuk.create({
    data: { kode: "UJI-CAIR", nama: "POC Uji", jenis: "PUPUK_CAIR", harga: 12000, satuan: "LITER" },
  });

  return { pengaturan, operator, padat, cair };
}

/** Menambah bahan baku organik langsung, sebagai keadaan awal sebuah uji. */
export async function isiStokOrganik(kg: number, operatorId: string) {
  await prisma.mutasiSampahOrganik.create({
    data: { arah: "MASUK", beratKg: kg, refTipe: "SETORAN", sumber: "Persiapan uji", operatorId },
  });
}

export async function tutupKoneksi() {
  await prisma.$disconnect();
}

/** Klien lepas untuk keperluan yang tidak boleh memakai instance bersama. */
export function klienBaru() {
  return new PrismaClient();
}

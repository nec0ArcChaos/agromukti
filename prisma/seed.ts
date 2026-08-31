import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Kategori sampah anorganik. Label ringan untuk laporan komposisi -
 * TIDAK ada harga di sini. Harga jual ditentukan pengepul saat datang,
 * bukan oleh bank sampah.
 */
const KATEGORI_SAMPAH = [
  { kode: "AN-01", nama: "Plastik" },
  { kode: "AN-02", nama: "Kertas & Kardus" },
  { kode: "AN-03", nama: "Logam" },
  { kode: "AN-04", nama: "Kaca/Botol" },
  { kode: "AN-05", nama: "Campuran" },
];

async function main() {
  await prisma.pengaturan.upsert({
    where: { id: "SINGLETON" },
    create: {
      id: "SINGLETON",
      alamat: "Jalan Raya Desa Argamukti Nomor 1",
      minimalPenarikan: 10000,
    },
    update: {},
  });
  console.log("  Pengaturan sistem siap");

  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const nama = process.env.SEED_ADMIN_NAMA ?? "Administrator";

  await prisma.user.upsert({
    where: { username },
    create: {
      username,
      nama,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 10),
    },
    update: {},
  });
  console.log(`  Akun admin siap: ${username}`);

  for (const k of KATEGORI_SAMPAH) {
    await prisma.kategoriSampah.upsert({ where: { kode: k.kode }, create: k, update: {} });
  }
  console.log(`  ${KATEGORI_SAMPAH.length} kategori sampah anorganik siap`);
}

main()
  .then(() => console.log("\nSeed selesai."))
  .catch((e) => {
    console.error("Seed gagal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Kategori sampah anorganik - label untuk laporan, tanpa harga. */
const KATEGORI_SAMPAH = [
  { kode: "AN-01", nama: "Plastik" },
  { kode: "AN-02", nama: "Kertas & Kardus" },
  { kode: "AN-03", nama: "Logam" },
  { kode: "AN-04", nama: "Kaca/Botol" },
  { kode: "AN-05", nama: "Campuran" },
];

/** Komoditas hortikultura khas lereng Ciremai (dari proposal Ayu Rianti). */
const KOMODITAS = [
  { kode: "KM-01", nama: "Bawang Daun", deskripsi: "Komoditas utama lereng Gunung Ciremai." },
  { kode: "KM-02", nama: "Kubis / Kol", deskripsi: "Tahan cuaca dingin dataran tinggi." },
  { kode: "KM-03", nama: "Tomat Argamukti", deskripsi: "Bahan baku Wajik Tomat UMKM desa." },
  { kode: "KM-04", nama: "Kentang Granola", deskripsi: "Kentang dataran tinggi." },
];

/** Produk pupuk. Stoknya diisi hasil produksi pilar sampah organik. */
const PRODUK_PUPUK = [
  {
    kode: "PP-KOMPOS",
    nama: "Pupuk Kompos Organik Argamukti",
    jenis: "KOMPOS_PADAT",
    deskripsi: "Hasil fermentasi sampah organik desa.",
    harga: 1500,
    satuan: "KG",
  },
  {
    kode: "PP-POC",
    nama: "Pupuk Cair Organik Bio-Kompos",
    jenis: "PUPUK_CAIR",
    deskripsi: "Konsentrat cair pemacu pertumbuhan hortikultura.",
    harga: 12000,
    satuan: "LITER",
  },
];

const AKUN = [
  { username: "admin", nama: "Administrator", role: "ADMIN" },
  { username: "op.sampah", nama: "Operator Bank Sampah", role: "OPERATOR_SAMPAH" },
  { username: "op.organik", nama: "Operator Pengolahan Organik", role: "OPERATOR_ORGANIK" },
  { username: "op.tani", nama: "Operator Pertanian", role: "OPERATOR_TANI" },
  { username: "kades", nama: "Kepala Desa Argamukti", role: "KEPALA_DESA" },
];

async function main() {
  await prisma.pengaturan.upsert({
    where: { id: "SINGLETON" },
    create: {
      id: "SINGLETON",
      namaBankSampah: "AgroMukti - Sistem Informasi Terpadu Desa Argamukti",
      alamat: "Jalan Raya Desa Argamukti Nomor 1",
      minimalPenarikan: 10000,
    },
    update: {},
  });
  console.log("  Pengaturan sistem siap");

  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const hash = await bcrypt.hash(password, 10);
  for (const a of AKUN) {
    await prisma.user.upsert({
      where: { username: a.username },
      create: { ...a, passwordHash: hash },
      update: { nama: a.nama, role: a.role },
    });
  }
  console.log(`  ${AKUN.length} akun siap (semua kata sandi: ${password})`);

  for (const k of KATEGORI_SAMPAH) {
    await prisma.kategoriSampah.upsert({ where: { kode: k.kode }, create: k, update: {} });
  }
  console.log(`  ${KATEGORI_SAMPAH.length} kategori sampah anorganik siap`);

  for (const k of KOMODITAS) {
    await prisma.komoditas.upsert({ where: { kode: k.kode }, create: k, update: {} });
  }
  console.log(`  ${KOMODITAS.length} komoditas siap`);

  for (const p of PRODUK_PUPUK) {
    await prisma.produkPupuk.upsert({ where: { kode: p.kode }, create: p, update: {} });
  }
  console.log(`  ${PRODUK_PUPUK.length} produk pupuk siap`);

  // Contoh warga yang sekaligus nasabah DAN petani - membuktikan master
  // data warga bekerja lintas pilar tanpa menduplikasi identitas.
  const adaContoh = await prisma.warga.findFirst({ where: { nama: "Bapak Emo Prasetio" } });
  if (!adaContoh) {
    const warga = await prisma.warga.create({
      data: {
        nama: "Bapak Emo Prasetio",
        alamat: "Dusun Apuy, Argamukti",
        dusun: "Apuy",
        noHp: "081234567890",
      },
    });
    const komoditas = await prisma.komoditas.findUniqueOrThrow({ where: { kode: "KM-03" } });
    const petani = await prisma.petani.create({
      data: { wargaId: warga.id, kode: "TN-0001", kelompokTani: "Tani Makmur Apuy" },
    });
    // Kode di atas dibuat langsung, jadi penghitung sequence harus ikut
    // dimajukan - kalau tidak, petani berikutnya akan diberi TN-0001 lagi
    // dan gagal karena kode bersifat unik.
    await prisma.sequence.upsert({
      where: { tipe_periode: { tipe: "PETANI", periode: "-" } },
      create: { tipe: "PETANI", periode: "-", nomorTerakhir: 1 },
      update: { nomorTerakhir: 1 },
    });
    await prisma.lahan.create({
      data: {
        petaniId: petani.id,
        komoditasId: komoditas.id,
        luas: 5000,
        satuan: "M2",
        lokasi: "Blok Apuy Atas - dekat Curug Muara Jaya",
      },
    });
    console.log("  Contoh warga lintas pilar siap (petani + lahan)");
  }
}

main()
  .then(() => console.log("\nSeed selesai."))
  .catch((e) => {
    console.error("Seed gagal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

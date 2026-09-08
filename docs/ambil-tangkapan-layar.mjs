/**
 * Mengambil tangkapan layar halaman Produksi Pupuk dan Produk UMKM pada
 * dua ukuran layar: ponsel dan komputer meja.
 *
 * MENGAPA puppeteer-core, BUKAN puppeteer
 * puppeteer-core tidak ikut mengunduh Chromium sendiri (ratusan MB); ia
 * memakai Chrome yang sudah terpasang di komputer ini. Untuk keperluan
 * dokumentasi sekali-sekali, menambah unduhan sebesar itu ke repositori
 * tidak sepadan.
 *
 * Jalankan: npm run docs:tangkapan
 * Prasyarat: `npm run dev` sedang berjalan di http://localhost:3000
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const DIR = dirname(fileURLToPath(import.meta.url));
const KELUARAN = join(DIR, "tangkapan-layar");

const ALAMAT = process.env.ALAMAT_APP ?? "http://localhost:3000";
const AKUN = {
  username: process.env.SEED_ADMIN_USERNAME ?? "admin",
  password: process.env.SEED_ADMIN_PASSWORD ?? "admin123",
};

/** Chrome yang lazim ada di Windows. Yang pertama ditemukan yang dipakai. */
const KANDIDAT_CHROME = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

/**
 * Dekstop dipotret seluruh halaman supaya tabelnya terlihat utuh.
 * Ponsel dipotret sebatas layar (bukan seluruh halaman) supaya hasilnya
 * berbentuk layar telepon sungguhan - gulungan penuh setinggi 4.600 piksel
 * kalau dimuat ke halaman A4 akan menyusut jadi terlalu kecil untuk dibaca,
 * dan justru tidak memperlihatkan apa pun soal keterbacaan di ponsel.
 */
const LAYAR = [
  { nama: "dekstop", width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, penuh: true },
  { nama: "ponsel", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, penuh: false },
];

const HALAMAN = [
  { nama: "produksi", jalur: "/produksi", judul: "Produksi Pupuk" },
  { nama: "umkm", jalur: "/umkm", judul: "Produk UMKM" },
];

function cariChrome() {
  const ada = KANDIDAT_CHROME.find((p) => existsSync(p));
  if (!ada) {
    throw new Error(
      "Chrome atau Edge tidak ditemukan di lokasi yang lazim.\n" +
        "Setel CHROME_PATH ke berkas chrome.exe, lalu jalankan ulang.",
    );
  }
  return ada;
}

async function pastikanServerHidup() {
  try {
    const r = await fetch(`${ALAMAT}/petugas`, { redirect: "manual" });
    if (r.status >= 500) throw new Error(`status ${r.status}`);
  } catch (e) {
    throw new Error(
      `Tidak bisa menghubungi ${ALAMAT}. Jalankan "npm run dev" lebih dulu di jendela terminal lain.\n` +
        `(${e.message})`,
    );
  }
}

async function main() {
  mkdirSync(KELUARAN, { recursive: true });
  await pastikanServerHidup();

  const chrome = cariChrome();
  console.log(`Peramban : ${chrome}`);
  console.log(`Alamat   : ${ALAMAT}`);

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--hide-scrollbars", "--force-device-scale-factor=1"],
  });

  try {
    for (const layar of LAYAR) {
      const page = await browser.newPage();
      await page.setViewport({
        width: layar.width,
        height: layar.height,
        deviceScaleFactor: layar.deviceScaleFactor,
        isMobile: layar.isMobile,
        hasTouch: layar.isMobile,
      });

      // Masuk sekali per ukuran layar; cookie sesi ikut di konteks halaman.
      await page.goto(`${ALAMAT}/petugas`, { waitUntil: "networkidle0" });
      await page.type("#username", AKUN.username);
      await page.type("#password", AKUN.password);
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
        page.click('button[type="submit"]'),
      ]);

      // Sesi berbasis cookie httpOnly: kalau masih terdampar di /petugas,
      // berarti gagal masuk - lebih baik berhenti dengan pesan jelas
      // daripada menghasilkan gambar halaman login yang menyesatkan.
      await page.waitForFunction(() => !location.pathname.startsWith("/petugas"), { timeout: 20000 })
        .catch(() => {
          throw new Error(
            `Gagal masuk sebagai "${AKUN.username}". Periksa SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD di .env.`,
          );
        });

      for (const h of HALAMAN) {
        await page.goto(`${ALAMAT}${h.jalur}`, { waitUntil: "networkidle0" });
        // Halaman ini memuat datanya lewat fetch di sisi klien, jadi tunggu
        // sampai tulisan "Memuat..." benar-benar hilang - bukan sekadar
        // menunggu jaringan sepi.
        await page
          .waitForFunction(() => !document.body.innerText.includes("Memuat..."), { timeout: 20000 })
          .catch(() => console.warn(`  ! ${h.jalur} masih menampilkan "Memuat..." saat dipotret.`));
        // Lencana perkakas pengembang Next.js melayang di atas konten dan
        // tidak ada di versi produksi - disembunyikan supaya gambar yang
        // masuk laporan sama dengan yang dilihat warga nanti.
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        await new Promise((r) => setTimeout(r, 600));

        const berkas = join(KELUARAN, `${h.nama}-${layar.nama}.png`);
        await page.screenshot({ path: berkas, fullPage: layar.penuh });
        console.log(`  tersimpan: ${h.nama}-${layar.nama}.png`);
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\nSelesai. Berkas ada di ${KELUARAN}`);
}

main().catch((e) => {
  console.error(`\nGagal: ${e.message}`);
  process.exitCode = 1;
});

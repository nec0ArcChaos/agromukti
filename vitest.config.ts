import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Pengujian dijalankan terhadap BASIS DATA TERPISAH
 * (bank_sampah_argamukti_uji), bukan basis data kerja.
 *
 * Alasannya bukan sekadar kerapian. Uji integrasi di sini sengaja
 * menembus sampai ke basis data - itulah yang membuatnya berguna, karena
 * yang diperiksa justru keseimbangan buku besar dan penjagaan stok yang
 * hanya muncul saat transaksi benar-benar ditulis. Kalau dijalankan di
 * basis data kerja, setiap kali pengujian dijalankan data desa akan
 * bertambah baris palsu, dan lama-lama tidak ada yang tahu mana catatan
 * sungguhan.
 *
 * Siapkan sekali dengan:
 *   npm run uji:siapkan
 */
const URL_UJI = "mysql://root@localhost:3306/bank_sampah_argamukti_uji";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    env: {
      DATABASE_URL: process.env.DATABASE_URL_UJI ?? URL_UJI,
      SESSION_SECRET: "rahasia-untuk-pengujian-saja-bukan-untuk-produksi",
      NODE_ENV: "test",
    },
    // Berkas uji berbagi satu basis data. Dijalankan berbarengan, satu
    // berkas bisa menghapus data yang sedang dipakai berkas lain, dan
    // kegagalan yang muncul bukan kegagalan yang sebenarnya.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ["src/**/*.test.ts"],
    reporters: ["default", ["json", { outputFile: "docs/hasil-uji/uji-fungsional.json" }]],
  },
});

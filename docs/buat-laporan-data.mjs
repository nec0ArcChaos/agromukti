/**
 * Pembangkit "Laporan Data dan Monitoring AgroMukti" (.pdf).
 *
 * Isinya tiga bagian sesuai permintaan:
 *   1. Tangkapan layar responsif (ponsel dan dekstop) halaman Produksi
 *      Pupuk dan Produk UMKM.
 *   2. Cuplikan basis data: warga, timbangan sampah organik, stok pupuk,
 *      dan penjualan.
 *   3. Dashboard monitoring: grafik sampah terkumpul, pupuk diproduksi,
 *      dan penjualan - semuanya per bulan.
 *
 * ANGKA DIAMBIL LANGSUNG DARI BASIS DATA, bukan diketik ulang. Kalau
 * datanya bertambah, jalankan ulang `npm run docs:laporan` dan seluruh
 * tabel serta grafik ikut menyesuaikan. Tidak ada angka yang ditulis
 * tangan di berkas ini.
 *
 * URUTAN MENJALANKAN:
 *   1. npm run dev            (di terminal lain, biar bisa dipotret)
 *   2. npm run docs:tangkapan (mengambil tangkapan layar)
 *   3. npm run docs:laporan   (menyusun PDF ini)
 *
 * CATATAN TEKNIS: font bawaan PDFKit ber-encoding WinAnsi dan tidak
 * memuat lambang seperti sigma atau "kurang lebih", jadi seluruh teks di
 * sini memakai huruf dan tanda baca biasa.
 */
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------- warna
// Pasangan warna kategori sudah diuji keterbacaannya bagi pembaca dengan
// buta warna merah-hijau (protan/deutan) maupun biru-kuning (tritan),
// serta cukup kontras di atas kertas putih. Jangan diganti begitu saja
// dengan warna merek: teal #0f766e milik AgroMukti terlalu rendah
// kroma-nya dan terbaca abu-abu saat dicetak hitam putih.
const SERI_A = "#0d9488"; // seri pertama
const SERI_B = "#c2410c"; // seri kedua
const TEAL = "#0f766e"; // aksen tulisan, bukan penanda data
const ABU = "#64748b";
const ABU_MUDA = "#f1f5f9";
const GARIS = "#e2e8f0";
const GELAP = "#0f172a";
const MERAH = "#b91c1c";

const M = 48;
const LEBAR_A4 = 595.28;
const TINGGI_A4 = 841.89;
const L = LEBAR_A4 - M * 2;

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const rp = (n) => `Rp ${Number(n).toLocaleString("id-ID")}`;
const kg = (n) => `${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
const tglSingkat = (d) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-");
const kunciBulan = (d) => `${new Date(d).getFullYear()}-${String(new Date(d).getMonth() + 1).padStart(2, "0")}`;
const labelBulan = (k) => `${NAMA_BULAN[Number(k.slice(5)) - 1]}\n${k.slice(0, 4)}`;

/** Nomor telepon disamarkan empat digit terakhirnya. */
const hp = (n) => (n ? `${String(n).slice(0, -4)}****` : "-");

// ============================================================ AMBIL DATA

async function ambilData() {
  const [
    warga, mutasiOrganik, produkPupuk, mutasiStok, pengambilan, distribusi,
    produksi, setoran, produkUmkm, pengaturan,
  ] = await Promise.all([
    prisma.warga.findMany({
      orderBy: [{ dusun: "asc" }, { nama: "asc" }],
      select: {
        id: true, nama: true, dusun: true, rt: true, rw: true, noHp: true, nik: true, aktif: true,
        nasabah: { select: { kode: true, status: true, saldo: true } },
        petani: { select: { kode: true, status: true, kelompokTani: true } },
      },
    }),
    prisma.mutasiSampahOrganik.findMany({ orderBy: { tanggal: "desc" } }),
    prisma.produkPupuk.findMany({ orderBy: { kode: "asc" } }),
    prisma.mutasiStokPupuk.groupBy({ by: ["produkPupukId", "arah"], _sum: { jumlah: true } }),
    prisma.pengambilanPengepul.findMany({
      orderBy: { tanggal: "desc" },
      include: { pengepul: { select: { nama: true } } },
    }),
    prisma.distribusiPupuk.findMany({
      orderBy: { tanggalDistribusi: "desc" },
      include: {
        detail: { include: { produkPupuk: { select: { nama: true, satuan: true } } } },
        permintaan: { select: { petani: { select: { kode: true, warga: { select: { nama: true } } } } } },
      },
    }),
    prisma.produksiPupuk.findMany({ orderBy: { tanggalMulai: "asc" } }),
    prisma.setoran.findMany({ orderBy: { tanggal: "asc" }, select: { tanggal: true, beratKg: true, status: true } }),
    prisma.produkUmkm.findMany({ orderBy: { kode: "asc" } }),
    prisma.pengaturan.findUnique({ where: { id: "SINGLETON" } }),
  ]);

  return { warga, mutasiOrganik, produkPupuk, mutasiStok, pengambilan, distribusi, produksi, setoran, produkUmkm, pengaturan };
}

/** Menyusun rekap bulanan dari seluruh pilar, dengan sumbu bulan yang sama. */
function rekapBulanan(d) {
  const peta = new Map();
  const isi = (k) =>
    peta.get(k) ??
    peta.set(k, { anorganik: 0, organik: 0, padat: 0, cair: 0, jualPengepul: 0, jualPupuk: 0, subsidi: 0 }).get(k);

  for (const s of d.setoran) {
    if (s.status === "VOID") continue;
    isi(kunciBulan(s.tanggal)).anorganik += Number(s.beratKg);
  }
  for (const m of d.mutasiOrganik) {
    // Hanya setoran warga yang dihitung "terkumpul". Mutasi MASUK bertipe
    // PRODUKSI adalah bahan yang dikembalikan karena batch dibatalkan -
    // itu sampah lama yang berputar balik, bukan sampah baru.
    if (m.arah !== "MASUK" || m.refTipe !== "SETORAN") continue;
    isi(kunciBulan(m.tanggal)).organik += Number(m.beratKg);
  }
  for (const p of d.produksi) {
    if (p.status !== "SELESAI" || !p.tanggalSelesai) continue;
    const b = isi(kunciBulan(p.tanggalSelesai));
    b.padat += Number(p.pupukKasarAktual ?? 0);
    b.cair += Number(p.pupukCairAktual ?? 0);
  }
  for (const p of d.pengambilan) {
    if (p.status !== "POSTED") continue;
    isi(kunciBulan(p.tanggal)).jualPengepul += p.totalNilai;
  }
  for (const s of d.distribusi) {
    if (s.status === "DIBATALKAN") continue;
    const b = isi(kunciBulan(s.tanggalDistribusi));
    // SUBSIDI dipisahkan: nilainya tercatat untuk laporan, tetapi tidak
    // ada rupiah yang benar-benar diterima desa. Menjumlahkannya ke
    // penjualan akan melaporkan pemasukan yang tidak pernah ada.
    if (s.metodeBayar === "SUBSIDI") b.subsidi += s.totalNilai;
    else b.jualPupuk += s.totalNilai;
  }

  return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ bulan: k, ...v }));
}

// ============================================================== DOKUMEN

const dok = new PDFDocument({
  size: "A4",
  bufferPages: true,
  margins: { top: M, bottom: M, left: M, right: M },
  info: {
    Title: "Laporan Data dan Monitoring - AgroMukti",
    Author: "KKM Kelompok 45 - Universitas Muhammadiyah Cirebon",
    Subject: "Tangkapan layar responsif, cuplikan basis data, dan dashboard monitoring AgroMukti",
  },
});

const keluaran = path.join(process.cwd(), "docs", "Laporan Data dan Monitoring AgroMukti.pdf");

// ---------- pembantu penyusun ----------

/** Lebar isi halaman yang sedang aktif (berbeda saat halaman mendatar). */
const lebarIsi = () => dok.page.width - M * 2;

const ruang = (butuh) => {
  if (dok.y + butuh > dok.page.height - M - 24) dok.addPage();
};

const judulBab = (teks) => {
  ruang(90);
  dok.moveDown(0.6);
  dok.fillColor(TEAL).font("Helvetica-Bold").fontSize(15).text(teks, M, dok.y, { width: lebarIsi() });
  dok.moveTo(M, dok.y + 4).lineTo(M + lebarIsi(), dok.y + 4).lineWidth(1).strokeColor(TEAL).stroke();
  dok.moveDown(0.6);
};

/** `butuh` dinaikkan bila di bawah judul ada grafik, supaya judulnya
 *  tidak tertinggal sendirian di kaki halaman. */
const subJudul = (teks, butuh = 70) => {
  ruang(butuh);
  dok.moveDown(0.35);
  dok.fillColor(GELAP).font("Helvetica-Bold").fontSize(11).text(teks, M, dok.y, { width: lebarIsi() });
  dok.moveDown(0.25);
};

const p = (teks) => {
  ruang(40);
  dok.fillColor(GELAP).font("Helvetica").fontSize(9.5)
    .text(teks, M, dok.y, { width: lebarIsi(), align: "justify", lineGap: 2.5 });
  dok.moveDown(0.45);
};

const keterangan = (teks) => {
  ruang(24);
  dok.fillColor(ABU).font("Helvetica-Oblique").fontSize(8)
    .text(teks, M, dok.y, { width: lebarIsi(), lineGap: 1.5 });
  dok.moveDown(0.5);
};

const kotak = (judul, isi, warna = TEAL) => {
  const w = lebarIsi() - 32;
  dok.font("Helvetica").fontSize(8.8);
  let tinggi = 26;
  for (const t of isi) tinggi += dok.heightOfString(t, { width: w, lineGap: 2 }) + 5;
  ruang(tinggi + 16);

  const y0 = dok.y;
  dok.save();
  dok.rect(M, y0, lebarIsi(), tinggi).fill("#ffffff");
  dok.rect(M, y0, lebarIsi(), tinggi).lineWidth(0.8).strokeColor(warna).stroke();
  dok.rect(M, y0, 3.5, tinggi).fill(warna);
  dok.restore();

  let y = y0 + 9;
  dok.fillColor(warna).font("Helvetica-Bold").fontSize(9.5).text(judul, M + 16, y, { width: w });
  y = dok.y + 3;
  for (const t of isi) {
    dok.fillColor(GELAP).font("Helvetica").fontSize(8.8).text(t, M + 16, y, { width: w, lineGap: 2 });
    y = dok.y + 4;
  }
  dok.y = y0 + tinggi;
  dok.x = M;
  dok.moveDown(0.7);
};

/**
 * Tabel yang bisa berpindah halaman sambil membawa barisan kepalanya.
 * `rata` menentukan perataan tiap kolom ("kiri" atau "kanan"); angka
 * dirata-kanan supaya digit satuan, puluhan, dan ratusan sejajar.
 */
const tabel = (kepala, baris, lebar, rata = []) => {
  const tinggiKepala = 19;

  const gambarKepala = () => {
    const y = dok.y;
    dok.save().rect(M, y, lebar.reduce((a, b) => a + b, 0), tinggiKepala).fill(ABU_MUDA).restore();
    let x = M;
    kepala.forEach((h, i) => {
      dok.fillColor(GELAP).font("Helvetica-Bold").fontSize(7.6)
        .text(h, x + 6, y + 5.5, { width: lebar[i] - 12, align: rata[i] === "kanan" ? "right" : "left" });
      x += lebar[i];
    });
    dok.y = y + tinggiKepala;
  };

  ruang(tinggiKepala * 4);
  gambarKepala();
  let y = dok.y;

  for (const r of baris) {
    let tinggi = 17;
    dok.font("Helvetica").fontSize(7.8);
    r.forEach((c, i) => {
      const h = dok.heightOfString(String(c), { width: lebar[i] - 12 }) + 10;
      if (h > tinggi) tinggi = h;
    });

    if (y + tinggi > dok.page.height - M - 24) {
      dok.addPage();
      dok.y = M;
      gambarKepala();
      y = dok.y;
    }

    let x = M;
    r.forEach((c, i) => {
      dok.fillColor(GELAP).font("Helvetica").fontSize(7.8)
        .text(String(c), x + 6, y + 5, { width: lebar[i] - 12, align: rata[i] === "kanan" ? "right" : "left" });
      x += lebar[i];
    });
    dok.moveTo(M, y + tinggi).lineTo(M + lebar.reduce((a, b) => a + b, 0), y + tinggi)
      .lineWidth(0.4).strokeColor(GARIS).stroke();
    y += tinggi;
  }

  dok.y = y;
  dok.x = M;
  dok.moveDown(0.8);
};

/** Batang dengan ujung atas membulat, dasarnya tetap rata di garis nol. */
function batang(x, yAtas, w, h, warna) {
  if (h <= 0.5) return;
  const r = Math.min(3, w / 2, h);
  dok.save().fillColor(warna);
  dok.moveTo(x, yAtas + h)
    .lineTo(x, yAtas + r)
    .quadraticCurveTo(x, yAtas, x + r, yAtas)
    .lineTo(x + w - r, yAtas)
    .quadraticCurveTo(x + w, yAtas, x + w, yAtas + r)
    .lineTo(x + w, yAtas + h)
    .closePath().fill();
  dok.restore();
}

/**
 * Menentukan langkah dan batas atas sumbu yang angkanya enak dibaca.
 *
 * Membulatkan batas atas saja tidak cukup: batas 250 dibagi empat
 * menghasilkan label 63, 125, 188 - benar secara hitungan tetapi tidak
 * ada orang yang membaca sumbu seperti itu. Yang dibulatkan adalah
 * LANGKAHNYA, lalu jumlah garis bantu menyesuaikan.
 */
function sumbuRapi(maks) {
  if (maks <= 0) return { batas: 1, langkah: 1, garis: 1 };
  const kasar = maks / 4;
  const pangkat = Math.pow(10, Math.floor(Math.log10(kasar)));
  const langkah = [1, 2, 2.5, 5, 10].map((k) => k * pangkat).find((v) => v >= kasar) ?? 10 * pangkat;
  const garis = Math.ceil(maks / langkah);
  return { batas: langkah * garis, langkah, garis };
}

/**
 * Grafik batang berkelompok.
 *
 * SATU SUMBU SAJA. Ukuran dengan satuan berbeda (kg dan liter) TIDAK
 * pernah ditumpuk di grafik yang sama walau muat - sumbu ganda membuat
 * dua besaran yang tak sebanding tampak bisa dibandingkan. Kalau
 * satuannya beda, panggil fungsi ini dua kali.
 */
function grafik({ kategori, seri, formatSumbu, formatLabel, tinggi = 150, satuan }) {
  const lebarTotal = lebarIsi();
  const kiri = 52;
  const bawahLabel = 26;
  const atasLegenda = seri.length > 1 ? 18 : 0;

  ruang(tinggi + bawahLabel + atasLegenda + 24);

  const y0 = dok.y;

  // --- legenda (selalu ada bila serinya lebih dari satu) ---
  if (seri.length > 1) {
    let x = M + kiri;
    for (const s of seri) {
      dok.save().fillColor(s.warna).rect(x, y0 + 4, 8, 8).fill().restore();
      dok.fillColor(ABU).font("Helvetica").fontSize(7.8).text(s.nama, x + 12, y0 + 4.5, { width: 200 });
      x += 12 + dok.widthOfString(s.nama) + 22;
    }
  }

  const yPlotAtas = y0 + atasLegenda;
  const yNol = yPlotAtas + tinggi;
  const lebarPlot = lebarTotal - kiri;

  const semua = seri.flatMap((s) => s.nilai);
  const { batas, langkah, garis } = sumbuRapi(Math.max(...semua, 0));

  // --- garis bantu mendatar, sengaja tipis dan pucat ---
  for (let i = 0; i <= garis; i++) {
    const nilai = langkah * i;
    const y = yNol - (nilai / batas) * tinggi;
    dok.save().moveTo(M + kiri, y).lineTo(M + lebarTotal, y)
      .lineWidth(i === 0 ? 0.8 : 0.4).strokeColor(i === 0 ? "#cbd5e1" : GARIS).stroke().restore();
    dok.fillColor(ABU).font("Helvetica").fontSize(6.8)
      .text(formatSumbu(nilai), M, y - 3.5, { width: kiri - 8, align: "right" });
  }

  // --- batang ---
  const lebarSlot = lebarPlot / kategori.length;
  const jarakDalam = 2; // 2pt pemisah antar batang sekelompok
  const lebarKelompok = Math.min(lebarSlot * 0.62, 44);
  const lebarBatang = (lebarKelompok - jarakDalam * (seri.length - 1)) / seri.length;

  // Label langsung hanya pada nilai tertinggi tiap seri - menempelkan
  // angka di setiap batang membuat grafik jadi tabel yang sulit dibaca.
  const puncak = seri.map((s) => s.nilai.indexOf(Math.max(...s.nilai)));

  kategori.forEach((k, i) => {
    const xTengah = M + kiri + lebarSlot * i + lebarSlot / 2;
    let x = xTengah - lebarKelompok / 2;

    seri.forEach((s, j) => {
      const nilai = s.nilai[i] ?? 0;
      const h = (nilai / batas) * tinggi;
      batang(x, yNol - h, lebarBatang, h, s.warna);

      if (puncak[j] === i && nilai > 0) {
        dok.fillColor(ABU).font("Helvetica-Bold").fontSize(6.6)
          .text(formatLabel(nilai), x - 12, yNol - h - 9, { width: lebarBatang + 24, align: "center" });
      }
      x += lebarBatang + jarakDalam;
    });

    dok.fillColor(ABU).font("Helvetica").fontSize(7)
      .text(k, xTengah - lebarSlot / 2, yNol + 5, { width: lebarSlot, align: "center" });
  });

  dok.y = yNol + bawahLabel;
  dok.x = M;
  if (satuan) {
    dok.fillColor(ABU).font("Helvetica-Oblique").fontSize(7.5).text(satuan, M, dok.y, { width: lebarTotal });
    dok.moveDown(0.2);
  }
  dok.moveDown(0.5);
}

/** Menempatkan gambar di halaman mendatar sendiri, sebesar mungkin. */
function halamanGambar(berkas, judul, ket) {
  dok.addPage({ size: "A4", layout: "landscape", margins: { top: M, bottom: M, left: M, right: M } });
  dok.fillColor(TEAL).font("Helvetica-Bold").fontSize(12).text(judul, M, M, { width: lebarIsi() });
  dok.fillColor(ABU).font("Helvetica").fontSize(8.5).text(ket, M, dok.y + 2, { width: lebarIsi() });

  const yGambar = dok.y + 10;
  const tinggiTersedia = dok.page.height - yGambar - M - 16;
  dok.image(berkas, M, yGambar, { fit: [lebarIsi(), tinggiTersedia], align: "center" });
}

// ================================================================= ISI

async function main() {
  const d = await ambilData();
  const bulanan = rekapBulanan(d);
  const dirGambar = path.join(process.cwd(), "docs", "tangkapan-layar");

  const wajibAda = ["produksi-dekstop.png", "produksi-ponsel.png", "umkm-dekstop.png", "umkm-ponsel.png"];
  const hilang = wajibAda.filter((f) => !fs.existsSync(path.join(dirGambar, f)));
  if (hilang.length) {
    throw new Error(
      `Tangkapan layar belum ada: ${hilang.join(", ")}.\n` +
        "Jalankan \"npm run dev\" lalu \"npm run docs:tangkapan\" lebih dulu.",
    );
  }

  dok.pipe(fs.createWriteStream(keluaran));

  // ---------------------------------------------------------- sampul
  dok.moveDown(5);
  dok.fillColor(ABU).font("Helvetica-Bold").fontSize(11)
    .text("LAPORAN DATA DAN MONITORING", { align: "center", characterSpacing: 1.5 });
  dok.moveDown(0.5);
  dok.fillColor(TEAL).font("Helvetica-Bold").fontSize(29).text("AgroMukti", { align: "center" });
  dok.moveDown(0.3);
  dok.fillColor(GELAP).font("Helvetica").fontSize(12)
    .text("Sistem Informasi Terpadu Desa Argamukti", { align: "center" });
  dok.moveDown(1.8);
  dok.fillColor(GELAP).font("Helvetica").fontSize(9.5).text(
    "Tampilan responsif, cuplikan basis data, dan dashboard monitoring",
    { align: "center" },
  );
  dok.moveDown(3);

  const total = {
    anorganik: bulanan.reduce((a, b) => a + b.anorganik, 0),
    organik: bulanan.reduce((a, b) => a + b.organik, 0),
    padat: bulanan.reduce((a, b) => a + b.padat, 0),
    cair: bulanan.reduce((a, b) => a + b.cair, 0),
    jual: bulanan.reduce((a, b) => a + b.jualPengepul + b.jualPupuk, 0),
    subsidi: bulanan.reduce((a, b) => a + b.subsidi, 0),
  };

  dok.fillColor(GELAP).font("Helvetica").fontSize(10)
    .text("Kuliah Kerja Mahasiswa Kelompok 45", { align: "center" });
  dok.moveDown(0.3);
  dok.text("Universitas Muhammadiyah Cirebon - 2026", { align: "center" });
  dok.moveDown(0.3);
  dok.fillColor(ABU).text("Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka", { align: "center" });
  dok.moveDown(3);
  dok.fillColor(ABU).font("Helvetica-Oblique").fontSize(8.5).text(
    `Dokumen dibangkitkan ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })} ` +
      `dari basis data ${bulanan.length ? `periode ${labelBulan(bulanan[0].bulan).replace("\n", " ")} - ${labelBulan(bulanan.at(-1).bulan).replace("\n", " ")}` : ""}`,
    { align: "center" },
  );

  // ------------------------------------------------- 1. Cakupan data
  dok.addPage();
  judulBab("1. Cakupan dan Sumber Data");

  p("Dokumen ini merangkum keadaan sistem AgroMukti pada saat dibangkitkan. Seluruh angka, tabel, dan grafik dibaca langsung dari basis data sistem melalui skrip docs/buat-laporan-data.mjs - tidak ada satu angka pun yang diketik ulang dengan tangan. Bila datanya bertambah, dokumen ini cukup dibangkitkan ulang dan isinya ikut menyesuaikan.");

  tabel(
    ["Yang dilaporkan", "Sumber di basis data", "Jumlah baris"],
    [
      ["Data warga", "Warga, ditautkan ke Nasabah dan Petani", String(d.warga.length)],
      ["Timbangan sampah organik", "MutasiSampahOrganik (buku besar bahan baku)", String(d.mutasiOrganik.length)],
      ["Stok pupuk", "ProdukPupuk + MutasiStokPupuk", String(d.produkPupuk.length)],
      ["Penjualan sampah ke pengepul", "PengambilanPengepul", String(d.pengambilan.length)],
      ["Penyaluran pupuk ke petani", "DistribusiPupuk", String(d.distribusi.length)],
      ["Batch produksi pupuk", "ProduksiPupuk", String(d.produksi.length)],
      ["Produk UMKM", "ProdukUmkm", String(d.produkUmkm.length)],
    ],
    [140, 250, 109],
    ["kiri", "kiri", "kanan"],
  );

  subJudul("Ringkasan seluruh periode");
  tabel(
    ["Ukuran", "Nilai"],
    [
      ["Sampah anorganik terkumpul (bank sampah)", `${kg(total.anorganik)} kg`],
      ["Sampah organik terkumpul (bahan baku pupuk)", `${kg(total.organik)} kg`],
      ["Kompos padat diproduksi", `${kg(total.padat)} kg`],
      ["Pupuk cair diproduksi", `${kg(total.cair)} liter`],
      ["Penjualan (sampah ke pengepul + pupuk berbayar)", rp(total.jual)],
      ["Nilai pupuk bersubsidi (dicatat, bukan pemasukan)", rp(total.subsidi)],
    ],
    [340, 159],
    ["kiri", "kanan"],
  );

  kotak("Data ini sebagian besar data contoh", [
    "Sebelum serah terima, isi basis data masih berupa data contoh yang dibuat untuk menguji sistem dan menyiapkan dokumentasi seperti ini. Nomor Induk Kependudukan sengaja TIDAK diisi sama sekali, dan nomor telepon disamarkan empat digit terakhirnya di seluruh tabel dokumen ini.",
    "Data contoh dibuat lewat skrip prisma/isi-data-contoh.ts yang memakai jalur pencatatan yang sama dengan petugas - jadi buku besar tabungan, kas, stok pupuk, dan stok organik tetap seimbang, bukan angka yang ditempelkan langsung ke tabel.",
    "Saat sistem mulai dipakai dengan data sungguhan, catatan contoh ini perlu dibersihkan lebih dulu.",
  ], MERAH);

  // ------------------------------------- 2. Tampilan responsif
  dok.addPage();
  judulBab("2. Tampilan Responsif");

  p("Halaman yang sama ditampilkan pada dua ukuran layar: komputer meja lebar 1440 piksel dan ponsel lebar 390 piksel (setara iPhone 14). Tata letaknya tidak dipisah menjadi dua versi situs - satu halaman yang sama menyusun ulang dirinya mengikuti lebar layar.");

  subJudul("Yang berubah saat layar menyempit");
  tabel(
    ["Bagian", "Di layar lebar", "Di layar ponsel"],
    [
      ["Menu samping", "Selalu terlihat di kiri", "Tersembunyi, dibuka lewat tombol tiga garis"],
      ["Kartu ringkasan", "Empat kartu sebaris", "Menumpuk satu per baris"],
      ["Tabel data", "Seluruh kolom muat", "Digulir mendatar di dalam kartunya sendiri"],
      ["Tombol tindakan", "Sebaris dengan judul", "Turun ke bawah judul, teksnya melipat"],
    ],
    [95, 190, 214],
  );

  keterangan("Tangkapan layar diambil otomatis dengan npm run docs:tangkapan, memakai peramban sungguhan pada ukuran layar di atas. Lencana perkakas pengembang Next.js disembunyikan karena tidak ada pada versi yang diakses warga.");

  halamanGambar(
    path.join(dirGambar, "produksi-dekstop.png"),
    "2.1  Produksi Pupuk - tampilan komputer meja (1440 x 900)",
    "Halaman /produksi. Empat kartu ringkasan sebaris, tabel batch produksi tampil utuh tanpa perlu digulir.",
  );
  halamanGambar(
    path.join(dirGambar, "umkm-dekstop.png"),
    "2.2  Produk UMKM - tampilan komputer meja (1440 x 900)",
    "Halaman /umkm. Daftar produk olahan warga beserta harga, stok, dan status ketersediaannya.",
  );

  // Dua tangkapan ponsel disandingkan pada satu halaman tegak supaya
  // perbandingannya langsung terlihat tanpa membalik halaman.
  dok.addPage();
  dok.fillColor(TEAL).font("Helvetica-Bold").fontSize(12)
    .text("2.3  Tampilan ponsel (390 x 844)", M, M, { width: L });
  dok.fillColor(ABU).font("Helvetica").fontSize(8.5).text(
    "Layar ponsel apa adanya, bukan gulungan penuh - inilah yang benar-benar terlihat saat halaman dibuka.",
    M, dok.y + 2, { width: L },
  );

  // Ukurannya dibatasi DUA arah sekaligus. Kalau hanya dihitung dari
  // tinggi yang tersedia, dua gambar setinggi halaman jadi lebih lebar
  // daripada kertasnya dan saling bertindih.
  const RASIO_PONSEL = 390 / 844;
  const SELA = 16;
  const yPonsel = dok.y + 14;
  const tinggiTersedia = TINGGI_A4 - yPonsel - M - 34;
  const lebarPonsel = Math.min((L - SELA * 3) / 2, tinggiTersedia * RASIO_PONSEL);
  const tinggiPonsel = lebarPonsel / RASIO_PONSEL;
  const kiriPonsel = M + (L - (lebarPonsel * 2 + SELA)) / 2;

  [
    ["produksi-ponsel.png", "Produksi Pupuk", kiriPonsel],
    ["umkm-ponsel.png", "Produk UMKM", kiriPonsel + lebarPonsel + SELA],
  ].forEach(([berkas, nama, x]) => {
    dok.image(path.join(dirGambar, berkas), x, yPonsel, { fit: [lebarPonsel, tinggiPonsel] });
    dok.save().rect(x, yPonsel, lebarPonsel, tinggiPonsel).lineWidth(0.6).strokeColor("#cbd5e1").stroke().restore();
    dok.fillColor(ABU).font("Helvetica-Bold").fontSize(8)
      .text(nama, x, yPonsel + tinggiPonsel + 7, { width: lebarPonsel, align: "center" });
  });

  // ------------------------------------------- 3. Cuplikan basis data
  dok.addPage();
  judulBab("3. Cuplikan Basis Data");

  subJudul("3.1  Data warga");
  p("Warga adalah satu-satunya sumber identitas di AgroMukti. Seorang warga bisa menjadi nasabah bank sampah, petani, atau keduanya - tanpa datanya diketik dua kali. Kolom peran di bawah memperlihatkan tautan itu.");
  tabel(
    ["Nama", "Dusun", "RT/RW", "No. HP", "Rekening bank sampah", "Kode petani"],
    d.warga.map((w) => {
      const n = w.nasabah.find((x) => x.status === "AKTIF") ?? w.nasabah[0];
      const t = w.petani.find((x) => x.status === "AKTIF") ?? w.petani[0];
      return [
        w.nama,
        w.dusun ?? "-",
        w.rt || w.rw ? `${w.rt ?? "-"}/${w.rw ?? "-"}` : "-",
        hp(w.noHp),
        n ? `${n.kode} (${rp(n.saldo)})` : "-",
        t ? `${t.kode}${t.kelompokTani ? `\n${t.kelompokTani}` : ""}` : "-",
      ];
    }),
    [104, 74, 40, 68, 110, 103],
  );
  keterangan("Kolom NIK tidak ditampilkan karena memang belum diisi - lihat catatan pada bab 1. Empat digit terakhir nomor telepon disamarkan.");

  // Pemeriksaan mutu data dijalankan di sini, bukan ditulis tangan,
  // supaya laporan ini menunjuk sendiri barisnya yang perlu dibereskan
  // dan tidak menua menjadi catatan yang sudah tidak berlaku.
  const petaGanda = new Map();
  for (const w of d.warga) {
    const kunci = `${w.nama.trim().toLowerCase()}|${(w.dusun ?? "").trim().toLowerCase()}`;
    petaGanda.set(kunci, (petaGanda.get(kunci) ?? 0) + 1);
  }
  const ganda = [...petaGanda.entries()].filter(([, n]) => n > 1);

  if (ganda.length > 0) {
    kotak("Ditemukan kemungkinan data warga ganda", [
      ganda
        .map(([k, n]) => {
          const [nama, dusun] = k.split("|");
          return `${nama.replace(/\b\w/g, (c) => c.toUpperCase())} (${dusun || "tanpa dusun"}) tercatat ${n} kali`;
        })
        .join("; ") + ".",
      "Satu orang yang tercatat dua kali berarti dua rekening terpisah, dan setoran maupun saldonya terbagi ke keduanya. Gabungkan lebih dulu lewat menu Data Warga sebelum sistem dipakai dengan data sungguhan.",
    ], MERAH);
  }

  subJudul("3.2  Data timbangan sampah organik");
  p("Sampah organik dicatat sebagai buku besar, bukan satu angka yang ditimpa setiap ada perubahan. MASUK berarti sampah baru masuk gudang bahan baku, KELUAR berarti bahan dipakai untuk batch produksi, dan setiap baris menyimpan asal-usulnya. Dengan begitu stok yang janggal selalu bisa ditelusuri sampai ke transaksinya.");

  const stokOrganik = d.mutasiOrganik.reduce(
    (a, m) => (m.arah === "KELUAR" ? a - Number(m.beratKg) : a + Number(m.beratKg)), 0,
  );
  kotak("Stok bahan baku saat ini", [
    `${kg(stokOrganik)} kg - dihitung dari seluruh ${d.mutasiOrganik.length} baris mutasi di bawah, bukan dari angka yang disimpan terpisah.`,
  ]);

  tabel(
    ["Tanggal", "Arah", "Berat (kg)", "Asal / tujuan", "Keterangan"],
    d.mutasiOrganik.map((m) => [
      tglSingkat(m.tanggal),
      m.arah,
      kg(m.beratKg),
      m.sumber ?? "-",
      m.keterangan ?? "-",
    ]),
    [58, 48, 52, 172, 169],
    ["kiri", "kiri", "kanan", "kiri", "kiri"],
  );

  subJudul("3.3  Data stok pupuk");
  p("Stok pupuk juga berupa buku besar. Angka stok pada kolom terakhir adalah salinan cepat untuk ditampilkan di layar; kebenarannya ada pada jumlah mutasi masuk dikurangi mutasi keluar, dan keduanya dicocokkan lewat menu rekonsiliasi.");

  const petaStok = new Map();
  for (const m of d.mutasiStok) {
    const k = petaStok.get(m.produkPupukId) ?? { MASUK: 0, KELUAR: 0, PENYESUAIAN: 0 };
    k[m.arah] = Number(m._sum.jumlah ?? 0);
    petaStok.set(m.produkPupukId, k);
  }

  tabel(
    ["Kode", "Nama produk", "Jenis", "Harga", "Masuk", "Keluar", "Stok kini"],
    d.produkPupuk.map((pp) => {
      const m = petaStok.get(pp.id) ?? { MASUK: 0, KELUAR: 0 };
      const s = pp.satuan.toLowerCase();
      return [
        pp.kode,
        pp.nama,
        pp.jenis === "KOMPOS_PADAT" ? "Kompos padat" : "Pupuk cair",
        `${rp(pp.harga)}/${s}`,
        `${kg(m.MASUK)} ${s}`,
        `${kg(m.KELUAR)} ${s}`,
        `${kg(pp.stok)} ${s}`,
      ];
    }),
    [66, 128, 68, 76, 56, 56, 49],
    ["kiri", "kiri", "kiri", "kanan", "kanan", "kanan", "kanan"],
  );

  subJudul("3.4  Data penjualan");
  p("Ada dua aliran uang yang berbeda dan keduanya perlu dibaca terpisah. Yang pertama adalah penjualan sampah anorganik ke pengepul - inilah sumber pemasukan bank sampah, yang seluruh nilainya dibagi ke tabungan warga penyetor menurut berat setorannya. Yang kedua adalah penyaluran pupuk ke petani.");

  tabel(
    ["Nomor", "Tanggal", "Pengepul", "Berat (kg)", "Dibayar", "Rp/kg"],
    d.pengambilan.map((g) => [
      g.nomor,
      tglSingkat(g.tanggal),
      g.pengepul.nama,
      kg(g.totalBeratKg),
      rp(g.totalNilai),
      Number(g.totalBeratKg) > 0 ? rp(Math.round(g.totalNilai / Number(g.totalBeratKg))) : "-",
    ]),
    [92, 60, 116, 58, 90, 83],
    ["kiri", "kiri", "kiri", "kanan", "kanan", "kanan"],
  );

  p("Penyaluran pupuk memakai tiga cara bayar yang perlakuan akuntansinya berbeda. SALDO memotong tabungan bank sampah petani dan tidak menambah kas, karena tidak ada uang tunai yang bergerak - yang berkurang adalah kewajiban bank sampah kepada warga. TUNAI menambah kas. SUBSIDI hanya mencatat nilainya untuk laporan, tanpa menagih siapa pun.");

  tabel(
    ["Nomor", "Tanggal", "Petani", "Pupuk", "Cara bayar", "Nilai", "Status"],
    d.distribusi.map((s) => [
      s.nomor,
      tglSingkat(s.tanggalDistribusi),
      s.permintaan?.petani?.warga?.nama ?? "-",
      s.detail.map((x) => `${x.produkPupuk.nama} ${kg(x.jumlah)} ${x.produkPupuk.satuan.toLowerCase()}`).join("\n") || "-",
      s.metodeBayar,
      rp(s.totalNilai),
      s.status,
    ]),
    // Kolom status dilebarkan agar "DIBATALKAN" dan "DITERIMA" muat
    // dalam satu baris - kata status yang terpenggal jadi "DITERI / MA"
    // membuat tabel terbaca seperti salah cetak.
    [78, 52, 80, 113, 50, 62, 64],
    ["kiri", "kiri", "kiri", "kiri", "kiri", "kanan", "kiri"],
  );

  subJudul("3.5  Produk UMKM");
  tabel(
    ["Kode", "Nama produk", "Kategori", "Harga", "Stok", "Status"],
    d.produkUmkm.map((u) => [
      u.kode, u.nama, u.kategori ?? "-", rp(u.harga),
      `${kg(u.stok)} ${u.satuan.toLowerCase()}`, u.status,
    ]),
    [64, 150, 96, 72, 64, 53],
    ["kiri", "kiri", "kiri", "kanan", "kanan", "kiri"],
  );
  kotak("Yang belum ada: pencatatan transaksi penjualan UMKM", [
    "Modul UMKM saat ini baru menyimpan katalog produk - nama, harga, dan sisa stok. Belum ada tabel transaksi penjualannya, sehingga UMKM tidak bisa ikut masuk ke grafik penjualan pada bab 4. Angka penjualan di dokumen ini murni dari penjualan sampah ke pengepul dan penyaluran pupuk ke petani.",
    "Bila desa ingin omzet UMKM ikut terpantau, perlu ditambahkan pencatatan penjualan per transaksi - bukan sekadar mengurangi angka stok, karena stok yang berkurang tidak memberi tahu kapan dan berapa harga jualnya.",
  ], MERAH);

  // ------------------------------------------- 4. Dashboard monitoring
  dok.addPage();
  judulBab("4. Dashboard Monitoring");

  p("Tiga grafik berikut menjawab tiga pertanyaan yang paling sering diajukan saat rapat desa: berapa banyak sampah yang berhasil dikumpulkan, berapa pupuk yang jadi, dan berapa uang yang masuk. Semuanya per bulan, memakai sumbu bulan yang sama sehingga bisa dibaca berurutan.");

  const label = bulanan.map((b) => labelBulan(b.bulan));

  subJudul("4.1  Total sampah terkumpul per bulan", 250);
  grafik({
    kategori: label,
    seri: [
      { nama: "Sampah anorganik (bank sampah)", warna: SERI_A, nilai: bulanan.map((b) => b.anorganik) },
      { nama: "Sampah organik (bahan baku pupuk)", warna: SERI_B, nilai: bulanan.map((b) => b.organik) },
    ],
    formatSumbu: (v) => Math.round(v).toLocaleString("id-ID"),
    formatLabel: (v) => kg(v),
    satuan: "Sumbu tegak dalam kilogram. Angka yang ditulis hanya pada bulan tertinggi tiap jenis; rinciannya ada di tabel bawah.",
  });

  tabel(
    ["Bulan", "Anorganik (kg)", "Organik (kg)", "Jumlah (kg)"],
    bulanan.map((b) => [
      labelBulan(b.bulan).replace("\n", " "),
      kg(b.anorganik), kg(b.organik), kg(b.anorganik + b.organik),
    ]).concat([["TOTAL", kg(total.anorganik), kg(total.organik), kg(total.anorganik + total.organik)]]),
    [140, 120, 120, 119],
    ["kiri", "kanan", "kanan", "kanan"],
  );

  keterangan("Sampah anorganik jauh lebih ringan daripada organik karena memang berbeda sifatnya: botol dan plastik menumpuk besar tetapi ringan, sedangkan sisa sayur dan daun berat. Perbandingan beratnya bukan ukuran keberhasilan salah satu program.");

  subJudul("4.2  Total pupuk yang diproduksi per bulan", 130);
  p("Kompos padat ditimbang dalam kilogram dan pupuk cair diukur dalam liter. Keduanya sengaja digambar pada dua grafik terpisah, bukan disatukan dalam satu grafik dengan dua sumbu - kilogram dan liter tidak sebanding, dan menyandingkannya pada satu sumbu akan membuat pembaca menyimpulkan perbandingan yang sebenarnya tidak ada.");

  grafik({
    kategori: label,
    seri: [{ nama: "Kompos padat", warna: SERI_A, nilai: bulanan.map((b) => b.padat) }],
    formatSumbu: (v) => Math.round(v).toLocaleString("id-ID"),
    formatLabel: (v) => kg(v),
    tinggi: 118,
    satuan: "Kompos padat, kilogram. Dihitung pada bulan batch DIPANEN, bukan bulan batch dimulai.",
  });

  grafik({
    kategori: label,
    seri: [{ nama: "Pupuk cair", warna: SERI_B, nilai: bulanan.map((b) => b.cair) }],
    formatSumbu: (v) => Math.round(v).toLocaleString("id-ID"),
    formatLabel: (v) => kg(v),
    tinggi: 118,
    satuan: "Pupuk cair, liter. Bulan tanpa batang berarti tidak ada batch yang selesai pada bulan itu.",
  });

  tabel(
    ["Bulan", "Bahan baku dipakai (kg)", "Kompos padat (kg)", "Pupuk cair (liter)"],
    bulanan.map((b) => {
      const bahan = d.produksi
        .filter((x) => x.status === "SELESAI" && x.tanggalSelesai && kunciBulan(x.tanggalSelesai) === b.bulan)
        .reduce((a, x) => a + Number(x.beratSampahOrganik), 0);
      return [labelBulan(b.bulan).replace("\n", " "), kg(bahan), kg(b.padat), kg(b.cair)];
    }).concat([["TOTAL", "", kg(total.padat), kg(total.cair)]]),
    [110, 150, 120, 119],
    ["kiri", "kanan", "kanan", "kanan"],
  );

  subJudul("4.3  Total penjualan per bulan", 250);
  grafik({
    kategori: label,
    seri: [
      { nama: "Sampah anorganik ke pengepul", warna: SERI_A, nilai: bulanan.map((b) => b.jualPengepul) },
      { nama: "Pupuk ke petani (tunai + saldo)", warna: SERI_B, nilai: bulanan.map((b) => b.jualPupuk) },
    ],
    formatSumbu: (v) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : String(Math.round(v))),
    formatLabel: (v) => rp(v),
    satuan: "Sumbu tegak dalam rupiah (rb = ribu). Pupuk bersubsidi TIDAK dihitung di sini karena tidak ada uang yang diterima.",
  });

  tabel(
    ["Bulan", "Ke pengepul", "Pupuk berbayar", "Jumlah penjualan", "Pupuk subsidi"],
    bulanan.map((b) => [
      labelBulan(b.bulan).replace("\n", " "),
      rp(b.jualPengepul), rp(b.jualPupuk), rp(b.jualPengepul + b.jualPupuk), rp(b.subsidi),
    ]).concat([[
      "TOTAL",
      rp(bulanan.reduce((a, b) => a + b.jualPengepul, 0)),
      rp(bulanan.reduce((a, b) => a + b.jualPupuk, 0)),
      rp(total.jual),
      rp(total.subsidi),
    ]]),
    [78, 105, 105, 110, 101],
    ["kiri", "kanan", "kanan", "kanan", "kanan"],
  );

  kotak("Cara membaca kolom pupuk subsidi", [
    "Kolom terakhir bukan pemasukan. Itu nilai pupuk yang diberikan cuma-cuma kepada petani, dicatat supaya desa tahu berapa besar bantuan yang sudah disalurkan. Menjumlahkannya ke kolom penjualan akan melaporkan uang masuk yang tidak pernah ada.",
  ]);

  // --------------------------------------------------- 5. Keterbatasan
  dok.addPage();
  judulBab("5. Batas Keberlakuan Laporan Ini");

  p("Beberapa hal perlu diketahui pembaca supaya angka di atas tidak ditafsirkan melebihi yang sebenarnya ditanggung datanya.");

  tabel(
    ["Hal", "Keadaannya"],
    [
      ["Sumber data", "Sebagian besar masih data contoh, bukan catatan lapangan. Perlu dibersihkan sebelum sistem dipakai sungguhan."],
      ["Penjualan UMKM", "Belum ada pencatatan transaksinya, jadi belum bisa masuk grafik penjualan."],
      ["Batch produksi gagal", "Grafik 4.2 hanya menghitung batch berstatus SELESAI. Bahan baku yang habis pada batch gagal tidak muncul di grafik hasil."],
      ["Rasio estimasi pupuk", "Rendemen 31 persen dan 0,09 liter per kg adalah setelan sementara, bukan hasil pengukuran di Argamukti. Lihat dokumen Perhitungan Produksi Pupuk."],
      ["Dosis pupuk per hektare", "Angka anjuran di modul pertanian masih perkiraan awal dan perlu disesuaikan dengan anjuran penyuluh setempat."],
    ],
    [120, 379],
  );

  p("Dokumen ini dibangkitkan ulang dengan perintah npm run docs:laporan. Bila tampilan halaman berubah, jalankan npm run docs:tangkapan lebih dulu supaya tangkapan layarnya ikut diperbarui.");

  // ------------------------------------------------- nomor halaman
  const rentang = dok.bufferedPageRange();
  for (let i = 0; i < rentang.count; i++) {
    dok.switchToPage(i);
    if (i === 0) continue;

    // Catatan kaki ditulis DI BAWAH margin bawah. Tanpa menurunkan
    // margin sementara, PDFKit menganggap tulisan ini meluber dari
    // halaman lalu membuat halaman baru untuk menampungnya - satu
    // halaman kosong per catatan kaki, dan nomor halamannya jadi kacau.
    const bawah = dok.page.margins.bottom;
    dok.page.margins.bottom = 0;
    dok.fillColor(ABU).font("Helvetica").fontSize(7.5);
    dok.text(
      `AgroMukti - Laporan Data dan Monitoring          ${i + 1}`,
      M, dok.page.height - 32,
      { width: dok.page.width - M * 2, align: "center", lineBreak: false },
    );
    dok.page.margins.bottom = bawah;
  }

  dok.end();

  // Ringkasan ke layar supaya angkanya bisa dicek sekilas tanpa membuka PDF.
  console.log("Rekap bulanan yang masuk ke grafik:");
  console.table(
    bulanan.map((b) => ({
      bulan: b.bulan,
      anorganik_kg: b.anorganik,
      organik_kg: b.organik,
      padat_kg: b.padat,
      cair_l: b.cair,
      jual_pengepul: b.jualPengepul,
      jual_pupuk: b.jualPupuk,
      subsidi: b.subsidi,
    })),
  );
  console.log(`\nTersimpan: ${keluaran}`);
}

main()
  .catch((e) => {
    console.error(`\nGagal: ${e.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

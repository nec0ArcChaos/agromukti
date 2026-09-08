/**
 * Pembangkit dua Berita Acara Serah Terima (.docx):
 *   1. Bank Sampah
 *   2. Produksi Pupuk dan Produk UMKM
 *
 * MENGAPA DIBANGKITKAN, BUKAN DIKETIK
 * Berita acara memuat posisi data pada saat serah terima - jumlah
 * rekening, kewajiban tabungan kepada warga, sisa stok pupuk. Angka
 * seperti itu berubah setiap hari. Kalau diketik tangan, berita acara
 * yang dicetak minggu depan akan memuat angka minggu lalu tanpa ada yang
 * menyadarinya. Di sini angkanya dibaca langsung dari basis data saat
 * dokumen dibuat, dan tanggal pembacaannya ikut tercetak.
 *
 * YANG SENGAJA DIBIARKAN KOSONG
 * Nomor surat, hari dan tanggal, tempat, serta nama dan jabatan kedua
 * belah pihak dibiarkan bertitik-titik. Itu bukan kelalaian: yang berhak
 * menetapkannya adalah pihak desa dan kelompok KKM, bukan skrip. Berkas
 * .docx memang dimaksudkan untuk dilengkapi di Microsoft Word.
 *
 * Jalankan: npm run docs:berita
 */
import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType,
  Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAL = "0F766E";
const ABU = "64748B";
const ABU_MUDA = "F1F5F9";
const MERAH = "B91C1C";

const KOSONG = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const TANPA_GARIS = {
  top: KOSONG, bottom: KOSONG, left: KOSONG, right: KOSONG,
  insideHorizontal: KOSONG, insideVertical: KOSONG,
};

const rp = (n) => `Rp ${Number(n).toLocaleString("id-ID")}`;
const angka = (n, d = 2) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: d });

/** Titik-titik isian. Panjangnya disesuaikan dengan yang biasa ditulis. */
const titik = (n = 40) => ".".repeat(n);

// ---------------------------------------------------- pembantu penyusun

const p = (teks, { rata, ...opsi } = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 300 },
    alignment: rata ?? AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: teks, size: 22, ...opsi })],
  });

const pKaya = (...bagian) =>
  new Paragraph({
    spacing: { after: 120, line: 300 },
    alignment: AlignmentType.JUSTIFIED,
    children: bagian.map((b) =>
      Array.isArray(b)
        ? new TextRun({ text: b[0], bold: b[1] === true, italics: b[1] === "i", size: 22 })
        : new TextRun({ text: b, size: 22 }),
    ),
  });

const pasal = (nomor, judul) => [
  new Paragraph({
    spacing: { before: 280, after: 40 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `Pasal ${nomor}`, bold: true, size: 22 })],
  }),
  new Paragraph({
    spacing: { after: 140 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: judul.toUpperCase(), bold: true, size: 22 })],
  }),
];

const butir = (teks) =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 70, line: 290 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: teks, size: 21 })],
  });

const jarak = (tinggi = 200) => new Paragraph({ spacing: { after: tinggi }, children: [] });

const tabel = (kepala, baris, lebar) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: lebar,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: kepala.map((h, i) =>
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: ABU_MUDA },
            margins: { top: 70, bottom: 70, left: 110, right: 110 },
            children: [new Paragraph({
              alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
              children: [new TextRun({ text: h, bold: true, size: 19 })],
            })],
          }),
        ),
      }),
      ...baris.map((r) =>
        new TableRow({
          children: r.map((c, i) =>
            new TableCell({
              margins: { top: 70, bottom: 70, left: 110, right: 110 },
              children: [new Paragraph({
                alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
                children: [new TextRun({ text: String(c), size: 19 })],
              })],
            }),
          ),
        }),
      ),
    ],
  });

const kotak = (judul, isi, warna = TEAL) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: warna },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: warna },
      left: { style: BorderStyle.SINGLE, size: 18, color: warna },
      right: { style: BorderStyle.SINGLE, size: 6, color: warna },
      insideHorizontal: KOSONG, insideVertical: KOSONG,
    },
    rows: [new TableRow({
      children: [new TableCell({
        margins: { top: 150, bottom: 150, left: 200, right: 200 },
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: judul, bold: true, size: 21, color: warna })],
          }),
          ...isi.map((t) => new Paragraph({
            spacing: { after: 60, line: 290 },
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: t, size: 20 })],
          })),
        ],
      })],
    })],
  });

/**
 * Blok identitas: label rata kiri, titik dua sejajar, isian di kanan.
 *
 * Tata letaknya dikunci FIXED. Tanpa itu Word melebarkan kolom mengikuti
 * isi terpanjang, sehingga titik dua pada blok PIHAK PERTAMA (yang punya
 * label "NIM / Perguruan Tinggi") berdiri di tempat berbeda dengan blok
 * PIHAK KEDUA - dua daftar bersebelahan yang tidak sejajar.
 */
const identitas = (baris) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: [500, 2600, 200, 5800],
    borders: TANPA_GARIS,
    rows: baris.map(([nomor, label, isi]) =>
      new TableRow({
        children: [nomor, label, ":", isi].map((teks, i) =>
          new TableCell({
            margins: { top: 20, bottom: 20, left: 0, right: 60 },
            children: [new Paragraph({
              spacing: { after: 0, line: 280 },
              children: [new TextRun({ text: teks, size: 22, bold: i === 3 && teks !== "" && !teks.startsWith(".") })],
            })],
          }),
        ),
      }),
    ),
  });

/**
 * Ruang tanda tangan dua pihak, berdampingan.
 *
 * Judul boleh memuat "\n" untuk berganti baris. Di dalam .docx, "\n"
 * pada sebuah TextRun TIDAK memutus baris - Word hanya mengabaikannya,
 * sehingga "PIHAK PERTAMA" dan nama lembaganya akan menempel jadi satu
 * baris panjang. Karena itu teksnya dipecah menjadi paragraf sendiri.
 *
 * Nama terang ditulis di dalam tanda kurung, bukan digarisbawahi. Garis
 * bawah pada sel tabel selalu selebar selnya, sehingga nama pendek
 * seperti "Aedin" mendapat garis sepanjang setengah halaman sementara
 * titik-titik isian di sebelahnya tidak bergaris sama sekali - dua sisi
 * yang tampak tidak sepadan. Tanda kurung terbaca sama rapi baik sudah
 * terisi maupun belum.
 */
const tandaTangan = (kiriJudul, kiriNama, kananJudul, kananNama) => {
  const selKepala = (t) =>
    new TableCell({
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: t.split("\n").map((baris, i) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0, line: 280 },
          children: [new TextRun({ text: baris, size: i === 0 ? 22 : 20, color: i === 0 ? "000000" : ABU })],
        }),
      ),
    });

  const selNama = (t) =>
    new TableCell({
      margins: { top: 850, bottom: 40, left: 60, right: 60 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `( ${t} )`, bold: !t.startsWith("."), size: 22 })],
      })],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TANPA_GARIS,
    rows: [
      new TableRow({ cantSplit: true, children: [selKepala(kiriJudul), selKepala(kananJudul)] }),
      new TableRow({ cantSplit: true, children: [selNama(kiriNama), selNama(kananNama)] }),
    ],
  });
};

/**
 * Seluruh ruang tanda tangan sebagai SATU kesatuan yang tidak boleh
 * terbelah antar halaman.
 *
 * Word memotong tabel antar barisnya secara bebas. Akibatnya blok
 * "Mengetahui" sempat terlempar sendirian ke halaman terakhir yang
 * selebihnya kosong - halaman tanda tangan yang tampak seperti salah
 * cetak. Membungkusnya dalam satu sel tabel ber-cantSplit memaksa Word
 * memindahkan seluruh blok sekaligus bila ruangnya tidak cukup.
 */
const blokTandaTangan = (utama, mengetahui) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TANPA_GARIS,
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [
          jarak(200),
          tandaTangan(...utama),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 360, after: 0 },
            children: [new TextRun({ text: "Mengetahui,", size: 22 })],
          }),
          tandaTangan(...mengetahui),
        ],
      })],
    })],
  });

const kop = (baris1, baris2) => [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 30 },
    children: [new TextRun({ text: baris1, bold: true, size: 24, color: TEAL })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 30 },
    children: [new TextRun({ text: baris2, size: 20, color: ABU })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: "000000" } },
    children: [new TextRun({
      text: "Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka, Jawa Barat",
      size: 18, color: ABU,
    })],
  }),
];

const judulDokumen = (baris) => [
  ...baris.map((t, i) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: i === baris.length - 1 ? 60 : 30, before: i === 0 ? 120 : 0 },
    children: [new TextRun({ text: t, bold: true, size: i === 0 ? 26 : 24, allCaps: true })],
  })),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: `Nomor: ${titik(12)} / BA / KKM-45 / ${titik(4)} / 2026`, size: 22 })],
  }),
];

const pembukaan = () => [
  pKaya(
    "Pada hari ini ", [titik(18)], ", tanggal ", [titik(14)], " bulan ", [titik(14)],
    " tahun dua ribu dua puluh enam, bertempat di ", [titik(34)], ", yang bertanda tangan di bawah ini:",
  ),
  jarak(60),
];

const pihak = (nomorUrut, sebutan, isian) => [
  identitas([
    [`${nomorUrut}.`, "Nama", isian.nama],
    ["", "Jabatan", isian.jabatan],
    ["", isian.labelKetiga, isian.isiKetiga],
    ["", "Alamat", isian.alamat],
  ]),
  new Paragraph({
    spacing: { before: 60, after: 200 },
    indent: { left: 500 },
    children: [
      new TextRun({ text: "selanjutnya disebut sebagai ", size: 22 }),
      new TextRun({ text: sebutan, bold: true, size: 22 }),
      new TextRun({ text: ".", size: 22 }),
    ],
  }),
];

const penutupBaku = (nomor) => [
  ...pasal(nomor, "Penutup"),
  p(
    "Berita acara ini berlaku sejak tanggal ditandatangani oleh kedua belah pihak. Segala sesuatu yang belum diatur atau yang ternyata terdapat kekeliruan di dalamnya akan diperbaiki sebagaimana mestinya melalui musyawarah kedua belah pihak.",
  ),
  p(
    "Demikian berita acara serah terima ini dibuat dengan sebenar-benarnya dalam rangkap 2 (dua) bermeterai cukup, masing-masing mempunyai kekuatan hukum yang sama, untuk dipergunakan sebagaimana mestinya.",
  ),
];

// ============================================================ AMBIL DATA

async function ambilData() {
  const [
    pengaturan, warga, nasabah, setoran, pengepul, kategori, kasTerakhir,
    produkPupuk, produksi, mutasiOrganik, produkUmkm, pengguna, distribusi, petani,
  ] = await Promise.all([
    prisma.pengaturan.findUnique({ where: { id: "SINGLETON" } }),
    prisma.warga.count(),
    prisma.nasabah.findMany({ select: { status: true, saldo: true, catatan: true } }),
    prisma.setoran.findMany({ select: { status: true, beratKg: true } }),
    prisma.pengepul.count({ where: { aktif: true } }),
    prisma.kategoriSampah.count({ where: { aktif: true } }),
    prisma.mutasiKas.findFirst({ orderBy: { createdAt: "desc" }, select: { saldoSesudah: true } }),
    prisma.produkPupuk.findMany({ orderBy: { kode: "asc" } }),
    prisma.produksiPupuk.findMany(),
    prisma.mutasiSampahOrganik.findMany({ select: { arah: true, beratKg: true } }),
    prisma.produkUmkm.findMany({ orderBy: { kode: "asc" } }),
    prisma.user.findMany({ where: { aktif: true }, select: { username: true, nama: true, role: true } }),
    prisma.distribusiPupuk.count({ where: { status: { not: "DIBATALKAN" } } }),
    prisma.petani.count({ where: { status: "AKTIF" } }),
  ]);

  const jum = (arr, f) => arr.reduce((a, x) => a + Number(f(x)), 0);

  const setoranPer = (s) => setoran.filter((x) => x.status === s);
  const selesaiProduksi = produksi.filter((x) => x.status === "SELESAI");

  const stokOrganik = mutasiOrganik.reduce(
    (a, m) => (m.arah === "KELUAR" ? a - Number(m.beratKg) : a + Number(m.beratKg)), 0,
  );

  const bahanSelesai = jum(selesaiProduksi, (x) => x.beratSampahOrganik);
  const padat = jum(selesaiProduksi, (x) => x.pupukKasarAktual ?? 0);
  const cair = jum(selesaiProduksi, (x) => x.pupukCairAktual ?? 0);

  return {
    pengaturan,
    warga,
    nasabahAktif: nasabah.filter((n) => n.status === "AKTIF").length,
    nasabahNonaktif: nasabah.filter((n) => n.status !== "AKTIF").length,
    kewajibanTabungan: jum(nasabah, (n) => n.saldo),
    saldoKas: kasTerakhir?.saldoSesudah ?? 0,
    setoranTotal: setoran.length,
    setoranMenunggu: setoranPer("MENUNGGU").length,
    beratMenunggu: jum(setoranPer("MENUNGGU"), (x) => x.beratKg),
    setoranDiproses: setoranPer("DIPROSES").length,
    beratDiproses: jum(setoranPer("DIPROSES"), (x) => x.beratKg),
    setoranVoid: setoranPer("VOID").length,
    pengepul,
    kategori,
    petani,
    distribusi,
    produkPupuk,
    stokOrganik,
    batchTotal: produksi.length,
    batchPerStatus: ["PROSES", "SELESAI", "GAGAL", "DIBATALKAN"].map((s) => ({
      status: s, jumlah: produksi.filter((x) => x.status === s).length,
    })),
    bahanSelesai, padat, cair,
    rendemenNyata: bahanSelesai > 0 ? (padat / bahanSelesai) * 100 : null,
    cairPerKg: bahanSelesai > 0 ? cair / bahanSelesai : null,
    produkUmkm,
    pengguna,
    // Penanda data contoh - lihat prisma/isi-data-contoh.ts. Peringatan di
    // dokumen hanya muncul selama penanda ini masih ada, jadi begitu data
    // contoh dibersihkan dan dokumen dibangkitkan ulang, peringatannya
    // hilang sendiri tanpa perlu diingat siapa pun.
    adaDataContoh: nasabah.some((n) => n.catatan === "Data contoh KKM 45"),
  };
}

// ====================================================== BERITA ACARA (1)

function beritaAcaraBankSampah(d) {
  const namaBank = d.pengaturan?.namaBankSampah ?? "Bank Sampah Desa Argamukti";
  const ketua = d.pengaturan?.ketuaBankSampah;
  const selisihKas = d.saldoKas - d.kewajibanTabungan;

  const penggunaBank = d.pengguna.filter((u) => ["ADMIN", "OPERATOR_SAMPAH"].includes(u.role));

  return [
    ...kop("KULIAH KERJA MAHASISWA KELOMPOK 45", "Universitas Muhammadiyah Cirebon - Tahun 2026"),
    ...judulDokumen([
      "Berita Acara Serah Terima",
      "Pengelolaan Sistem Informasi Bank Sampah",
      "AgroMukti",
    ]),

    ...pembukaan(),

    ...pihak(1, "PIHAK PERTAMA", {
      nama: titik(38),
      jabatan: "Kuliah Kerja Mahasiswa Kelompok 45",
      labelKetiga: "NIM / Perguruan Tinggi",
      isiKetiga: "Universitas Muhammadiyah Cirebon",
      alamat: titik(38),
    }),
    ...pihak(2, "PIHAK KEDUA", {
      nama: ketua ?? titik(38),
      jabatan: ketua ? `Ketua ${namaBank}` : titik(38),
      labelKetiga: "Instansi",
      isiKetiga: "Pemerintah Desa Argamukti",
      alamat: d.pengaturan?.alamat ?? titik(38),
    }),

    p(
      "PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menerima dari PIHAK PERTAMA, " +
        "pengelolaan modul Bank Sampah pada Sistem Informasi Terpadu Desa Argamukti (AgroMukti), " +
        "dengan rincian sebagai berikut.",
    ),

    ...pasal(1, "Objek Serah Terima"),
    p("Yang diserahkan adalah pengelolaan modul Bank Sampah beserta seluruh data yang tercatat di dalamnya, meliputi:"),
    butir("Pendataan warga dan pendaftaran rekening nasabah bank sampah."),
    butir("Pencatatan setoran sampah anorganik beserta penimbangannya."),
    butir("Pencatatan penjualan sampah kepada pengepul, termasuk pembagian hasilnya kepada setiap penyetor secara proporsional menurut berat setoran."),
    butir("Buku besar tabungan nasabah dan buku besar kas bank sampah."),
    butir("Pencatatan penarikan tabungan oleh nasabah."),
    butir("Laporan dan rekonsiliasi saldo tabungan terhadap buku besarnya."),

    ...pasal(2, "Posisi Data pada Saat Serah Terima"),
    p(
      `Angka berikut adalah keadaan yang tercatat dalam sistem pada saat berita acara ini dibuat, ` +
        `yaitu tanggal ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}. ` +
        `Apabila terdapat kegiatan pencatatan setelah tanggal tersebut, angkanya tentu berubah dan ` +
        `berita acara ini perlu dibangkitkan ulang sebelum ditandatangani.`,
    ),
    jarak(80),
    tabel(
      ["Uraian", "Jumlah"],
      [
        ["Warga terdaftar", `${d.warga} orang`],
        ["Rekening nasabah aktif", `${d.nasabahAktif} rekening`],
        ["Rekening nasabah nonaktif", `${d.nasabahNonaktif} rekening`],
        ["Kategori sampah yang diterima", `${d.kategori} kategori`],
        ["Pengepul mitra terdaftar", `${d.pengepul} pengepul`],
        ["Seluruh transaksi setoran tercatat", `${d.setoranTotal} transaksi`],
        ["Setoran yang sudah dibeli pengepul", `${d.setoranDiproses} transaksi / ${angka(d.beratDiproses)} kg`],
        ["Setoran dibatalkan", `${d.setoranVoid} transaksi`],
      ],
      [6200, 2900],
    ),
    jarak(140),

    ...pasal(3, "Barang dan Kewajiban yang Ikut Beralih"),
    p(
      "Serah terima ini tidak hanya meliputi perangkat lunak dan catatannya. Terdapat dua hal " +
        "bernilai yang ikut beralih tanggung jawabnya dan karena itu disebutkan tersendiri.",
    ),
    jarak(80),
    tabel(
      ["Yang beralih", "Nilai / jumlah"],
      [
        [
          "Sampah anorganik yang masih tersimpan di gudang dan belum dijemput pengepul",
          `${d.setoranMenunggu} setoran / ${angka(d.beratMenunggu)} kg`,
        ],
        ["Kewajiban tabungan kepada seluruh nasabah", rp(d.kewajibanTabungan)],
        ["Saldo kas bank sampah menurut buku besar", rp(d.saldoKas)],
        [
          selisihKas >= 0 ? "Selisih kas terhadap kewajiban (lebih)" : "Selisih kas terhadap kewajiban (KURANG)",
          rp(Math.abs(selisihKas)),
        ],
      ],
      [6200, 2900],
    ),
    jarak(120),
    kotak(
      "Penjelasan mengenai kewajiban tabungan",
      [
        `Angka ${rp(d.kewajibanTabungan)} adalah uang milik warga yang dititipkan pada bank sampah, ` +
          "bukan pendapatan desa dan bukan milik pengelola. Setiap saat warga berhak menariknya sesuai ketentuan penarikan.",
        selisihKas >= 0
          ? `Kas bank sampah saat ini ${rp(d.saldoKas)}, yaitu ${rp(selisihKas)} lebih besar daripada kewajiban tersebut. Keadaan ini wajar dan berarti seluruh tabungan warga masih tertutup oleh kas.`
          : `PERHATIAN: kas bank sampah saat ini ${rp(d.saldoKas)}, yaitu ${rp(Math.abs(selisihKas))} LEBIH KECIL daripada kewajiban kepada warga. Selisih ini perlu dijelaskan dan diselesaikan sebelum berita acara ditandatangani.`,
        "Sistem menyediakan menu rekonsiliasi untuk mencocokkan saldo setiap rekening dengan buku besar mutasinya. Pemeriksaan itu dianjurkan dilakukan bersama-sama sesaat sebelum penandatanganan.",
      ],
      selisihKas >= 0 ? TEAL : MERAH,
    ),

    ...pasal(4, "Akun Pengguna yang Diserahkan"),
    p(
      "Akun berikut diserahkan beserta kata sandinya, yang disampaikan secara lisan atau tertulis " +
        "terpisah dari berita acara ini. PIHAK KEDUA wajib mengganti seluruh kata sandi tersebut " +
        "segera setelah serah terima.",
    ),
    jarak(80),
    tabel(
      ["Nama pengguna", "Nama", "Peran"],
      penggunaBank.map((u) => [u.username, u.nama, u.role.replace(/_/g, " ")]),
      [2600, 3600, 2900],
    ),
    jarak(140),

    ...pasal(5, "Hal yang Perlu Ditindaklanjuti"),
    p("PIHAK KEDUA menyatakan telah mengetahui hal-hal berikut dan bersedia menindaklanjutinya."),
    butir("Mengganti kata sandi seluruh akun yang diserahkan pada Pasal 4."),
    butir("Melakukan rekonsiliasi saldo tabungan dan stok secara berkala melalui menu yang tersedia."),
    butir("Menetapkan petugas yang bertanggung jawab menimbang, mencatat setoran, dan mendampingi pengepul saat penjemputan."),
    butir("Memastikan setiap penjualan kepada pengepul dicatat memakai nilai yang benar-benar dibayarkan, karena nilai itulah yang dibagi ke tabungan warga."),
    butir("Melengkapi data induk warga, termasuk Nomor Induk Kependudukan yang saat ini belum terisi."),

    ...penutupBaku(6),
    blokTandaTangan(
      [
        "PIHAK PERTAMA\nKuliah Kerja Mahasiswa Kelompok 45",
        titik(24),
        `PIHAK KEDUA\n${ketua ? namaBank : "Pemerintah Desa Argamukti"}`,
        ketua ?? titik(24),
      ],
      [
        "Kepala Desa Argamukti",
        d.pengaturan?.kepalaDesa ?? titik(24),
        "Dosen Pembimbing Lapangan",
        titik(24),
      ],
    ),
  ];
}

// ====================================================== BERITA ACARA (2)

function beritaAcaraPupukUmkm(d) {
  const nilaiPersediaanUmkm = d.produkUmkm.reduce((a, u) => a + u.harga * Number(u.stok), 0);
  const penggunaOrganik = d.pengguna.filter((u) =>
    ["ADMIN", "OPERATOR_ORGANIK", "OPERATOR_TANI"].includes(u.role),
  );
  const rendemenSetelan = d.pengaturan?.rendemenKomposPersen ?? 30;
  const pocSetelan = d.pengaturan?.hasilPocLiterPerKg ?? 0.05;

  return [
    ...kop("KULIAH KERJA MAHASISWA KELOMPOK 45", "Universitas Muhammadiyah Cirebon - Tahun 2026"),
    ...judulDokumen([
      "Berita Acara Serah Terima",
      "Pengelolaan Produksi Pupuk dan Produk UMKM",
      "AgroMukti",
    ]),

    ...pembukaan(),

    ...pihak(1, "PIHAK PERTAMA", {
      nama: titik(38),
      jabatan: "Kuliah Kerja Mahasiswa Kelompok 45",
      labelKetiga: "NIM / Perguruan Tinggi",
      isiKetiga: "Universitas Muhammadiyah Cirebon",
      alamat: titik(38),
    }),
    ...pihak(2, "PIHAK KEDUA", {
      nama: titik(38),
      jabatan: titik(38),
      labelKetiga: "Instansi",
      isiKetiga: "Pemerintah Desa Argamukti",
      alamat: d.pengaturan?.alamat ?? titik(38),
    }),

    p(
      "PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menerima dari PIHAK PERTAMA, " +
        "pengelolaan modul Pengolahan Sampah Organik, Produksi Pupuk, dan Produk UMKM pada Sistem " +
        "Informasi Terpadu Desa Argamukti (AgroMukti), dengan rincian sebagai berikut.",
    ),

    ...pasal(1, "Objek Serah Terima"),
    p("Yang diserahkan adalah pengelolaan modul-modul berikut beserta seluruh data yang tercatat di dalamnya:"),
    butir("Buku besar sampah organik: pencatatan bahan baku masuk, terpakai, dan koreksinya."),
    butir("Produksi pupuk: pembuatan batch pengomposan, perhitungan estimasi hasil, dan pencatatan hasil panen sebenarnya."),
    butir("Stok pupuk: buku besar kompos padat dan pupuk cair, termasuk penyesuaian stok."),
    butir("Penyaluran pupuk kepada petani, mencakup pembayaran dari tabungan bank sampah, tunai, maupun subsidi."),
    butir("Katalog produk UMKM desa beserta harga dan sisa stoknya."),

    ...pasal(2, "Posisi Data pada Saat Serah Terima"),
    p(
      `Angka berikut adalah keadaan yang tercatat dalam sistem pada tanggal ` +
        `${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}. ` +
        `Apabila masih ada kegiatan pencatatan setelah tanggal tersebut, berita acara ini perlu ` +
        `dibangkitkan ulang sebelum ditandatangani.`,
    ),
    jarak(80),
    tabel(
      ["Uraian", "Jumlah"],
      [
        ["Batch produksi seluruhnya", `${d.batchTotal} batch`],
        ...d.batchPerStatus
          .filter((b) => b.jumlah > 0)
          .map((b) => [`     berstatus ${b.status}`, `${b.jumlah} batch`]),
        ["Bahan baku yang sudah diolah (batch selesai)", `${angka(d.bahanSelesai)} kg`],
        ["Kompos padat yang dihasilkan", `${angka(d.padat)} kg`],
        ["Pupuk cair yang dihasilkan", `${angka(d.cair)} liter`],
        ["Rendemen padat yang benar-benar tercapai", d.rendemenNyata === null ? "belum ada data" : `${angka(d.rendemenNyata)} %`],
        ["Hasil cair per kg bahan baku", d.cairPerKg === null ? "belum ada data" : `${angka(d.cairPerKg, 4)} liter/kg`],
        ["Petani aktif penerima pupuk", `${d.petani} orang`],
        ["Transaksi penyaluran pupuk tercatat", `${d.distribusi} transaksi`],
      ],
      [6200, 2900],
    ),
    jarak(140),

    ...pasal(3, "Persediaan Fisik yang Ikut Beralih"),
    p(
      "Selain perangkat lunak dan catatannya, terdapat persediaan fisik yang tercatat dalam sistem " +
        "dan ikut beralih tanggung jawabnya. Jumlah di bawah ini hendaknya dicocokkan langsung dengan " +
        "keadaan di gudang sebelum berita acara ditandatangani.",
    ),
    jarak(80),
    tabel(
      ["Jenis persediaan", "Jumlah tercatat"],
      [
        ["Bahan baku sampah organik di gudang", `${angka(d.stokOrganik)} kg`],
        ...d.produkPupuk.map((pp) => [
          `${pp.nama} (${pp.kode})`,
          `${angka(pp.stok)} ${pp.satuan.toLowerCase()}`,
        ]),
      ],
      [6200, 2900],
    ),
    jarak(140),
    p("Katalog produk UMKM yang tercatat beserta sisa stoknya:"),
    jarak(80),
    tabel(
      ["Produk UMKM", "Harga satuan", "Sisa stok"],
      [
        ...d.produkUmkm.map((u) => [
          `${u.nama} (${u.kode})`,
          rp(u.harga),
          `${angka(u.stok)} ${u.satuan.toLowerCase()}`,
        ]),
        ["Nilai persediaan menurut harga jual", "", rp(nilaiPersediaanUmkm)],
      ],
      [4600, 2300, 2200],
    ),
    jarak(140),

    ...pasal(4, "Akun Pengguna yang Diserahkan"),
    p(
      "Akun berikut diserahkan beserta kata sandinya, yang disampaikan terpisah dari berita acara " +
        "ini. PIHAK KEDUA wajib mengganti seluruh kata sandi tersebut segera setelah serah terima.",
    ),
    jarak(80),
    tabel(
      ["Nama pengguna", "Nama", "Peran"],
      penggunaOrganik.map((u) => [u.username, u.nama, u.role.replace(/_/g, " ")]),
      [2600, 3600, 2900],
    ),
    jarak(140),

    ...pasal(5, "Hal yang Perlu Ditindaklanjuti"),
    p("PIHAK KEDUA menyatakan telah mengetahui hal-hal berikut dan bersedia menindaklanjutinya."),
    butir("Mengganti kata sandi seluruh akun yang diserahkan pada Pasal 4."),
    butir("Mencocokkan stok pupuk dan bahan baku pada Pasal 3 dengan keadaan fisik di gudang, serta mencatat selisihnya lewat menu penyesuaian stok apabila ada."),
    butir("Menetapkan petugas yang bertanggung jawab menimbang bahan baku, memulai batch, dan mencatat hasil panen."),
    butir("Melengkapi pencatatan penjualan produk UMKM, yang pada versi ini belum tersedia."),

    jarak(80),
    kotak(
      "Rasio estimasi pupuk masih berupa setelan sementara",
      [
        `Sistem saat ini memakai rasio ${angka(rendemenSetelan)} persen untuk kompos padat dan ` +
          `${angka(pocSetelan, 4)} liter per kilogram bahan untuk pupuk cair. Angka itu dipakai HANYA untuk ` +
          "memperkirakan hasil saat batch dimulai, dan bukan hasil pengukuran di Desa Argamukti.",
        d.rendemenNyata === null
          ? "Belum ada batch selesai yang bisa dipakai sebagai pembanding."
          : `Sebagai pembanding, rendemen yang benar-benar tercapai dari batch yang sudah selesai adalah ` +
            `${angka(d.rendemenNyata)} persen dan ${angka(d.cairPerKg, 4)} liter per kilogram.`,
        "Setelah beberapa kali produksi, setelan tersebut hendaknya disesuaikan melalui menu Pengaturan agar perkiraan yang muncul di layar mendekati kenyataan. Penjelasan lengkap rumusnya ada pada dokumen Perhitungan Produksi Pupuk.",
      ],
    ),

    ...penutupBaku(6),
    blokTandaTangan(
      [
        "PIHAK PERTAMA\nKuliah Kerja Mahasiswa Kelompok 45",
        titik(24),
        "PIHAK KEDUA\nPemerintah Desa Argamukti",
        titik(24),
      ],
      [
        "Kepala Desa Argamukti",
        d.pengaturan?.kepalaDesa ?? titik(24),
        "Dosen Pembimbing Lapangan",
        titik(24),
      ],
    ),
  ];
}

// =============================================================== SIMPAN

function peringatanDataContoh() {
  return [
    kotak(
      "PERINGATAN - JANGAN DITANDATANGANI DALAM KEADAAN INI",
      [
        "Basis data masih memuat data contoh yang dibuat untuk menguji sistem dan menyiapkan dokumentasi. Seluruh angka pada Pasal 2 dan Pasal 3 di bawah karena itu BUKAN catatan kegiatan yang sebenarnya terjadi.",
        "Berita acara adalah dokumen resmi. Menandatanganinya dengan angka rekaan berarti menyatakan sesuatu yang tidak benar. Bersihkan lebih dulu data contoh dari basis data, lalu jalankan ulang perintah npm run docs:berita agar seluruh angkanya diperbarui.",
        "Kotak peringatan ini akan hilang dengan sendirinya setelah data contoh tidak lagi ditemukan.",
      ],
      MERAH,
    ),
    jarak(240),
  ];
}

async function simpan(namaBerkas, isi) {
  const dok = new Document({
    creator: "KKM Kelompok 45 - Universitas Muhammadiyah Cirebon",
    title: namaBerkas.replace(/\.docx$/, ""),
    description: "Berita acara serah terima AgroMukti - Sistem Informasi Terpadu Desa Argamukti",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1276, right: 1134 } } },
      children: isi,
    }],
  });

  const keluaran = path.join(process.cwd(), "docs", namaBerkas);
  const buf = await Packer.toBuffer(dok);

  try {
    fs.writeFileSync(keluaran, buf);
  } catch (e) {
    // Penyebab tersering: berkasnya sedang dibuka di Word sehingga terkunci.
    if (e?.code === "EBUSY" || e?.code === "EPERM") {
      console.error(`Gagal menyimpan: "${namaBerkas}" sedang dibuka aplikasi lain.`);
      console.error("Tutup berkas itu di Microsoft Word, lalu jalankan ulang perintah ini.");
      process.exitCode = 1;
      return;
    }
    throw e;
  }

  console.log(`Tersimpan: ${keluaran}  (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const d = await ambilData();
  const awalan = d.adaDataContoh ? peringatanDataContoh() : [];

  await simpan("Berita Acara Serah Terima - Bank Sampah.docx", [
    ...awalan, ...beritaAcaraBankSampah(d),
  ]);
  await simpan("Berita Acara Serah Terima - Produksi Pupuk dan Produk UMKM.docx", [
    ...awalan, ...beritaAcaraPupukUmkm(d),
  ]);

  if (d.adaDataContoh) {
    console.log("\nPERINGATAN: basis data masih memuat data contoh.");
    console.log("Kedua berita acara diberi kotak peringatan merah di halaman pertama.");
    console.log("Bersihkan data contoh lalu jalankan ulang perintah ini sebelum ditandatangani.");
  }
}

main()
  .catch((e) => {
    console.error(`\nGagal: ${e.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

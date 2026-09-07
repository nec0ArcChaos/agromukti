/**
 * Pembangkit Buku Panduan Penggunaan AgroMukti (.docx).
 *
 * Dibuat sebagai skrip, bukan berkas .docx yang disunting tangan, supaya
 * panduannya bisa diperbarui mengikuti perubahan aplikasi tanpa menyusun
 * ulang dari nol. Jalankan: npm run docs:manual
 */
import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, Packer,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";

/**
 * Alamat situs AgroMukti setelah dipasang di hosting.
 *
 * GANTI SATU BARIS INI dengan alamat sebenarnya saat domain desa sudah
 * aktif, lalu jalankan ulang `npm run docs:manual`. Seluruh alamat di
 * dalam buku panduan ikut menyesuaikan sendiri, sehingga tidak ada alamat
 * lama yang tertinggal di satu-dua halaman tanpa disadari.
 */
const ALAMAT_SITUS = "https://agromukti.argamukti.desa.id";

const TEAL = "0F766E";
const ABU = "64748B";
const ABU_MUDA = "F1F5F9";

// ---------- pembantu penyusun ----------

const judulBab = (teks) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text: teks, bold: true, size: 30, color: TEAL })],
  });

const subJudul = (teks) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text: teks, bold: true, size: 24 })],
  });

const p = (teks, opsi = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 300 },
    children: [new TextRun({ text: teks, size: 22, ...opsi })],
  });

/** Paragraf dengan sebagian teks ditebalkan: teks("Biasa ", ["tebal", true], " lagi") */
const pKaya = (...bagian) =>
  new Paragraph({
    spacing: { after: 120, line: 300 },
    children: bagian.map((b) =>
      Array.isArray(b)
        ? new TextRun({ text: b[0], bold: b[1] === true, italics: b[1] === "i", size: 22 })
        : new TextRun({ text: b, size: 22 }),
    ),
  });

const langkah = (teks) =>
  new Paragraph({
    numbering: { reference: "langkah", level: 0 },
    spacing: { after: 80, line: 300 },
    children: [new TextRun({ text: teks, size: 22 })],
  });

const butir = (teks) =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 300 },
    children: [new TextRun({ text: teks, size: 22 })],
  });

/** Kotak sorot untuk hal yang tidak boleh terlewat. */
const kotak = (judul, isi) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: TEAL },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL },
      left: { style: BorderStyle.SINGLE, size: 18, color: TEAL },
      right: { style: BorderStyle.SINGLE, size: 6, color: TEAL },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: judul, bold: true, size: 22, color: TEAL })],
              }),
              ...isi.map(
                (t) =>
                  new Paragraph({
                    spacing: { after: 60, line: 300 },
                    children: [new TextRun({ text: t, size: 21 })],
                  }),
              ),
            ],
          }),
        ],
      }),
    ],
  });

const tabel = (kepala, baris) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
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
        children: kepala.map(
          (h) =>
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: ABU_MUDA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
            }),
        ),
      }),
      ...baris.map(
        (r) =>
          new TableRow({
            children: r.map(
              (c) =>
                new TableCell({
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: c, size: 20 })] })],
                }),
            ),
          }),
      ),
    ],
  });

const jarak = (tinggi = 200) => new Paragraph({ spacing: { after: tinggi }, children: [] });

// ---------- isi panduan ----------

const sampul = [
  new Paragraph({ spacing: { before: 2400, after: 100 }, alignment: AlignmentType.CENTER, children: [
    new TextRun({ text: "BUKU PANDUAN PENGGUNAAN", bold: true, size: 28, color: ABU }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [
    new TextRun({ text: "AGROMUKTI", bold: true, size: 72, color: TEAL }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [
    new TextRun({ text: "Sistem Informasi Terpadu Desa Argamukti", size: 26 }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
    new TextRun({ text: "Bank Sampah  ·  Pengelolaan Sampah Organik & Produksi Pupuk", size: 22, color: ABU }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 }, children: [
    new TextRun({ text: "Pertanian & Distribusi Pupuk", size: 22, color: ABU }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
    new TextRun({ text: "Kuliah Kerja Mahasiswa Kelompok 45", size: 22 }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
    new TextRun({ text: "Universitas Muhammadiyah Cirebon — 2026", size: 22 }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [
    new TextRun({ text: "Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka", size: 22, color: ABU }),
  ]}),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [
    new TextRun({ text: `Dokumen dibuat ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`, size: 18, color: ABU, italics: true }),
  ]}),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab1 = [
  judulBab("1. Tentang AgroMukti"),
  p("AgroMukti adalah satu aplikasi yang menyatukan tiga program Desa Argamukti yang selama ini berjalan sendiri-sendiri. Ketiganya saling menyambung membentuk satu lingkaran, dan itulah alasan ketiganya disatukan dalam satu sistem."),
  subJudul("Lingkaran yang dibentuk"),
  p("Warga menyetor sampah anorganik ke bank sampah. Sampah itu dijual ke pengepul, dan uang hasil penjualannya masuk ke tabungan warga. Sementara itu sampah organik desa diolah menjadi pupuk kompos dan pupuk cair. Pupuk itu kemudian disalurkan kepada petani — dan petani membayarnya dari tabungan bank sampah yang ia kumpulkan sendiri."),
  pKaya("Jadi ", ["sampah yang dikelola warga kembali kepada warga dalam bentuk pupuk untuk lahannya", true], ". Sistem ini mencatat seluruh perjalanan itu agar dapat dipertanggungjawabkan."),
  subJudul("Tiga pilar"),
  tabel(
    ["Pilar", "Yang dikelola"],
    [
      ["Bank Sampah", "Nasabah, setoran sampah anorganik, pengambilan oleh pengepul, tabungan warga, penarikan, dan kas lembaga."],
      ["Sampah Organik & Pupuk", "Bahan baku sampah organik, batch produksi kompos dan pupuk cair, serta produk UMKM desa."],
      ["Pertanian & Distribusi", "Data petani, lahan, komoditas, panen, permintaan pupuk, dan penyalurannya."],
    ],
  ),
  jarak(),
  kotak("Satu data warga untuk semua pilar", [
    "Nama, alamat, dan kontak warga disimpan satu kali saja di menu Data Warga.",
    "Orang yang sama bisa menjadi nasabah bank sampah sekaligus petani tanpa perlu diketik dua kali, dan tanpa risiko datanya berbeda antar modul.",
  ]),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab2 = [
  judulBab("2. Mengakses Sistem"),
  p("AgroMukti adalah aplikasi web. Tidak ada yang perlu dipasang di komputer maupun telepon, dan tidak ada program yang perlu dinyalakan lebih dulu. Cukup buka peramban — Chrome, Edge, Firefox, atau Safari — lalu ketik alamatnya."),
  jarak(120),
  subJudul("Alamat situs"),
  tabel(
    ["Halaman", "Alamat", "Siapa yang boleh membuka"],
    [
      ["Halaman warga", ALAMAT_SITUS, "Siapa saja, tanpa akun"],
      ["Pengajuan pupuk", `${ALAMAT_SITUS}/portal`, "Siapa saja, tanpa akun"],
      ["Area petugas", `${ALAMAT_SITUS}/petugas`, "Hanya yang punya akun"],
    ],
  ),
  jarak(120),
  p("Sistem dapat dibuka dari mana saja selama ada sambungan internet: komputer kantor desa, telepon pengurus di lapangan, maupun perangkat kepala desa di rumah. Beberapa petugas boleh memakainya bersamaan, dan data yang mereka masukkan langsung terlihat oleh yang lain."),
  jarak(),
  kotak("Data tersimpan di server, bukan di perangkat Anda", [
    "Menutup peramban, mematikan telepon, atau berganti perangkat tidak menghilangkan data apa pun.",
    "Karena itu pula, kehilangan atau kerusakan komputer kantor tidak menghilangkan catatan desa.",
    "Meski begitu, pencadangan berkala tetap perlu dilakukan — lihat Bab 9.",
  ]),
  jarak(),
  subJudul("Menyimpan alamat agar mudah dibuka"),
  p("Agar petugas tidak perlu mengetik alamat setiap kali, simpanlah sebagai penanda buku (bookmark) di peramban komputer kantor. Pada telepon, alamat area petugas dapat ditambahkan ke layar utama sehingga terbuka seperti aplikasi biasa."),
  jarak(120),
  subJudul("Yang dibutuhkan"),
  butir("Sambungan internet. Bila sambungan terputus, halaman tidak dapat dibuka sampai sambungan pulih."),
  butir("Peramban modern. Peramban bawaan Windows lama (Internet Explorer) tidak didukung."),
  butir("Akun, khusus untuk membuka area petugas. Halaman warga tidak memerlukannya."),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab3 = [
  judulBab("3. Akun dan Hak Akses"),
  p("Sistem ini punya dua wajah. Halaman depan terbuka untuk siapa saja tanpa akun. Sedangkan area petugas hanya bisa dimasuki dengan akun, dan alamatnya sengaja tidak ditautkan dari halaman depan."),
  pKaya(["Alamat area petugas: ", true], `${ALAMAT_SITUS}/petugas`),
  jarak(120),
  subJudul("Peran dan yang boleh dikerjakan"),
  p("Setiap akun punya peran. Peran menentukan menu mana yang boleh diubah datanya. Semua peran boleh membaca seluruh modul — pembatasan hanya berlaku untuk menambah dan mengubah data."),
  tabel(
    ["Peran", "Boleh mengubah data di"],
    [
      ["Administrator", "Seluruh modul, ditambah pengaturan sistem, manajemen akun, dan cadangan data."],
      ["Operator Bank Sampah", "Nasabah, setoran, pengambilan pengepul, penarikan, kategori sampah, pengepul."],
      ["Operator Organik", "Sampah organik, produksi pupuk, produk UMKM."],
      ["Operator Pertanian", "Petani, lahan, komoditas, panen, produk pupuk, stok, permintaan, distribusi."],
      ["Kepala Desa", "Tidak mengubah apa pun. Hanya memantau dan mencetak laporan."],
    ],
  ),
  jarak(),
  kotak("Bila muncul tulisan tidak berwenang", [
    "Itu bukan kerusakan. Artinya akun yang sedang dipakai tidak punya hak untuk menu tersebut.",
    "Masuklah dengan akun yang sesuai perannya, atau minta Administrator mengubah peran akun Anda.",
  ]),
  jarak(),
  subJudul("Menjaga akun"),
  butir("Ganti kata sandi bawaan segera setelah serah terima."),
  butir("Jangan berbagi satu akun untuk beberapa orang. Setiap tindakan tercatat atas nama pemilik akun, dan itu yang membuat kekeliruan bisa ditelusuri."),
  butir("Bila seorang petugas berhenti, minta Administrator menonaktifkan akunnya. Akun yang dinonaktifkan langsung tidak bisa dipakai, bahkan bila orang itu masih membuka halaman sistem."),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab4 = [
  judulBab("4. Halaman untuk Warga"),
  p("Halaman depan dapat dibuka siapa saja tanpa akun. Warga tidak perlu mendaftar untuk memakainya."),
  subJudul("Yang bisa dilakukan warga"),
  tabel(
    ["Layanan", "Cara memakai"],
    [
      ["Melihat angka desa", "Langsung terlihat di halaman depan: jumlah petani, luas lahan, pupuk tersalurkan, dan sampah terkelola."],
      ["Kalkulator kebutuhan pupuk", "Pilih komoditas dan isi luas lahan. Sistem menghitung perkiraan kebutuhan pupuknya."],
      ["Cek status pengajuan", "Isi nomor pengajuan dan nama. Keduanya harus cocok."],
      ["Mengajukan pupuk", "Tekan tombol Ajukan Pupuk, lalu masukkan kode kartu tani dan nama."],
    ],
  ),
  jarak(),
  kotak("Mengapa cek status meminta nama juga", [
    "Nomor pengajuan berurutan, sehingga mudah ditebak orang lain.",
    "Dengan mensyaratkan nama yang cocok, pengajuan seorang warga tidak bisa diintip tetangganya yang sekadar menebak nomor.",
  ]),
  jarak(),
  subJudul("Pengajuan pupuk oleh warga"),
  p("Pengajuan yang masuk lewat halaman warga tidak langsung disetujui. Ia muncul di menu Permintaan Pupuk dengan tanda [Portal warga], dan petugas desa yang memutuskan disetujui atau ditolak."),
  p("Satu petani hanya boleh punya satu pengajuan yang belum diputuskan. Ini mencegah antrean petugas dibanjiri pengajuan berulang dari orang yang sama."),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab5 = [
  judulBab("5. Bank Sampah"),
  p("Bank sampah di desa ini menangani sampah anorganik: plastik, kertas, logam, kaca, dan campuran."),
  jarak(120),
  kotak("Hal terpenting yang harus dipahami operator", [
    "Saat warga menyetor sampah, sistem HANYA mencatat beratnya. Belum ada nilai rupiah.",
    "Nilai rupiah baru muncul setelah pengepul datang dan benar-benar membayar. Uang yang dibayarkan pengepul itulah yang dibagi ke para penyetor sesuai berat sampahnya masing-masing.",
    "Karena itu, jangan menjanjikan angka rupiah kepada warga pada saat menimbang.",
  ]),
  jarak(),
  subJudul("5.1 Mendaftarkan nasabah"),
  langkah("Buka menu Nasabah, tekan + Nasabah baru."),
  langkah("Bila warganya sudah pernah didata, pilih dari daftar warga yang ada. Bila belum, isi identitasnya."),
  langkah("Simpan. Kode nasabah (contoh AGM-0001) dibuat sistem secara otomatis."),
  jarak(120),
  subJudul("5.2 Mencatat setoran"),
  langkah("Buka menu Setoran, pilih nasabahnya."),
  langkah("Pilih kategori sampah bila diketahui. Boleh dikosongkan."),
  langkah("Timbang sampahnya, lalu isi beratnya dalam kilogram."),
  langkah("Simpan. Setoran berstatus MENUNGGU, artinya masih menumpuk di bank sampah."),
  jarak(120),
  subJudul("5.3 Saat pengepul datang"),
  p("Inilah saat nilai rupiah ditentukan. Pengepul biasanya mengangkut sampah dari banyak penyetor sekaligus dan membayar satu jumlah untuk semuanya."),
  langkah("Buka menu Pengambilan Pengepul."),
  langkah("Pilih pengepulnya."),
  langkah("Centang setoran-setoran yang diangkut hari itu. Tombol Pilih semua tersedia bila semuanya diangkut."),
  langkah("Isi jumlah uang yang BENAR-BENAR dibayarkan pengepul."),
  langkah("Simpan. Sistem membagi uang itu ke setiap penyetor sesuai berat sampahnya, lalu menambahkannya ke tabungan masing-masing."),
  jarak(120),
  kotak("Pembagiannya selalu pas", [
    "Sistem menjamin jumlah seluruh bagian persis sama dengan uang yang dibayarkan pengepul — tidak lebih, tidak kurang sepeser pun.",
    "Contoh: pembayaran Rp 29.999 untuk 30 kg dari tiga penyetor (10 kg, 5 kg, 15 kg) dibagi menjadi Rp 10.000, Rp 5.000, dan Rp 14.999.",
  ]),
  jarak(),
  subJudul("5.4 Penarikan tabungan"),
  langkah("Buka menu Penarikan, pilih nasabah dan isi jumlahnya."),
  langkah("Pengajuan berstatus MENUNGGU sampai Administrator menyetujuinya."),
  langkah("Setelah disetujui, saldo nasabah berkurang dan uang keluar dari kas."),
  jarak(120),
  subJudul("5.5 Membatalkan yang keliru"),
  tabel(
    ["Keadaan", "Yang harus dilakukan"],
    [
      ["Setoran salah, belum diambil pengepul", "Batalkan langsung di menu Setoran. Belum ada uang yang tersentuh."],
      ["Setoran salah, tapi sudah diambil pengepul", "Setoran itu tidak bisa dibatalkan sendiri. Batalkan seluruh Pengambilan Pengepul-nya, perbaiki, lalu catat ulang."],
    ],
  ),
  jarak(120),
  p("Membatalkan pengambilan akan menarik kembali uang yang sudah masuk ke tabungan semua penyetor dalam rombongan itu, dan mengembalikan setorannya ke status MENUNGGU."),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab6 = [
  judulBab("6. Sampah Organik dan Produksi Pupuk"),
  subJudul("6.1 Mencatat sampah organik masuk"),
  langkah("Buka menu Sampah Organik, tekan + Setoran."),
  langkah("Pilih warga penyetornya bila ada. Boleh dikosongkan untuk pengumpulan bersama."),
  langkah("Isi beratnya dan sumbernya, misalnya Pengumpulan RT 02."),
  jarak(120),
  subJudul("6.2 Memulai batch produksi"),
  langkah("Buka menu Produksi Pupuk, tekan + Mulai batch."),
  langkah("Isi berat bahan baku yang dimasukkan ke komposter."),
  langkah("Sistem langsung menampilkan perkiraan hasil kompos padat dan pupuk cair. Angka ini dihitung otomatis — tidak perlu ditebak."),
  langkah("Tetapkan produk tujuan hasilnya, agar hasil panen nanti masuk ke stok yang benar."),
  langkah("Simpan. Bahan baku otomatis berkurang dari stok sampah organik."),
  jarak(120),
  kotak("Perkiraan hasil bisa disetel", [
    "Perkiraan memakai rasio anjuran yang tersimpan di menu Pengaturan.",
    "Di bawah angka perkiraan, sistem menampilkan capaian NYATA dari batch yang sudah selesai sebagai pembanding.",
    "Bila keduanya jauh berbeda, ubahlah rasionya di Pengaturan agar perkiraan berikutnya lebih mendekati kenyataan.",
  ]),
  jarak(),
  subJudul("6.3 Memanen batch"),
  langkah("Setelah kompos matang, tekan Panen pada batch tersebut."),
  langkah("Isi hasil sebenarnya: berapa kilogram kompos padat dan berapa liter pupuk cair."),
  langkah("Hasilnya otomatis masuk ke stok pupuk yang siap disalurkan ke petani."),
  jarak(120),
  p("Bila sebuah batch gagal total dan tidak menghasilkan apa pun, tetap catat panennya dengan hasil nol. Sistem akan menandainya GAGAL. Kegagalan adalah data yang berguna untuk evaluasi, jangan disembunyikan."),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab7 = [
  judulBab("7. Pertanian"),
  jarak(80),
  kotak("Syarat menjadi petani terdaftar", [
    "Warga hanya bisa didaftarkan sebagai petani bila ia SUDAH menjadi nasabah bank sampah yang aktif DAN sudah pernah menyetor sampah.",
    "Alasannya bukan administratif: pupuk dibayar dengan memotong tabungan bank sampah. Petani tanpa rekening tidak punya cara membayar, dan yang belum pernah menyetor belum punya isi tabungan.",
    "Inilah yang membuat lingkaran ekonomi sirkular desa benar-benar melingkar.",
  ]),
  jarak(),
  subJudul("7.1 Urutan mendaftarkan petani baru"),
  langkah("Daftarkan warganya sebagai nasabah di menu Nasabah."),
  langkah("Catat setoran sampah pertamanya di menu Setoran."),
  langkah("Baru daftarkan sebagai petani di menu Petani, dengan memilih warga tersebut."),
  jarak(120),
  p("Bila urutan ini dilanggar, sistem akan menolak dan menyebutkan tepat apa yang masih kurang."),
  jarak(120),
  subJudul("7.2 Lahan"),
  p("Luas lahan boleh dicatat dalam meter persegi atau hektare, sesuai yang paling mudah bagi petugas. Sistem menyeragamkannya sendiri saat membuat rekap, sehingga angka rekap tidak akan pernah salah karena satuan yang bercampur."),
  p("Untuk setiap lahan, sistem menghitung perkiraan kebutuhan pupuknya dari luas lahan dikalikan dosis anjuran komoditasnya."),
  jarak(120),
  subJudul("7.3 Panen"),
  p("Hasil panen boleh dicatat dalam kilogram, kuintal, atau ton. Sama seperti luas lahan, sistem menyeragamkannya ke kilogram saat membuat rekap."),
  p("Tanggal panen tidak boleh melebihi hari ini. Panen dicatat setelah terjadi, sehingga tanggal di masa depan hampir pasti salah ketik."),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab8 = [
  judulBab("8. Pupuk dan Penyalurannya"),
  subJudul("8.1 Produk dan stok"),
  p("Produk pupuk didaftarkan di menu Stok Pupuk. Kodenya dibuat otomatis, petugas cukup mengisi nama, jenis, harga, dan satuannya."),
  p("Stok bertambah dari hasil panen produksi, dan berkurang saat disalurkan ke petani. Setiap pergerakannya tercatat lengkap dengan asal-usulnya, sehingga bisa ditelusuri."),
  jarak(120),
  subJudul("8.2 Permintaan pupuk"),
  p("Permintaan boleh melebihi stok yang tersedia. Itu justru gunanya: memberi tahu pengelola berapa kebutuhan sebenarnya. Stok baru mengikat pada saat penyaluran."),
  langkah("Petugas atau warga mengajukan permintaan."),
  langkah("Petugas menyetujui atau menolak. Penolakan wajib disertai alasan."),
  langkah("Permintaan yang disetujui siap disalurkan."),
  jarak(120),
  subJudul("8.3 Menyalurkan pupuk"),
  langkah("Buka menu Distribusi, pilih permintaan yang sudah disetujui."),
  langkah("Isi jumlah yang disalurkan. Sistem menampilkan sisa yang masih boleh disalurkan."),
  langkah("Pilih cara pembayarannya."),
  langkah("Simpan. Stok berkurang dan pembayarannya dicatat."),
  jarak(120),
  subJudul("8.4 Tiga cara pembayaran"),
  tabel(
    ["Cara bayar", "Apa yang terjadi"],
    [
      ["Potong tabungan", "Saldo tabungan petani berkurang. Kas TIDAK bertambah, karena tidak ada uang tunai yang berpindah — yang berkurang adalah utang bank sampah kepada warga."],
      ["Tunai ke petugas", "Petani membayar dengan uang. Kas bertambah, saldo tabungannya tidak tersentuh."],
      ["Subsidi desa", "Pupuk diberikan gratis. Nilainya tetap dicatat untuk laporan, tetapi tidak menagih siapa pun."],
    ],
  ),
  jarak(),
  kotak("Bila saldo petani tidak mencukupi", [
    "Sistem akan menolak dan menyebutkan berapa saldonya, berapa harga pupuknya, dan berapa kekurangannya.",
    "Ada dua jalan keluar yang bisa disampaikan kepada warga: menyetor sampah lagi ke bank sampah untuk menambah saldo, atau membayar tunai kepada petugas.",
  ]),
  jarak(),
  p("Membatalkan penyaluran akan mengembalikan stoknya sekaligus pembayarannya — saldo yang terpotong dikembalikan, atau uang tunai dikeluarkan lagi dari kas."),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab9 = [
  judulBab("9. Laporan, Pengaturan, dan Cadangan Data"),
  subJudul("9.1 Laporan"),
  p("Menu Laporan menyajikan rekap yang dihitung langsung dari data transaksi, sehingga angkanya tidak mungkin berbeda dengan catatan hariannya."),
  butir("Rekap setoran menurut kategori sampah, dusun, atau nasabah."),
  butir("Posisi tabungan seluruh nasabah, sekaligus total kewajiban lembaga."),
  butir("Tingkat partisipasi warga per dusun."),
  butir("Arus kas: pemasukan, pengeluaran, dan saldo."),
  jarak(120),
  subJudul("9.2 Pengaturan"),
  p("Menu Pengaturan berisi identitas lembaga, batas minimal penarikan, serta rasio perkiraan hasil produksi pupuk. Hanya Administrator yang boleh mengubahnya."),
  jarak(120),
  subJudul("9.3 Mencadangkan data"),
  jarak(80),
  p("Data desa tersimpan di server hosting, sehingga aman dari kerusakan komputer kantor. Namun pencadangan tetap perlu: layanan hosting bisa bermasalah, masa berlangganannya bisa habis, dan kekeliruan besar pada data bisa saja terjadi. Cadangan adalah salinan yang sepenuhnya dipegang desa sendiri."),
  jarak(80),
  kotak("Lakukan pencadangan secara rutin", [
    "Sekurang-kurangnya sekali sebulan, dan selalu sebelum perubahan besar seperti pergantian pengurus atau penataan ulang data.",
    "Simpan salinannya di komputer desa dan di flash disk. Jangan menyimpannya hanya di satu tempat.",
    "Berkas cadangan menjadi jaminan bahwa data desa tetap milik desa, tidak bergantung pada penyedia hosting.",
  ]),
  jarak(120),
  langkah("Masuk dengan akun Administrator."),
  langkah(`Buka alamat: ${ALAMAT_SITUS}/api/backup`),
  langkah("Berkas cadangan akan terunduh. Simpan dengan nama yang memuat tanggalnya."),
  jarak(120),
  p("Berkas cadangan tidak memuat kata sandi siapa pun, sehingga aman disimpan dan diserahkan untuk keperluan pemulihan data."),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab10 = [
  judulBab("10. Bila Sistem Menolak"),
  p("Sistem sengaja menolak tindakan yang akan merusak catatan. Penolakan bukan kerusakan — ia mencegah kekeliruan yang jauh lebih sulit diperbaiki bila terlanjur tersimpan. Berikut penolakan yang paling sering ditemui."),
  jarak(120),
  tabel(
    ["Tulisan yang muncul", "Artinya dan apa yang harus dilakukan"],
    [
      ["Sesi Anda sudah tidak berlaku", "Sudah terlalu lama tidak dipakai, atau akun dinonaktifkan. Masuk kembali di halaman petugas."],
      ["Akun Anda tidak berwenang", "Peran akun ini tidak boleh mengubah data di menu tersebut. Gunakan akun yang sesuai."],
      ["Belum pernah menyetor sampah", "Warga sudah punya rekening tetapi belum menyetor. Catat setorannya dulu sebelum didaftarkan sebagai petani."],
      ["Sudah dibeli pengepul", "Setoran ini sudah masuk rombongan pengepul. Batalkan seluruh pengambilannya, bukan setoran ini sendiri."],
      ["Saldo tidak cukup", "Tabungan petani kurang untuk membayar pupuk. Warga menyetor sampah lagi, atau bayar tunai."],
      ["Stok tidak cukup", "Jumlah yang diminta melebihi persediaan. Kurangi jumlahnya atau tunggu panen berikutnya."],
      ["Melebihi permintaan", "Penyaluran melebihi sisa yang pernah disetujui. Periksa berapa yang sudah pernah disalurkan."],
      ["Masih ada pengajuan", "Petani punya pengajuan yang belum diputuskan. Selesaikan dulu yang lama."],
    ],
  ),
  jarak(),
  subJudul("Bila halaman tidak bisa dibuka"),
  p("Periksa berurutan dari yang paling sering menjadi penyebabnya:"),
  langkah("Pastikan perangkat tersambung internet. Coba buka satu situs lain untuk memastikan."),
  langkah("Periksa ejaan alamatnya. Salah satu huruf saja membuat halaman tidak ditemukan."),
  langkah("Muat ulang halaman, atau tutup peramban lalu buka kembali."),
  langkah("Coba dari perangkat lain. Bila di perangkat lain terbuka, masalahnya ada pada perangkat pertama, bukan pada sistem."),
  langkah("Bila semua perangkat gagal membuka, kemungkinan layanan hosting sedang bermasalah. Hubungi penanggung jawab sistem desa."),
  jarak(120),
  subJudul("Menjaga keamanan saat membuka dari perangkat bersama"),
  p("Karena sistem kini dapat dibuka dari mana saja, kebiasaan berikut menjadi penting:"),
  butir("Selalu tekan tombol keluar setelah selesai, terutama pada komputer yang dipakai bergantian."),
  butir("Jangan menyimpan kata sandi pada peramban di perangkat yang dipakai bersama."),
  butir("Jangan membuka area petugas di komputer warnet atau perangkat milik orang lain."),
  butir("Bila kata sandi diduga diketahui orang lain, segera minta Administrator menggantinya."),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const bab11 = [
  judulBab("11. Prinsip yang Menjaga Data"),
  p("Beberapa hal berikut sengaja dirancang demikian. Memahaminya membantu pengelola mempercayai angka yang keluar dari sistem, dan tahu apa yang tidak boleh diakali."),
  jarak(120),
  subJudul("Catatan transaksi tidak pernah dihapus"),
  p("Setoran, penyaluran, dan penarikan yang keliru tidak dihapus, melainkan dibatalkan. Pembatalan mencatat pembalikannya sendiri, sehingga riwayatnya tetap utuh dan dapat diperiksa. Buku besar hanya bertambah, tidak pernah berkurang diam-diam."),
  subJudul("Harga disimpan pada saat kejadian"),
  p("Harga pupuk yang dipakai pada suatu penyaluran disimpan bersama penyaluran itu. Bila harga diubah bulan depan, nilai penyaluran yang sudah terjadi tidak ikut berubah."),
  subJudul("Angka rekap dihitung ulang, bukan disimpan"),
  p("Saldo dan stok yang ditampilkan berasal dari penjumlahan catatan aslinya. Administrator dapat menjalankan pemeriksaan ulang kapan saja untuk memastikan tidak ada selisih."),
  subJudul("Setiap tindakan tercatat pelakunya"),
  p("Sistem menyimpan siapa melakukan apa dan kapan. Ini bukan untuk mengawasi petugas, melainkan agar bila ada angka yang janggal, asal-usulnya bisa ditelusuri dan diperbaiki dengan benar."),
  jarak(),
  kotak("Yang perlu ditetapkan bersama pemerintah desa", [
    "Harga pupuk dan dosis anjuran per komoditas yang terpasang saat ini masih berupa angka contoh.",
    "Keduanya perlu ditetapkan bersama pemerintah desa sebelum sistem dipakai untuk transaksi sungguhan, karena keduanya menentukan berapa yang harus dibayar warga.",
  ]),
  new Paragraph({ pageBreakBefore: true, children: [] }),
];

const penutup = [
  judulBab("Serah Terima"),
  p("Buku panduan ini diserahkan bersama aplikasi AgroMukti yang sudah terpasang dan dapat diakses secara daring, beserta data desa di dalamnya, kepada Pemerintah Desa Argamukti."),
  jarak(120),
  subJudul("Akun awal"),
  p("Kata sandi sengaja tidak dicetak dalam buku ini. Buku panduan biasanya digandakan dan tersimpan di meja terbuka, sehingga kata sandi yang tercetak akan tersebar tanpa disadari. Isilah kolom di bawah dengan tulisan tangan pada saat serah terima, lalu segera ganti kata sandinya setelah masuk pertama kali."),
  jarak(80),
  tabel(
    ["Peran", "Nama pengguna", "Kata sandi awal", "Diserahkan kepada"],
    [
      ["Administrator", "", "", ""],
      ["Operator Bank Sampah", "", "", ""],
      ["Operator Organik", "", "", ""],
      ["Operator Pertanian", "", "", ""],
      ["Kepala Desa", "", "", ""],
    ],
  ),
  jarak(120),
  kotak("Yang diserahkan bersama buku ini", [
    "Aplikasi AgroMukti yang sudah terpasang dan dapat diakses di alamatnya.",
    "Kode sumber aplikasi, agar desa dapat memindahkannya ke penyedia lain bila diperlukan.",
    "Keterangan akses hosting dan nama domain, beserta masa berlakunya.",
    "Satu berkas cadangan data terbaru.",
  ]),
  jarak(120),
  kotak("Yang perlu dijaga desa agar sistem tetap hidup", [
    "Nama domain dan layanan hosting punya masa berlaku. Catat tanggal jatuh temponya dan perpanjang sebelum habis - bila terlewat, situs berhenti dapat diakses.",
    "Tetapkan satu penanggung jawab yang memegang keterangan akses hosting, dan satu pengganti bila yang bersangkutan berhalangan.",
  ]),
  jarak(500),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: ["Yang menyerahkan,", "Yang menerima,"].map(
          (t) =>
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: t, size: 22 })] })],
            }),
        ),
      }),
      new TableRow({
        children: [1, 2].map(
          () =>
            new TableCell({
              children: [new Paragraph({ spacing: { before: 1400 }, children: [] })],
            }),
        ),
      }),
      new TableRow({
        children: ["( ....................................... )", "( ....................................... )"].map(
          (t) =>
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: t, size: 22 })] })],
            }),
        ),
      }),
      new TableRow({
        children: ["Mahasiswa KKM Kelompok 45", "Pemerintah Desa Argamukti"].map(
          (t) =>
            new TableCell({
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: t, size: 20, color: ABU })] })],
            }),
        ),
      }),
    ],
  }),
];

// ---------- rakit dokumen ----------

const dok = new Document({
  creator: "KKM Kelompok 45 - Universitas Muhammadiyah Cirebon",
  title: "Buku Panduan Penggunaan AgroMukti",
  description: "Panduan operator Sistem Informasi Terpadu Desa Argamukti",
  numbering: {
    config: [
      {
        reference: "langkah",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 480, hanging: 260 } } },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
  },
  sections: [
    {
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: [
        ...sampul, ...bab1, ...bab2, ...bab3, ...bab4, ...bab5,
        ...bab6, ...bab7, ...bab8, ...bab9, ...bab10, ...bab11, ...penutup,
      ],
    },
  ],
});

const keluaran = path.join(process.cwd(), "docs", "Buku Panduan AgroMukti.docx");
const buf = await Packer.toBuffer(dok);

try {
  fs.writeFileSync(keluaran, buf);
} catch (e) {
  // Penyebab paling sering: dokumennya sedang dibuka di Word, yang mengunci
  // berkasnya. Jejak galat mentah dari Node tidak menjelaskan itu sama
  // sekali, jadi terjemahkan menjadi instruksi yang bisa langsung dikerjakan.
  if (e?.code === "EBUSY" || e?.code === "EPERM") {
    console.error("Gagal menyimpan: berkas panduan sedang dibuka aplikasi lain.");
    console.error("Tutup 'Buku Panduan AgroMukti.docx' di Microsoft Word, lalu jalankan ulang perintah ini.");
    process.exit(1);
  }
  throw e;
}

console.log(`Tersimpan: ${keluaran}`);
console.log(`Ukuran   : ${(buf.length / 1024).toFixed(1)} KB`);
console.log(`Alamat situs yang tercetak: ${ALAMAT_SITUS}`);

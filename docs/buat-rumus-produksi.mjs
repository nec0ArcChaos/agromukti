/**
 * Pembangkit dokumen "Perhitungan Estimasi Produksi Pupuk" (.pdf).
 *
 * Dibuat sebagai skrip, bukan PDF yang disusun tangan, supaya isinya bisa
 * diperbarui mengikuti perubahan rumus di produksi.service.ts tanpa
 * menyusun ulang dari nol. Jalankan: npm run docs:rumus
 *
 * CATATAN TEKNIS: PDFKit memakai font bawaan ber-encoding WinAnsi, yang
 * TIDAK memuat lambang matematika seperti sigma, "kurang lebih", atau
 * "lebih besar sama dengan". Karena itu seluruh rumus di sini ditulis
 * dengan kata dan lambang dasar (x, /, =) - bukan karena disederhanakan,
 * melainkan agar tidak tercetak sebagai karakter rusak.
 */
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const TEAL = "#0f766e";
const ABU = "#64748b";
const ABU_MUDA = "#f1f5f9";
const GELAP = "#0f172a";
const MERAH = "#b91c1c";

const M = 56; // margin
const L = 595.28 - M * 2; // lebar isi (A4 potret)

const dok = new PDFDocument({
  size: "A4",
  // Halaman ditahan di memori supaya nomor halaman bisa dibubuhkan di
  // akhir, saat jumlah halaman seluruhnya baru diketahui.
  bufferPages: true,
  margins: { top: M, bottom: M, left: M, right: M },
  info: {
    Title: "Perhitungan Estimasi Produksi Pupuk - AgroMukti",
    Author: "KKM Kelompok 45 - Universitas Muhammadiyah Cirebon",
    Subject: "Dokumentasi rumus estimasi dan rendemen produksi pupuk organik",
  },
});

const keluaran = path.join(process.cwd(), "docs", "Perhitungan Produksi Pupuk.pdf");
dok.pipe(fs.createWriteStream(keluaran));

// ---------- pembantu penyusun ----------

/** Pindah halaman bila sisa ruang tidak cukup, agar judul tidak yatim. */
const ruang = (butuh) => {
  if (dok.y + butuh > dok.page.height - M) dok.addPage();
};

const judulBab = (teks) => {
  ruang(90);
  dok.moveDown(0.8);
  dok.fillColor(TEAL).font("Helvetica-Bold").fontSize(15).text(teks, { width: L });
  dok.moveTo(M, dok.y + 4).lineTo(M + L, dok.y + 4).lineWidth(1).strokeColor(TEAL).stroke();
  dok.moveDown(0.6);
};

const subJudul = (teks) => {
  ruang(70);
  dok.moveDown(0.4);
  dok.fillColor(GELAP).font("Helvetica-Bold").fontSize(11).text(teks, { width: L });
  dok.moveDown(0.25);
};

const p = (teks) => {
  ruang(40);
  dok.fillColor(GELAP).font("Helvetica").fontSize(9.5).text(teks, { width: L, align: "justify", lineGap: 2.5 });
  dok.moveDown(0.45);
};

const butir = (teks) => {
  ruang(34);
  dok.fillColor(GELAP).font("Helvetica").fontSize(9.5)
    .text(`•  ${teks}`, { width: L, indent: 10, align: "justify", lineGap: 2 });
  dok.moveDown(0.3);
};

/** Blok rumus bergaris tepi, dicetak monospace agar sejajar. */
const rumus = (baris, catatan) => {
  const tinggiBaris = 14;
  const isiTinggi = baris.length * tinggiBaris + (catatan ? 16 : 0) + 20;
  ruang(isiTinggi + 14);

  const y0 = dok.y;
  dok.save();
  dok.rect(M, y0, L, isiTinggi).fill(ABU_MUDA);
  dok.rect(M, y0, 3, isiTinggi).fill(TEAL);
  dok.restore();

  let y = y0 + 10;
  for (const b of baris) {
    dok.fillColor(GELAP).font("Courier-Bold").fontSize(9.5).text(b, M + 16, y, { width: L - 32 });
    y += tinggiBaris;
  }
  if (catatan) {
    dok.fillColor(ABU).font("Helvetica-Oblique").fontSize(8).text(catatan, M + 16, y + 1, { width: L - 32 });
  }

  dok.y = y0 + isiTinggi;
  dok.x = M;
  dok.moveDown(0.6);
};

/** Kotak sorot untuk hal yang tidak boleh terlewat. */
const kotak = (judul, isi, warna = TEAL) => {
  const lebarIsi = L - 32;
  dok.font("Helvetica").fontSize(9);
  let tinggi = 26;
  for (const t of isi) tinggi += dok.heightOfString(t, { width: lebarIsi, lineGap: 2 }) + 5;
  ruang(tinggi + 16);

  const y0 = dok.y;
  dok.save();
  dok.rect(M, y0, L, tinggi).fill("#ffffff");
  dok.rect(M, y0, L, tinggi).lineWidth(0.8).strokeColor(warna).stroke();
  dok.rect(M, y0, 3.5, tinggi).fill(warna);
  dok.restore();

  let y = y0 + 9;
  dok.fillColor(warna).font("Helvetica-Bold").fontSize(9.5).text(judul, M + 16, y, { width: lebarIsi });
  y = dok.y + 3;
  for (const t of isi) {
    dok.fillColor(GELAP).font("Helvetica").fontSize(9).text(t, M + 16, y, { width: lebarIsi, lineGap: 2 });
    y = dok.y + 4;
  }

  dok.y = y0 + tinggi;
  dok.x = M;
  dok.moveDown(0.7);
};

const tabel = (kepala, baris, lebar) => {
  const tinggiBaris = 20;
  ruang((baris.length + 2) * tinggiBaris);

  let y = dok.y;
  let x = M;
  dok.save().rect(M, y, L, tinggiBaris).fill(ABU_MUDA).restore();
  kepala.forEach((h, i) => {
    dok.fillColor(GELAP).font("Helvetica-Bold").fontSize(8.5)
      .text(h, x + 7, y + 6, { width: lebar[i] - 14 });
    x += lebar[i];
  });
  y += tinggiBaris;

  for (const r of baris) {
    let tinggi = tinggiBaris;
    dok.font("Helvetica").fontSize(8.5);
    r.forEach((c, i) => {
      const h = dok.heightOfString(String(c), { width: lebar[i] - 14 }) + 12;
      if (h > tinggi) tinggi = h;
    });
    if (y + tinggi > dok.page.height - M) { dok.addPage(); y = dok.y; }

    x = M;
    r.forEach((c, i) => {
      dok.fillColor(GELAP).font("Helvetica").fontSize(8.5)
        .text(String(c), x + 7, y + 6, { width: lebar[i] - 14 });
      x += lebar[i];
    });
    dok.moveTo(M, y + tinggi).lineTo(M + L, y + tinggi).lineWidth(0.4).strokeColor("#e2e8f0").stroke();
    y += tinggi;
  }

  dok.rect(M, dok.y, L, y - dok.y).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
  dok.y = y;
  dok.x = M;
  dok.moveDown(0.8);
};

// ---------- sampul ----------

dok.moveDown(6);
dok.fillColor(ABU).font("Helvetica-Bold").fontSize(11)
  .text("DOKUMENTASI PERHITUNGAN", { align: "center", characterSpacing: 1.5 });
dok.moveDown(0.5);
dok.fillColor(TEAL).font("Helvetica-Bold").fontSize(30)
  .text("Estimasi Produksi Pupuk", { align: "center" });
dok.moveDown(0.4);
dok.fillColor(GELAP).font("Helvetica").fontSize(12)
  .text("Rumus, sumber angka, dan batas keberlakuannya", { align: "center" });
dok.moveDown(2.5);
dok.fillColor(ABU).font("Helvetica").fontSize(10)
  .text("AgroMukti - Sistem Informasi Terpadu Desa Argamukti", { align: "center" });
dok.moveDown(0.3);
dok.text("Modul Produksi Pupuk  (halaman /produksi)", { align: "center" });
dok.moveDown(4);
dok.fillColor(GELAP).font("Helvetica").fontSize(10)
  .text("Kuliah Kerja Mahasiswa Kelompok 45", { align: "center" });
dok.moveDown(0.3);
dok.text("Universitas Muhammadiyah Cirebon - 2026", { align: "center" });
dok.moveDown(0.3);
dok.fillColor(ABU).text("Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka", { align: "center" });
dok.moveDown(3);
dok.fillColor(ABU).font("Helvetica-Oblique").fontSize(8.5)
  .text(`Dokumen dibuat ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`, { align: "center" });

dok.addPage();

// ---------- 1. Ringkasan ----------

judulBab("1. Apa yang Dihitung dan Kapan");

p("Modul Produksi Pupuk melakukan perhitungan pada dua saat yang berbeda, dan keduanya sering tertukar saat dibaca sepintas. Membedakannya penting, karena yang satu adalah ramalan dan yang lain adalah kenyataan.");

tabel(
  ["Saat", "Yang dihitung", "Sifatnya"],
  [
    ["Saat batch DIMULAI\n(tombol Mulai batch)", "Estimasi hasil kompos padat dan pupuk cair, dari berat bahan baku", "Ramalan. Belum ada barang apa pun."],
    ["Saat batch DIPANEN\n(tombol Panen)", "Rendemen sebenarnya, dari hasil yang benar-benar ditimbang", "Kenyataan. Menjadi dasar penilaian."],
  ],
  [130, 230, 123],
);

p("Operator hanya memasukkan satu angka saat memulai batch, yaitu berat bahan baku. Estimasi tidak lagi diketik sendiri seperti pada versi awal sistem, karena angka tebakan operator tidak dapat ditelusuri asalnya dan berbeda-beda antar petugas.");

kotak("Dua satuan yang tidak boleh dicampur", [
  "Kompos padat diukur dalam KILOGRAM. Pupuk cair diukur dalam LITER.",
  "Karena satuannya berbeda, keduanya TIDAK PERNAH dijumlahkan menjadi satu angka hasil. Sistem menghitung dan melaporkannya sebagai dua besaran terpisah, dengan rumusnya masing-masing.",
  "Menjumlahkan 62 kg kompos dengan 18 liter POC menjadi \"80\" adalah angka yang tidak berarti apa-apa.",
]);

// ---------- 2. Notasi ----------

judulBab("2. Notasi dan Satuan");

tabel(
  ["Lambang dalam dokumen ini", "Nama di sistem", "Satuan"],
  [
    ["B", "beratSampahOrganik - berat bahan baku yang dimasukkan operator", "kg"],
    ["r", "rendemenKomposPersen - rasio anjuran kompos padat, dari Pengaturan", "persen (%)"],
    ["c", "hasilPocLiterPerKg - rasio anjuran pupuk cair, dari Pengaturan", "liter per kg"],
    ["Ep", "estimasiPupukKasar - perkiraan hasil kompos padat", "kg"],
    ["Ec", "estimasiPupukCair - perkiraan hasil pupuk cair", "liter"],
    ["Ap", "pupukKasarAktual - kompos padat yang benar-benar dipanen", "kg"],
    ["Ac", "pupukCairAktual - pupuk cair yang benar-benar dipanen", "liter"],
    ["R", "rendemenPersen - rendemen padat sebenarnya", "persen (%)"],
  ],
  [110, 300, 73],
);

// ---------- 3. Rumus estimasi ----------

judulBab("3. Rumus Estimasi Saat Memulai Batch");

subJudul("3.1  Estimasi kompos padat");

p("Rendemen kompos dinyatakan dalam persen dari berat bahan baku, karena keduanya sama-sama berupa berat. Pembagian dengan 100 mengubah persen menjadi pecahan.");

rumus(
  [
    "Ep = B x (r / 100)",
    "",
    "estimasiPupukKasar = beratSampahOrganik x (rendemenKomposPersen / 100)",
  ],
  "Hasilnya dibulatkan ke 2 angka di belakang koma.",
);

subJudul("3.2  Estimasi pupuk cair");

p("Pupuk cair tidak dapat dinyatakan sebagai persen dari berat, karena satuannya liter sedangkan bahan bakunya kilogram. Persentase antara dua satuan berbeda tidak punya arti. Karena itu rasionya dinyatakan langsung sebagai liter per kilogram bahan, dan tidak perlu dibagi 100.");

rumus(
  [
    "Ec = B x c",
    "",
    "estimasiPupukCair = beratSampahOrganik x hasilPocLiterPerKg",
  ],
  "Hasilnya dibulatkan ke 2 angka di belakang koma.",
);

kotak("Mengapa satu dibagi 100 dan satunya tidak", [
  "Ini bukan ketidakkonsistenan, melainkan konsekuensi dari satuannya.",
  "Rendemen padat: kg dibagi kg menghasilkan bilangan tanpa satuan, sehingga wajar dinyatakan sebagai persen - dan persen harus dibagi 100 sebelum dikalikan.",
  "Hasil cair: liter dibagi kg menghasilkan besaran bersatuan liter/kg, yang sudah berupa pecahan siap kali. Memaksanya menjadi persen justru menyesatkan.",
]);

// ---------- 4. Sumber angka ----------

judulBab("4. Dari Mana Angka Rasio Berasal");

p("Nilai r dan c tidak ditanam mati di dalam kode. Keduanya disimpan sebagai Pengaturan sistem dan dapat diubah Administrator kapan saja tanpa mengutak-atik program. Alasannya sederhana: rendemen nyata bergeser mengikuti metode pengomposan, musim, kadar air, dan komposisi sampah yang masuk. Angka yang benar di satu desa belum tentu benar di desa lain, bahkan belum tentu tetap benar sepanjang tahun di desa yang sama.");

tabel(
  ["Pengaturan", "Nilai bawaan", "Keterangan"],
  [
    ["rendemenKomposPersen (r)", "30 %", "Rentang lazim pengomposan sampah organik rumah tangga adalah sekitar 30-50% dari berat bahan, karena sebagian besar bobot awal berupa air yang menguap selama proses."],
    ["hasilPocLiterPerKg (c)", "0,05 L/kg", "Lindi atau POC yang tertampung umumnya jauh lebih kecil daripada hasil padatnya."],
  ],
  [140, 80, 263],
);

p("Nilai bawaan itu hanya titik awal agar sistem dapat langsung dipakai sebelum desa memiliki data sendiri. Nilai tersebut BUKAN hasil pengukuran di Desa Argamukti, dan wajib disetel ulang setelah beberapa batch pertama selesai.");

kotak("Batas keberlakuan yang harus disadari", [
  "Rumus ini adalah perkalian linear sederhana: hasil dianggap sebanding lurus dengan berat bahan.",
  "Sistem TIDAK memperhitungkan kadar air bahan, perbandingan bahan hijau dan coklat (rasio C:N), suhu, lama pengomposan, maupun metode yang dipakai.",
  "Karena itu estimasi ini adalah ancar-ancar perencanaan - untuk memperkirakan kebutuhan wadah dan jadwal - bukan angka yang boleh dijanjikan kepada petani.",
], MERAH);

// ---------- 5. Rumus rendemen aktual ----------

judulBab("5. Rumus Saat Panen: Rendemen Sebenarnya");

p("Ketika batch dipanen, operator memasukkan hasil yang benar-benar ditimbang. Dari angka itu sistem menghitung rendemen sebenarnya dan menyimpannya pada batch tersebut.");

subJudul("5.1  Rendemen padat");

rumus(
  [
    "R = (Ap / B) x 100",
    "",
    "rendemenPersen = (pupukKasarAktual / beratSampahOrganik) x 100",
  ],
  "Dibulatkan ke 2 angka di belakang koma. Inilah satu-satunya angka yang disimpan sebagai rendemen.",
);

subJudul("5.2  Hasil cair per kilogram bahan");

rumus(
  [
    "hasilCairPerKg = Ac / B",
    "",
    "hasilCairPerKg = pupukCairAktual / beratSampahOrganik",
  ],
  "Dibulatkan ke 4 angka di belakang koma, dihitung saat ditampilkan dan tidak disimpan.",
);

kotak("Kolom Rendemen di tabel hanya mengenai hasil PADAT", [
  "Kolom rendemen pada halaman Produksi Pupuk memuat R saja, yaitu perbandingan kompos padat terhadap bahan baku.",
  "Hasil cair sengaja tidak dimasukkan ke dalam angka itu, karena satuannya berbeda. Hasil cair dilaporkan terpisah sebagai liter per kg bahan.",
]);

// ---------- 6. Contoh ----------

judulBab("6. Contoh Perhitungan Lengkap");

p("Contoh berikut memakai data yang benar-benar ada di sistem, yaitu batch PRD-202609-0001, dengan pengaturan bawaan r = 30% dan c = 0,05 L/kg.");

subJudul("Langkah 1 - Operator memasukkan berat bahan baku");
rumus(["B = 200 kg"]);

subJudul("Langkah 2 - Sistem menghitung estimasi");
rumus([
  "Ep = 200 x (30 / 100)  = 200 x 0,30  = 60,00 kg",
  "Ec = 200 x 0,05                      = 10,00 liter",
]);

subJudul("Langkah 3 - Batch dipanen, hasil ditimbang");
rumus(["Ap = 62 kg kompos padat", "Ac = 18 liter pupuk cair"]);

subJudul("Langkah 4 - Sistem menghitung capaian sebenarnya");
rumus([
  "R              = (62 / 200) x 100 = 31,00 %",
  "hasilCairPerKg = 18 / 200         = 0,0900 liter/kg",
]);

p("Perbandingan estimasi terhadap kenyataan: hasil padat meleset tipis (60 kg diperkirakan, 62 kg tercapai), sedangkan hasil cair meleset cukup jauh (10 liter diperkirakan, 18 liter tercapai). Selisih itulah isyarat bahwa nilai c perlu dinaikkan.");

kotak("Tindak lanjut dari contoh di atas", [
  "Setelah batch ini, pengaturan disetel menjadi r = 31% dan c = 0,09 L/kg agar mengikuti capaian nyata.",
  "Batch berikutnya dengan bahan 20 kg langsung memperkirakan 6,20 kg padat dan 1,80 liter cair - angka yang jauh lebih dekat ke kenyataan lapangan.",
]);

// ---------- 7. Rasio aktual gabungan ----------

judulBab("7. Pembanding: Rasio Aktual Gabungan");

p("Di bawah kotak estimasi pada formulir, sistem menampilkan capaian nyata dari seluruh batch yang berstatus SELESAI. Angka ini menjadi cermin: bila jauh berbeda dari rasio anjuran, berarti pengaturannya sudah tidak mencerminkan kenyataan dan perlu disetel ulang.");

rumus(
  [
    "rasio padat = (Total Ap seluruh batch SELESAI)",
    "              ---------------------------------  x 100",
    "              (Total B seluruh batch SELESAI)",
    "",
    "rasio cair  = (Total Ac seluruh batch SELESAI) / (Total B seluruh batch SELESAI)",
  ],
  "Perhatikan: yang dijumlahkan adalah beratnya lebih dulu, baru dibagi.",
);

subJudul("Mengapa bukan rata-rata dari persentase tiap batch");

p("Cara ini disebut rata-rata tertimbang, dan berbeda hasilnya dari sekadar merata-ratakan angka persen tiap batch. Bila satu batch 5 kg menghasilkan rendemen 50% dan satu batch 500 kg menghasilkan 30%, rata-rata sederhana memberi 40% - seolah batch mungil tadi sepenting batch besar. Membagi total dengan total memberi 30,2%, yang mencerminkan kenyataan bahwa hampir seluruh bahan diolah di batch besar.");

kotak("Batch GAGAL tidak ikut dihitung, dan ini perlu disadari", [
  "Perhitungan di atas hanya mengambil batch berstatus SELESAI. Batch GAGAL - yang menghabiskan bahan baku tetapi tidak menghasilkan apa pun - tidak masuk pembilang maupun penyebut.",
  "Pilihan ini disengaja: angka tersebut dipakai untuk memperkirakan batch baru yang diharapkan berhasil, sehingga kegagalan tidak seharusnya menyeret turun angka anjuran.",
  "Konsekuensinya, angka ini menjawab \"berapa hasilnya bila proses berjalan baik\", BUKAN \"berapa efisiensi keseluruhan\". Bila dari 10 batch ada 5 yang gagal, efisiensi bahan yang sesungguhnya kira-kira separuh dari angka yang tertera.",
  "Untuk menilai efisiensi menyeluruh, bandingkan sendiri jumlah batch SELESAI dan GAGAL pada kartu ringkasan di halaman Produksi Pupuk.",
], MERAH);

// ---------- 8. Pembulatan ----------

judulBab("8. Pembulatan dan Ketelitian Angka");

p("Seluruh perhitungan dikerjakan memakai tipe angka desimal berketelitian tinggi, bukan bilangan pecahan biasa. Ini penting karena pecahan biasa pada komputer menyimpan 0,1 secara tidak persis, dan galat sekecil itu menumpuk bila dijumlahkan berulang kali pada laporan tahunan.");

tabel(
  ["Besaran", "Pembulatan", "Alasan"],
  [
    ["Estimasi padat dan cair", "2 angka di belakang koma", "Setara ketelitian timbangan yang dipakai di lapangan."],
    ["Rendemen padat (R)", "2 angka di belakang koma", "Cukup untuk membandingkan antar batch."],
    ["Hasil cair per kg", "4 angka di belakang koma", "Angkanya kecil, misalnya 0,0900. Pembulatan 2 angka akan membuatnya menjadi 0,09 dan kehilangan perbedaan halus antar batch."],
  ],
  [140, 110, 233],
);

// ---------- 9. Penjagaan ----------

judulBab("9. Penjagaan yang Menyertai Perhitungan");

p("Rumus di atas hanya berjalan bila beberapa syarat terpenuhi. Penjagaan ini ada supaya angka yang tercatat tidak pernah menggambarkan sesuatu yang mustahil terjadi di lapangan.");

butir("Berat bahan baku harus lebih besar dari nol. Batch tanpa bahan tidak masuk akal, dan pembagian dengan nol pada rumus rendemen akan menghasilkan angka tak tentu.");
butir("Bahan baku tidak boleh melebihi stok sampah organik yang tersedia. Bila melebihi, sistem menolak dengan menyebut sisa stok dan jumlah yang diminta.");
butir("Bahan baku langsung dikeluarkan dari stok saat batch dimulai, bukan saat panen, karena fisiknya memang sudah masuk komposter sejak hari itu.");
butir("Panen ditolak bila hasilnya lebih dari nol tetapi produk tujuannya belum ditetapkan. Tanpa itu, hasil panen tidak punya tempat untuk masuk ke stok pupuk.");
butir("Batch yang dipanen tanpa hasil sama sekali dicatat berstatus GAGAL, bukan SELESAI bernilai nol. Kegagalan adalah data evaluasi yang berharga dan tidak seharusnya disamarkan.");
butir("Membatalkan batch yang masih berproses mengembalikan bahan bakunya ke stok, sehingga tidak ada bahan yang hilang tanpa jejak.");

// ---------- 10. Menyetel ----------

judulBab("10. Cara Menyetel Rasio agar Semakin Akurat");

p("Ketelitian estimasi sepenuhnya bergantung pada seberapa dekat rasio anjuran dengan kenyataan di lapangan. Prosedur berikut dianjurkan dijalankan berkala oleh Administrator.");

dok.fillColor(GELAP).font("Helvetica").fontSize(9.5);
[
  "Jalankan sekurang-kurangnya tiga sampai lima batch sampai selesai dengan metode yang sama.",
  "Buka halaman Produksi Pupuk, tekan Mulai batch, lalu masukkan berat bahan apa saja untuk memunculkan kotak estimasi.",
  "Baca baris capaian nyata di bawah kotak estimasi, yang memuat rasio padat dan cair dari seluruh batch selesai.",
  "Bila angkanya berbeda jauh dari rasio anjuran, buka Pengaturan dan sesuaikan rendemenKomposPersen serta hasilPocLiterPerKg mengikuti capaian nyata tersebut.",
  "Ulangi peninjauan setiap pergantian musim atau setiap kali metode pengomposan diubah.",
].forEach((t, i) => {
  ruang(34);
  dok.fillColor(GELAP).font("Helvetica").fontSize(9.5)
    .text(`${i + 1}.  ${t}`, { width: L, indent: 10, align: "justify", lineGap: 2 });
  dok.moveDown(0.3);
});

dok.moveDown(0.3);
kotak("Batas yang dijaga sistem saat menyetel", [
  "rendemenKomposPersen hanya menerima nilai 0 sampai 100. Nilai di luar itu pasti salah ketik - rendemen tidak mungkin melebihi berat bahan bakunya sendiri.",
  "hasilPocLiterPerKg dibatasi paling besar 10 liter per kg sebagai penjaga salah ketik.",
]);

// ---------- 11. Ringkasan rumus ----------

judulBab("11. Ringkasan Seluruh Rumus");

tabel(
  ["Yang dihitung", "Rumus", "Satuan hasil"],
  [
    ["Estimasi kompos padat", "Ep = B x (r / 100)", "kg"],
    ["Estimasi pupuk cair", "Ec = B x c", "liter"],
    ["Rendemen padat sebenarnya", "R = (Ap / B) x 100", "%"],
    ["Hasil cair per kg bahan", "Ac / B", "liter/kg"],
    ["Rasio padat gabungan", "(Total Ap / Total B) x 100", "%"],
    ["Rasio cair gabungan", "Total Ac / Total B", "liter/kg"],
  ],
  [160, 230, 93],
);

p("Seluruh rumus di atas berada pada berkas src/server/modules/produksi/produksi.service.ts, pada fungsi hitungEstimasi, hitungHasil, dan rasioAktual. Bila rumusnya kelak diubah, dokumen ini perlu dibangkitkan ulang dengan perintah npm run docs:rumus agar tidak berbeda dengan yang benar-benar dijalankan sistem.");

// ---------- nomor halaman ----------

const rentang = dok.bufferedPageRange();
for (let i = 0; i < rentang.count; i++) {
  dok.switchToPage(i);
  if (i === 0) continue; // sampul tanpa nomor
  dok.fillColor(ABU).font("Helvetica").fontSize(8);
  dok.text(
    `AgroMukti - Perhitungan Estimasi Produksi Pupuk          ${i + 1}`,
    M,
    dok.page.height - 38,
    { width: L, align: "center" },
  );
}

dok.end();
console.log(`Tersimpan: ${keluaran}`);

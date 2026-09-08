/**
 * Pengisi data contoh AgroMukti (Februari - September 2026).
 *
 * DIPAKAI UNTUK APA
 * Menyiapkan data yang cukup panjang rentang waktunya supaya grafik
 * bulanan pada laporan monitoring benar-benar punya sesuatu untuk
 * digambar. Data bawaan `db:seed` hanya menumpuk di satu-dua hari, jadi
 * grafik "per bulan" hanya akan berisi satu batang.
 *
 * MENGAPA LEWAT SERVICE, BUKAN prisma.create LANGSUNG
 * Semua baris dibuat lewat fungsi layanan yang sama dengan yang dipakai
 * petugas dari layar aplikasi. Dengan begitu buku besar ikut tertulis
 * (MutasiTabungan, MutasiKas, MutasiStokPupuk, MutasiSampahOrganik) dan
 * cache saldo/stok tetap sejalan. Menulis langsung ke tabel akan
 * menghasilkan angka yang kelihatan benar di layar tetapi tidak punya
 * jejak - persis penyakit yang sistem ini hindari.
 *
 * NIK SENGAJA TIDAK DIISI
 * Data ini rekaan. Menaruh nomor induk kependudukan karangan ke dalam
 * dokumen yang diserahkan ke desa berisiko dianggap data asli, jadi kolom
 * NIK dibiarkan kosong dan di laporan tampil sebagai tanda hubung.
 *
 * Jalankan: npm run db:contoh
 */
import { prisma } from "@/server/lib/db";
import { buatNasabah } from "@/server/modules/nasabah/nasabah.service";
import { buatPetani } from "@/server/modules/petani/petani.service";
import { buatSetoran } from "@/server/modules/setoran/setoran.service";
import { buatPengambilan } from "@/server/modules/pengambilan/pengambilan.service";
import { catatSetoranOrganik } from "@/server/modules/organik/organik.service";
import { buatProduksi, panenProduksi } from "@/server/modules/produksi/produksi.service";
import { buatPermintaan, setujuiPermintaan } from "@/server/modules/permintaan/permintaan.service";
import { buatDistribusi, ubahStatusDistribusi } from "@/server/modules/distribusi/distribusi.service";
import { buatProdukUmkm } from "@/server/modules/umkm/umkm.service";

const PENANDA = "Data contoh KKM 45";

/** Pukul 09.00 supaya tanggalnya tidak bergeser saat dibaca sebagai lokal. */
function tgl(bulan: number, hari: number) {
  return new Date(2026, bulan - 1, hari, 9, 0, 0);
}

const WARGA_BARU = [
  { nama: "Enung Nurhayati", dusun: "Cikaracak", rt: "01", rw: "02", noHp: "081324556071", alamat: "Blok Cikaracak" },
  { nama: "Dedi Kurniawan", dusun: "Cikaracak", rt: "02", rw: "02", noHp: "081324556072", alamat: "Blok Cikaracak" },
  { nama: "Yayah Rokayah", dusun: "Apuy", rt: "01", rw: "01", noHp: "081324556073", alamat: "Blok Apuy Tengah" },
  { nama: "Tatang Sutisna", dusun: "Apuy", rt: "03", rw: "01", noHp: "081324556074", alamat: "Blok Apuy Lebak" },
  { nama: "Imas Maesaroh", dusun: "Babakan Kulon", rt: "02", rw: "03", noHp: "081324556075", alamat: "Blok Babakan" },
  { nama: "Endang Suryana", dusun: "Babakan Kulon", rt: "01", rw: "03", noHp: "081324556076", alamat: "Blok Babakan" },
  { nama: "Nining Kurniasih", dusun: "Kliwon", rt: "02", rw: "04", noHp: "081324556077", alamat: "Blok Kliwon" },
  { nama: "Asep Saepudin", dusun: "Kliwon", rt: "03", rw: "04", noHp: "081324556078", alamat: "Blok Kliwon" },
  { nama: "Rohmat Hidayat", dusun: "Cikaracak", rt: "03", rw: "02", noHp: "081324556079", alamat: "Blok Cikaracak" },
  { nama: "Wiwin Winarsih", dusun: "Apuy", rt: "02", rw: "01", noHp: "081324556080", alamat: "Blok Apuy Tengah" },
  { nama: "Oman Abdurahman", dusun: "Babakan Kulon", rt: "03", rw: "03", noHp: "081324556081", alamat: "Blok Babakan" },
  { nama: "Elin Herlina", dusun: "Kliwon", rt: "01", rw: "04", noHp: "081324556082", alamat: "Blok Kliwon" },
];

/** Petani baru diambil dari warga di atas (indeks), lengkap kelompok taninya. */
const PETANI_BARU = [
  { idx: 2, kelompok: "Tani Mukti Jaya" },
  { idx: 3, kelompok: "Tani Mukti Jaya" },
  { idx: 5, kelompok: "Sari Tani Argamukti" },
  { idx: 9, kelompok: "Sari Tani Argamukti" },
];

type Bulanan = {
  bulan: number;
  /** Berat tiap setoran anorganik dalam sebulan, kg. */
  setoran: number[];
  /** Rupiah per kg yang dibayar pengepul bulan itu. */
  hargaPerKg: number;
  /** Hari pengepul datang; null berarti setoran dibiarkan MENUNGGU. */
  hariPengepul: number | null;
  /** Setoran sampah organik: [hari, kg]. */
  organik: [number, number][];
  /** Batch produksi yang dimulai bulan ini. */
  batch: { mulai: number; bahan: number; panenBulan: number; panenHari: number; padat: number; cair: number } | null;
  /** Penyaluran pupuk: [indeks petani, jenis, jumlah, metode bayar, hari]. */
  jual: [number, "PADAT" | "CAIR", number, "SALDO" | "TUNAI" | "SUBSIDI", number][];
};

const RENCANA: Bulanan[] = [
  {
    bulan: 2, setoran: [8, 12, 6, 15, 9, 11, 14, 15], hargaPerKg: 2500, hariPengepul: 26,
    organik: [[4, 120], [11, 150], [18, 130]],
    batch: { mulai: 20, bahan: 380, panenBulan: 3, panenHari: 18, padat: 118, cair: 34 },
    jual: [],
  },
  {
    bulan: 3, setoran: [10, 14, 9, 18, 12, 16, 13, 20], hargaPerKg: 2500, hariPengepul: 27,
    organik: [[5, 160], [12, 140], [19, 130]],
    batch: { mulai: 21, bahan: 410, panenBulan: 4, panenHari: 19, padat: 130, cair: 38 },
    jual: [[0, "PADAT", 50, "SUBSIDI", 22], [1, "PADAT", 20, "SALDO", 24], [2, "CAIR", 6, "TUNAI", 24]],
  },
  {
    bulan: 4, setoran: [12, 16, 11, 20, 14, 18, 15, 22], hargaPerKg: 2600, hariPengepul: 26,
    organik: [[6, 150], [13, 170], [20, 140]],
    batch: { mulai: 22, bahan: 440, panenBulan: 5, panenHari: 20, padat: 134, cair: 40 },
    jual: [[3, "PADAT", 60, "TUNAI", 22], [0, "PADAT", 15, "SALDO", 25], [1, "CAIR", 8, "SUBSIDI", 25]],
  },
  {
    bulan: 5, setoran: [14, 18, 13, 22, 16, 20, 17, 25], hargaPerKg: 2600, hariPengepul: 27,
    organik: [[5, 180], [12, 160], [19, 150]],
    batch: { mulai: 21, bahan: 470, panenBulan: 6, panenHari: 19, padat: 148, cair: 43 },
    jual: [[2, "PADAT", 70, "SUBSIDI", 23], [3, "PADAT", 20, "SALDO", 26], [0, "CAIR", 10, "TUNAI", 26]],
  },
  {
    bulan: 6, setoran: [11, 15, 10, 19, 13, 17, 14, 19], hargaPerKg: 2700, hariPengepul: 26,
    organik: [[4, 150], [11, 140], [18, 130]],
    batch: { mulai: 20, bahan: 400, panenBulan: 7, panenHari: 18, padat: 122, cair: 35 },
    jual: [[1, "PADAT", 80, "TUNAI", 22], [2, "PADAT", 25, "SALDO", 25], [3, "CAIR", 9, "SUBSIDI", 25]],
  },
  {
    bulan: 7, setoran: [16, 20, 15, 24, 18, 22, 19, 26], hargaPerKg: 2700, hariPengepul: 27,
    organik: [[5, 190], [12, 170], [19, 180]],
    batch: { mulai: 21, bahan: 520, panenBulan: 8, panenHari: 19, padat: 165, cair: 47 },
    jual: [[0, "PADAT", 60, "SUBSIDI", 23], [3, "PADAT", 25, "SALDO", 26], [1, "CAIR", 12, "TUNAI", 26]],
  },
  {
    bulan: 8, setoran: [18, 22, 16, 26, 20, 24, 21, 25], hargaPerKg: 2800, hariPengepul: 27,
    organik: [[6, 170], [13, 160], [20, 150]],
    batch: { mulai: 22, bahan: 460, panenBulan: 9, panenHari: 4, padat: 143, cair: 41 },
    jual: [[2, "PADAT", 90, "TUNAI", 24], [0, "PADAT", 30, "SALDO", 26], [3, "CAIR", 10, "SUBSIDI", 26]],
  },
  {
    // September masih berjalan: setorannya sengaja dibiarkan MENUNGGU
    // pengepul supaya keadaan "belum dijemput" ikut terlihat di laporan.
    bulan: 9, setoran: [9, 13, 8, 16, 11, 8], hargaPerKg: 2800, hariPengepul: null,
    organik: [[2, 140], [6, 120]],
    batch: null,
    jual: [[1, "PADAT", 60, "SUBSIDI", 6], [2, "CAIR", 3, "SALDO", 6]],
  },
];

const PRODUK_UMKM_BARU = [
  { kode: "UMKM-02", nama: "Keripik Bawang Daun", kategori: "Makanan Ringan", harga: 12000, stok: 65, satuan: "PCS", deskripsi: "Olahan bawang daun hasil panen Kelompok Tani Mukti Jaya." },
  { kode: "UMKM-03", nama: "Manisan Tomat Argamukti", kategori: "Makanan Ringan", harga: 18000, stok: 32, satuan: "PCS", deskripsi: "Tomat sortiran kualitas baik, diolah ibu-ibu PKK Dusun Apuy." },
  { kode: "UMKM-04", nama: "Kopi Robusta Lereng Ciremai", kategori: "Minuman", harga: 45000, stok: 24, satuan: "PACK", deskripsi: "Kemasan 200 gram, sangrai medium." },
  { kode: "UMKM-05", nama: "Sambal Cabai Gunung", kategori: "Makanan", harga: 25000, stok: 18, satuan: "BOTOL", deskripsi: "Cabai rawit dataran tinggi, tanpa pengawet." },
  { kode: "UMKM-06", nama: "Anyaman Bambu Argamukti", kategori: "Kerajinan", harga: 75000, stok: 9, satuan: "PCS", deskripsi: "Besek dan tampah bambu, pesanan sesuai ukuran." },
  { kode: "UMKM-07", nama: "Pupuk Kompos Kemasan 5 kg", kategori: "Pertanian", harga: 10000, stok: 40, satuan: "KARUNG", deskripsi: "Kompos hasil bank sampah, dikemas untuk pekarangan rumah." },
];

/** Saldo tabungan bank sampah milik seorang petani, 0 bila tak punya rekening aktif. */
async function saldoPetani(petaniId: string) {
  const p = await prisma.petani.findUnique({
    where: { id: petaniId },
    select: { warga: { select: { nasabah: { select: { saldo: true, status: true } } } } },
  });
  return p?.warga.nasabah.find((n) => n.status === "AKTIF")?.saldo ?? 0;
}

async function main() {
  const sudahAda = await prisma.warga.findFirst({ where: { nama: WARGA_BARU[0].nama } });
  if (sudahAda && process.env.PAKSA !== "1") {
    console.log(
      `Data contoh sepertinya sudah pernah diisi (ditemukan warga "${WARGA_BARU[0].nama}"). ` +
        "Dilewati agar tidak dobel.\nJalankan dengan PAKSA=1 bila memang ingin menambah lagi.",
    );
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", aktif: true } });
  if (!admin) throw new Error("Tidak ada akun ADMIN aktif. Jalankan `npm run db:seed` lebih dulu.");

  const pengepul = await prisma.pengepul.findFirst({ where: { aktif: true } });
  if (!pengepul) throw new Error("Belum ada pengepul aktif.");

  const kategori = await prisma.kategoriSampah.findMany({ where: { aktif: true }, orderBy: { kode: "asc" } });
  if (kategori.length === 0) throw new Error("Belum ada kategori sampah aktif.");

  const padat = await prisma.produkPupuk.findUnique({ where: { kode: "PP-KOMPOS" } });
  const cair = await prisma.produkPupuk.findUnique({ where: { kode: "PP-POC" } });
  if (!padat || !cair) throw new Error("Produk pupuk PP-KOMPOS / PP-POC tidak ditemukan.");

  // --- Warga + rekening bank sampah -------------------------------------
  const nasabahBaru: { id: string; wargaId: string; nama: string }[] = [];
  for (const w of WARGA_BARU) {
    const n = await buatNasabah({ warga: w, catatan: PENANDA }, admin.id);
    nasabahBaru.push({ id: n.id, wargaId: n.wargaId, nama: w.nama });
  }
  console.log(`Warga + nasabah baru: ${nasabahBaru.length}`);

  // Setoran perdana Februari didahulukan, karena syarat menjadi petani
  // adalah "sudah punya rekening DAN pernah menyetor".
  const perdana: string[] = [];
  for (let i = 0; i < nasabahBaru.length; i++) {
    const s = await buatSetoran(
      {
        nasabahId: nasabahBaru[i].id,
        kategoriSampahId: kategori[i % kategori.length].id,
        beratKg: 4 + (i % 5),
        tanggal: tgl(2, 3),
        catatan: "Setoran perdana",
      },
      admin.id,
    );
    perdana.push(s.id);
  }
  await buatPengambilan(
    {
      pengepulId: pengepul.id,
      tanggal: tgl(2, 5),
      setoranIds: perdana,
      totalNilai: 150000,
      catatan: "Penjemputan perdana rekening baru",
    },
    admin.id,
  );

  const petaniBaru: string[] = [];
  for (const p of PETANI_BARU) {
    const t = await buatPetani({ wargaId: nasabahBaru[p.idx].wargaId, kelompokTani: p.kelompok }, admin.id);
    petaniBaru.push(t.id);
  }
  console.log(`Petani baru: ${petaniBaru.length}`);

  // --- Putaran bulanan ---------------------------------------------------
  for (const r of RENCANA) {
    // 1. Setoran anorganik warga.
    const idBulanIni: string[] = [];
    let totalKg = 0;
    for (let i = 0; i < r.setoran.length; i++) {
      const nasabah = nasabahBaru[(i + r.bulan) % nasabahBaru.length];
      const s = await buatSetoran(
        {
          nasabahId: nasabah.id,
          kategoriSampahId: kategori[i % kategori.length].id,
          beratKg: r.setoran[i],
          tanggal: tgl(r.bulan, 2 + i * 3),
        },
        admin.id,
      );
      idBulanIni.push(s.id);
      totalKg += r.setoran[i];
    }

    // 2. Pengepul menjemput dan membayar; nilainya masuk tabungan warga.
    if (r.hariPengepul !== null) {
      await buatPengambilan(
        {
          pengepulId: pengepul.id,
          tanggal: tgl(r.bulan, r.hariPengepul),
          setoranIds: idBulanIni,
          totalNilai: Math.round(totalKg * r.hargaPerKg),
          catatan: `Penjemputan rutin bulan ke-${r.bulan}`,
        },
        admin.id,
      );
    }

    // 3. Sampah organik masuk sebagai bahan baku.
    for (const [hari, kg] of r.organik) {
      await catatSetoranOrganik(
        { beratKg: kg, sumber: "Pengumpulan RT/RW", tanggal: tgl(r.bulan, hari), keterangan: PENANDA },
        admin.id,
      );
    }

    // 4. Batch produksi: bahan keluar saat mulai, hasil masuk saat panen.
    if (r.batch) {
      const b = await buatProduksi(
        {
          tanggalMulai: tgl(r.bulan, r.batch.mulai),
          estimasiSelesai: tgl(r.batch.panenBulan, r.batch.panenHari),
          beratSampahOrganik: r.batch.bahan,
          produkPadatId: padat.id,
          produkCairId: cair.id,
          keterangan: "Pengomposan rutin bulanan",
        },
        admin.id,
      );
      await panenProduksi(
        b.id,
        {
          pupukKasarAktual: r.batch.padat,
          pupukCairAktual: r.batch.cair,
          tanggalSelesai: tgl(r.batch.panenBulan, r.batch.panenHari),
        },
        admin.id,
      );
    }

    // 5. Permintaan petani -> disetujui -> disalurkan.
    for (const [idxPetani, jenis, jumlahRencana, metode, hari] of r.jual) {
      const produk = jenis === "PADAT" ? padat : cair;
      let jumlah = jumlahRencana;
      let bayar: "SALDO" | "TUNAI" | "SUBSIDI" = metode;

      // Penebusan dari tabungan dibatasi saldo yang benar-benar ada.
      // Ini bukan akal-akalan supaya skrip lolos - begitulah keadaannya
      // di meja petugas: warga hanya bisa menebus sebanyak yang saldonya
      // sanggup, selebihnya menyetor sampah lagi atau membayar tunai.
      if (bayar === "SALDO") {
        const saldo = await saldoPetani(petaniBaru[idxPetani]);
        const maks = Math.floor(saldo / produk.harga);
        if (maks <= 0) {
          bayar = "TUNAI";
          console.log(`  ~ ${produk.nama}: saldo belum cukup sama sekali, dicatat TUNAI.`);
        } else if (maks < jumlah) {
          console.log(`  ~ ${produk.nama}: ${jumlahRencana} -> ${maks} menyesuaikan saldo yang ada.`);
          jumlah = maks;
        }
      }

      const item = [{ produkPupukId: produk.id, jumlah, satuan: produk.satuan }];

      const permintaan = await buatPermintaan(
        { petaniId: petaniBaru[idxPetani], tanggal: tgl(r.bulan, Math.max(1, hari - 3)), item },
        admin.id,
      );
      await setujuiPermintaan(permintaan.id, admin.id);
      const d = await buatDistribusi(
        { permintaanId: permintaan.id, tanggalDistribusi: tgl(r.bulan, hari), metodeBayar: bayar, item },
        admin.id,
      );
      await ubahStatusDistribusi(d.id, "DITERIMA", admin.id);
    }

    console.log(
      `Bulan ${r.bulan}: ${r.setoran.length} setoran (${totalKg} kg), ` +
        `${r.organik.length} setoran organik, ${r.jual.length} penyaluran`,
    );
  }

  // --- Produk UMKM -------------------------------------------------------
  let umkmBaru = 0;
  for (const p of PRODUK_UMKM_BARU) {
    const ada = await prisma.produkUmkm.findUnique({ where: { kode: p.kode } });
    if (ada) continue;
    await buatProdukUmkm(p, admin.id);
    umkmBaru++;
  }
  console.log(`Produk UMKM ditambahkan: ${umkmBaru}`);
  console.log("Selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

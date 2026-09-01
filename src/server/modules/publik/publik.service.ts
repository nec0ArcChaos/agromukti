import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, NotFoundError } from "@/server/lib/errors";
import { ambilNomor } from "@/server/lib/sequence";
import { keHektare, keKilogram } from "@/server/lib/satuan";

/**
 * Layanan untuk halaman PUBLIK - dapat diakses tanpa login.
 *
 * ATURAN UTAMA BERKAS INI: tidak satu pun fungsi di sini boleh
 * mengembalikan data pribadi. Tidak ada NIK, tidak ada nomor HP, tidak ada
 * alamat rumah, dan tidak ada daftar nama warga.
 *
 * Ini bukan kehati-hatian berlebihan: `api.php` pada sistem lama membuka
 * `SELECT * FROM petani` tanpa autentikasi sama sekali, sehingga NIK
 * seluruh petani desa dapat diunduh siapa pun. Endpoint publik karena itu
 * dibuat sebagai lapisan tersendiri dengan bentuk respons yang sengaja
 * sempit - BUKAN memakai ulang service internal yang memuat lebih banyak.
 */

/** Angka agregat desa. Tidak ada satu pun baris yang bisa ditelusuri ke orang. */
export async function statistikPublik() {
  const [petaniAktif, lahan, panen, produkPupuk, distribusi, setoranAnorganik, organikAgg] =
    await Promise.all([
      prisma.petani.count({ where: { status: "AKTIF" } }),
      prisma.lahan.findMany({ where: { status: "AKTIF" }, select: { luas: true, satuan: true } }),
      prisma.panen.findMany({ select: { jumlahPanen: true, satuan: true } }),
      prisma.produkPupuk.findMany({
        where: { aktif: true },
        select: { nama: true, jenis: true, stok: true, satuan: true },
      }),
      prisma.distribusiPupukDetail.aggregate({ _sum: { jumlah: true } }),
      prisma.setoran.aggregate({ where: { status: { not: "VOID" } }, _sum: { beratKg: true } }),
      prisma.mutasiSampahOrganik.groupBy({ by: ["arah"], _sum: { beratKg: true } }),
    ]);

  const organikTerkumpul = organikAgg
    .filter((a) => a.arah === "MASUK")
    .reduce((acc, a) => acc.add(a._sum.beratKg ?? 0), new Prisma.Decimal(0));

  return {
    petaniAktif,
    totalHektare: lahan.reduce((a, l) => a.add(keHektare(l.luas, l.satuan)), new Prisma.Decimal(0)),
    totalPanenKg: panen.reduce((a, p) => a.add(keKilogram(p.jumlahPanen, p.satuan)), new Prisma.Decimal(0)),
    pupukTersalurkan: distribusi._sum.jumlah ?? new Prisma.Decimal(0),
    stokPupuk: produkPupuk,
    sampahAnorganikKg: setoranAnorganik._sum.beratKg ?? new Prisma.Decimal(0),
    sampahOrganikKg: organikTerkumpul,
  };
}

/** Komoditas + dosis anjuran, untuk kalkulator kebutuhan pupuk di halaman publik. */
export async function komoditasPublik() {
  return prisma.komoditas.findMany({
    where: { aktif: true },
    select: { id: true, nama: true, dosisPupukPerHa: true },
    orderBy: { nama: "asc" },
  });
}

export const skemaCekPermintaan = z.object({
  nomor: z.string().trim().min(1, "Nomor pengajuan wajib diisi."),
  nama: z.string().trim().min(1, "Nama petani wajib diisi."),
});

/**
 * Cek status pengajuan pupuk oleh warga.
 *
 * Nomor pengajuan berurutan (PMT-202609-0001, -0002, ...), jadi kalau
 * nomor saja sudah cukup, siapa pun bisa menebak berurutan dan membaca
 * pengajuan tetangganya. Karena itu nama petani harus ikut cocok, dan yang
 * dikembalikan hanya status serta ringkasan - tanpa data pribadi.
 *
 * Pesan galatnya sengaja sama untuk "nomor tidak ada" maupun "nama tidak
 * cocok", supaya tidak bisa dipakai memastikan nomor mana yang valid.
 */
export async function cekPermintaan(input: z.infer<typeof skemaCekPermintaan>) {
  const p = await prisma.permintaanPupuk.findUnique({
    where: { nomor: input.nomor.toUpperCase() },
    include: {
      petani: { select: { warga: { select: { nama: true } } } },
      detail: { include: { produkPupuk: { select: { nama: true, satuan: true } } } },
      distribusi: { select: { nomor: true, status: true, tanggalDistribusi: true } },
    },
  });

  const cocok =
    p && p.petani.warga.nama.trim().toLowerCase() === input.nama.trim().toLowerCase();

  if (!cocok) {
    throw new NotFoundError("Pengajuan dengan nomor dan nama tersebut");
  }

  return {
    nomor: p.nomor,
    tanggal: p.tanggal,
    status: p.status,
    alasanTolak: p.alasanTolak,
    // Hanya nama depan penanda, bukan identitas lengkap.
    atasNama: p.petani.warga.nama,
    item: p.detail.map((d) => ({
      produk: d.produkPupuk.nama,
      jumlah: d.jumlah,
      satuan: d.produkPupuk.satuan,
    })),
    distribusi: p.distribusi.map((d) => ({
      nomor: d.nomor,
      status: d.status,
      tanggal: d.tanggalDistribusi,
    })),
  };
}

export const skemaVerifikasiPetani = z.object({
  kode: z.string().trim().min(1, "Kode petani wajib diisi."),
  nama: z.string().trim().min(1, "Nama wajib diisi."),
});

/**
 * Memverifikasi petani untuk formulir pengajuan publik.
 *
 * Warga memasukkan kode kartu taninya (TN-0001) beserta namanya. Yang
 * dikembalikan hanya yang dibutuhkan formulir - id, nama, dan daftar
 * lahannya. Tidak ada NIK, nomor HP, maupun alamat.
 */
export async function verifikasiPetani(input: z.infer<typeof skemaVerifikasiPetani>) {
  const petani = await prisma.petani.findUnique({
    where: { kode: input.kode.toUpperCase() },
    include: {
      warga: { select: { nama: true, dusun: true } },
      lahan: {
        where: { status: "AKTIF" },
        select: {
          id: true, luas: true, satuan: true, lokasi: true,
          komoditas: { select: { nama: true, dosisPupukPerHa: true } },
        },
      },
    },
  });

  const cocok =
    petani && petani.warga.nama.trim().toLowerCase() === input.nama.trim().toLowerCase();

  if (!cocok) {
    throw new NotFoundError("Petani dengan kode dan nama tersebut");
  }
  if (petani.status !== "AKTIF") {
    throw new AppError("PETANI_NONAKTIF", "Kartu tani ini berstatus nonaktif. Hubungi petugas desa.", 409);
  }

  return {
    petaniId: petani.id,
    kode: petani.kode,
    nama: petani.warga.nama,
    dusun: petani.warga.dusun,
    kelompokTani: petani.kelompokTani,
    lahan: petani.lahan.map((l) => ({
      id: l.id,
      luas: l.luas,
      satuan: l.satuan,
      lokasi: l.lokasi,
      komoditas: l.komoditas.nama,
      usulanPupukKg: keHektare(l.luas, l.satuan).mul(l.komoditas.dosisPupukPerHa).toDecimalPlaces(2),
    })),
  };
}

export const skemaAjukanPublik = skemaVerifikasiPetani.extend({
  keterangan: z.string().trim().max(500).optional(),
  item: z
    .array(
      z.object({
        produkPupukId: z.string().min(1),
        jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0."),
      }),
    )
    .min(1, "Pilih sekurang-kurangnya satu jenis pupuk."),
});

/**
 * Pengajuan pupuk lewat portal warga, tanpa login.
 *
 * Statusnya tetap DIAJUKAN - pengajuan dari publik tidak pernah langsung
 * disetujui; petugas desa yang memutuskan lewat menu Permintaan Pupuk.
 */
export async function ajukanPublik(input: z.infer<typeof skemaAjukanPublik>) {
  const petani = await verifikasiPetani({ kode: input.kode, nama: input.nama });

  const idProduk = [...new Set(input.item.map((i) => i.produkPupukId))];
  const produkList = await prisma.produkPupuk.findMany({
    where: { id: { in: idProduk }, aktif: true },
  });
  if (produkList.length !== idProduk.length) throw new NotFoundError("Produk pupuk");

  // Satu petani tidak boleh menumpuk pengajuan yang belum diputuskan -
  // tanpa ini, formulir publik bisa dipakai mengirim puluhan pengajuan
  // yang sama dan membanjiri antrean petugas.
  const menggantung = await prisma.permintaanPupuk.count({
    where: { petaniId: petani.petaniId, status: { in: ["DIAJUKAN", "DIPROSES"] } },
  });
  if (menggantung > 0) {
    throw new AppError(
      "MASIH_ADA_PENGAJUAN",
      "Masih ada pengajuan Anda yang belum diputuskan petugas. Tunggu hasilnya sebelum mengajukan lagi.",
      409,
    );
  }

  const tanggal = new Date();
  const petaSatuan = new Map(produkList.map((p) => [p.id, p.satuan]));

  const permintaan = await prisma.$transaction(async (tx) => {
    const nomor = await ambilNomor(tx, "PERMINTAAN", tanggal);
    return tx.permintaanPupuk.create({
      data: {
        nomor,
        petaniId: petani.petaniId,
        tanggal,
        keterangan: input.keterangan
          ? `[Portal warga] ${input.keterangan}`
          : "[Portal warga] Pengajuan mandiri lewat portal publik.",
        detail: {
          create: input.item.map((i) => ({
            produkPupukId: i.produkPupukId,
            jumlah: i.jumlah,
            satuan: petaSatuan.get(i.produkPupukId) ?? "KG",
          })),
        },
      },
    });
  });

  // Hanya nomor yang dikembalikan - warga memakainya untuk cek status.
  return { nomor: permintaan.nomor, status: permintaan.status, tanggal: permintaan.tanggal };
}

/**
 * Cuaca Desa Argamukti dari Open-Meteo.
 *
 * Diambil di sisi server dan di-cache, bukan dari peramban tiap
 * pengunjung. Sistem ini dijalankan di jaringan lokal balai desa yang bisa
 * saja tanpa internet, jadi kegagalan WAJIB tidak menjatuhkan halaman -
 * kembalikan null dan biarkan widget-nya disembunyikan.
 */
export async function cuacaArgamukti() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=-6.9205&longitude=108.3375" +
    "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FJakarta";

  try {
    const res = await fetch(url, {
      next: { revalidate: 900 }, // 15 menit
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      current?: {
        temperature_2m: number;
        relative_humidity_2m: number;
        weather_code: number;
        wind_speed_10m: number;
      };
    };
    if (!data.current) return null;

    return {
      suhu: data.current.temperature_2m,
      kelembaban: data.current.relative_humidity_2m,
      angin: data.current.wind_speed_10m,
      kode: data.current.weather_code,
      keterangan: keteranganCuaca(data.current.weather_code),
    };
  } catch {
    // Tanpa internet, cuaca memang tidak tersedia. Itu bukan galat sistem.
    return null;
  }
}

/** Kode WMO -> keterangan berbahasa Indonesia. */
function keteranganCuaca(kode: number): string {
  if (kode === 0) return "Cerah";
  if (kode <= 2) return "Cerah berawan";
  if (kode === 3) return "Berawan";
  if (kode <= 48) return "Berkabut";
  if (kode <= 57) return "Gerimis";
  if (kode <= 67) return "Hujan";
  if (kode <= 77) return "Hujan es";
  if (kode <= 82) return "Hujan lebat";
  if (kode <= 86) return "Hujan salju";
  return "Badai petir";
}

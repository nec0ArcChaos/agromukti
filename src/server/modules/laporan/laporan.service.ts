import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { totalBerat } from "@/server/lib/money";
import { keHektare, keKilogram } from "@/server/lib/satuan";

type Rentang = { dari?: Date; sampai?: Date };

function filterTanggal(r: Rentang) {
  if (!r.dari && !r.sampai) return {};
  return { gte: r.dari, lte: r.sampai };
}

/**
 * Rekap setoran dikelompokkan menurut kategori sampah, dusun, atau nasabah.
 * Berat dihitung dari SELURUH setoran tidak-VOID di rentang tanggal; nilai
 * rupiah hanya terhitung dari yang sudah DIPROSES (dibeli pengepul) -
 * setoran yang masih MENUNGGU memang belum punya nilai.
 */
export async function laporanSetoran(f: Rentang & { groupBy: "kategori" | "dusun" | "nasabah" }) {
  const rows = await prisma.setoran.findMany({
    where: { status: { not: "VOID" }, tanggal: filterTanggal(f) },
    include: {
      kategoriSampah: { select: { id: true, nama: true } },
      nasabah: { select: { id: true, warga: { select: { nama: true, dusun: true } } } },
    },
  });

  const kunciDari = (s: (typeof rows)[number]) => {
    if (f.groupBy === "kategori") {
      return s.kategoriSampah
        ? { key: s.kategoriSampah.id, label: s.kategoriSampah.nama }
        : { key: "tanpa-kategori", label: "Tanpa kategori" };
    }
    if (f.groupBy === "dusun") {
      return { key: s.nasabah.warga.dusun ?? "-", label: s.nasabah.warga.dusun ?? "Tanpa dusun" };
    }
    return { key: s.nasabahId, label: s.nasabah.warga.nama };
  };

  const peta = new Map<string, { label: string; beratKg: Prisma.Decimal; nilai: number; jumlahSetoran: number }>();
  for (const s of rows) {
    const { key, label } = kunciDari(s);
    const ada = peta.get(key) ?? { label, beratKg: new Prisma.Decimal(0), nilai: 0, jumlahSetoran: 0 };
    ada.beratKg = ada.beratKg.add(s.beratKg);
    ada.nilai += s.nilaiAlokasi ?? 0;
    ada.jumlahSetoran += 1;
    peta.set(key, ada);
  }

  const hasil = [...peta.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.beratKg.comparedTo(a.beratKg));

  return {
    rows: hasil,
    total: {
      beratKg: totalBerat(hasil.map((r) => r.beratKg)),
      nilai: hasil.reduce((acc, r) => acc + r.nilai, 0),
    },
  };
}

/** Posisi saldo seluruh nasabah - total kewajiban lembaga kepada nasabah. */
export async function laporanTabungan() {
  const nasabah = await prisma.nasabah.findMany({
    where: { status: "AKTIF" },
    select: { id: true, kode: true, saldo: true, warga: { select: { nama: true, dusun: true } } },
    orderBy: { saldo: "desc" },
  });

  return {
    rows: nasabah,
    totalKewajiban: nasabah.reduce((acc, n) => acc + n.saldo, 0),
    jumlahNasabah: nasabah.length,
  };
}

/** Nasabah aktif dibanding total, dirinci per dusun. */
export async function laporanPartisipasi() {
  const nasabah = await prisma.nasabah.findMany({ select: { status: true, warga: { select: { dusun: true } } } });

  const peta = new Map<string, { total: number; aktif: number }>();
  for (const n of nasabah) {
    const dusun = n.warga.dusun ?? "Tanpa dusun";
    const ada = peta.get(dusun) ?? { total: 0, aktif: 0 };
    ada.total += 1;
    if (n.status === "AKTIF") ada.aktif += 1;
    peta.set(dusun, ada);
  }

  const rows = [...peta.entries()].map(([dusun, v]) => ({
    dusun,
    total: v.total,
    aktif: v.aktif,
    persentase: v.total ? Math.round((v.aktif / v.total) * 1000) / 10 : 0,
  }));

  return {
    rows,
    total: nasabah.length,
    totalAktif: nasabah.filter((n) => n.status === "AKTIF").length,
  };
}

/** Penerimaan, pengeluaran, saldo kas per periode. */
export async function laporanArusKas(f: Rentang) {
  const mutasi = await prisma.mutasiKas.findMany({
    where: { tanggal: filterTanggal(f) },
    orderBy: { tanggal: "asc" },
  });

  const masuk = mutasi.filter((m) => m.arah === "MASUK");
  const keluar = mutasi.filter((m) => m.arah === "KELUAR");

  const perKategori = new Map<string, number>();
  for (const m of mutasi) {
    const nilai = m.arah === "MASUK" ? m.jumlah : -m.jumlah;
    perKategori.set(m.kategori, (perKategori.get(m.kategori) ?? 0) + nilai);
  }

  const terakhir = await prisma.mutasiKas.findFirst({ orderBy: { createdAt: "desc" } });

  return {
    rows: mutasi,
    totalMasuk: masuk.reduce((acc, m) => acc + m.jumlah, 0),
    totalKeluar: keluar.reduce((acc, m) => acc + m.jumlah, 0),
    perKategori: [...perKategori.entries()].map(([kategori, nilai]) => ({ kategori, nilai })),
    saldoKasSaatIni: terakhir?.saldoSesudah ?? 0,
  };
}

/** Kartu angka utama untuk beranda dasbor. */
export async function ringkasanDashboard() {
  const awalBulan = new Date();
  awalBulan.setDate(1);
  awalBulan.setHours(0, 0, 0, 0);

  const [setoranBulanIni, menunggu, nasabahAktif, saldoKas, kewajibanTabungan, penarikanPending] = await Promise.all([
    prisma.setoran.aggregate({
      where: { status: { not: "VOID" }, tanggal: { gte: awalBulan } },
      _sum: { beratKg: true },
      _count: true,
    }),
    prisma.setoran.aggregate({ where: { status: "MENUNGGU" }, _sum: { beratKg: true }, _count: true }),
    prisma.nasabah.count({ where: { status: "AKTIF" } }),
    prisma.mutasiKas.findFirst({ orderBy: { createdAt: "desc" }, select: { saldoSesudah: true } }),
    prisma.nasabah.aggregate({ _sum: { saldo: true } }),
    prisma.penarikan.count({ where: { status: "PENDING" } }),
  ]);

  return {
    setoranBulanIni: {
      jumlahTransaksi: setoranBulanIni._count,
      totalBeratKg: setoranBulanIni._sum.beratKg ?? new Prisma.Decimal(0),
    },
    menungguDiproses: {
      jumlahSetoran: menunggu._count,
      totalBeratKg: menunggu._sum.beratKg ?? new Prisma.Decimal(0),
    },
    nasabahAktif,
    saldoKasSaatIni: saldoKas?.saldoSesudah ?? 0,
    totalKewajibanTabungan: kewajibanTabungan._sum.saldo ?? 0,
    penarikanMenunggu: penarikanPending,
  };
}

/**
 * Ringkasan lintas tiga pilar untuk beranda.
 *
 * Sengaja satu fungsi, bukan tiga panggilan terpisah dari halaman: beranda
 * adalah tempat pertama yang dibuka operator, dan menjalankan query-nya
 * bersamaan jauh lebih cepat daripada berurutan.
 */
export async function ringkasanTerpadu() {
  const [
    bankSampah,
    stokOrganikAgg,
    produksiAgg,
    petaniAktif,
    lahanAktif,
    panenAgg,
    produkPupuk,
    permintaanMenunggu,
  ] = await Promise.all([
    ringkasanDashboard(),
    prisma.mutasiSampahOrganik.groupBy({ by: ["arah"], _sum: { beratKg: true } }),
    prisma.produksiPupuk.groupBy({ by: ["status"], _count: true }),
    prisma.petani.count({ where: { status: "AKTIF" } }),
    prisma.lahan.findMany({ where: { status: "AKTIF" }, select: { luas: true, satuan: true } }),
    prisma.panen.findMany({ select: { jumlahPanen: true, satuan: true } }),
    prisma.produkPupuk.findMany({ where: { aktif: true }, select: { nama: true, stok: true, satuan: true } }),
    prisma.permintaanPupuk.count({ where: { status: { in: ["DIAJUKAN", "DIPROSES"] } } }),
  ]);

  const stokOrganik = stokOrganikAgg.reduce((acc, a) => {
    const j = a._sum.beratKg ?? new Prisma.Decimal(0);
    return a.arah === "KELUAR" ? acc.sub(j) : acc.add(j);
  }, new Prisma.Decimal(0));

  return {
    bankSampah,
    organik: {
      stokKg: stokOrganik,
      batchProses: produksiAgg.find((s) => s.status === "PROSES")?._count ?? 0,
      batchSelesai: produksiAgg.find((s) => s.status === "SELESAI")?._count ?? 0,
    },
    pertanian: {
      petaniAktif,
      totalHektare: lahanAktif.reduce((a, l) => a.add(keHektare(l.luas, l.satuan)), new Prisma.Decimal(0)),
      totalPanenKg: panenAgg.reduce((a, p) => a.add(keKilogram(p.jumlahPanen, p.satuan)), new Prisma.Decimal(0)),
      permintaanMenunggu,
      stokPupuk: produkPupuk,
    },
  };
}

import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/lib/db";
import {
  buatProduksi, panenProduksi, batalProduksi,
  hitungEstimasi, rasioAktual, ringkasanProduksi, daftarProduksi,
} from "./produksi.service";
import { stokOrganik } from "@/server/modules/organik/organik.service";
import { siapkanDasar, isiStokOrganik, tutupKoneksi, type Dasar } from "@/server/uji/persiapan";

let d: Dasar;

async function siap(opsi?: { rendemenPersen?: number; pocPerKg?: number; stokKg?: number }) {
  d = await siapkanDasar(opsi);
  await isiStokOrganik(opsi?.stokKg ?? 1000, d.operator.id);
  return d;
}

beforeEach(async () => { await siap(); });
afterAll(async () => { await tutupKoneksi(); });

describe("Estimasi hasil produksi", () => {
  it("menghitung estimasi dari berat bahan memakai rasio di Pengaturan", async () => {
    const e = await hitungEstimasi(200);
    // 200 kg x 30% = 60 kg ; 200 kg x 0,05 L/kg = 10 liter
    expect(Number(e.estimasiPupukKasar)).toBe(60);
    expect(Number(e.estimasiPupukCair)).toBe(10);
  });

  it("mengikuti perubahan rasio pada Pengaturan, bukan angka mati di kode", async () => {
    await prisma.pengaturan.update({
      where: { id: "SINGLETON" },
      data: { rendemenKomposPersen: 31, hasilPocLiterPerKg: 0.09 },
    });
    const e = await hitungEstimasi(200);
    expect(Number(e.estimasiPupukKasar)).toBe(62);
    expect(Number(e.estimasiPupukCair)).toBe(18);
  });

  it("mengembalikan nol untuk berat nol tanpa membuat galat", async () => {
    const e = await hitungEstimasi(0);
    expect(Number(e.estimasiPupukKasar)).toBe(0);
    expect(Number(e.estimasiPupukCair)).toBe(0);
  });
});

describe("Memulai batch produksi", () => {
  it("mengeluarkan bahan baku dari stok organik saat batch dimulai", async () => {
    const sebelum = Number(await stokOrganik());
    await buatProduksi(
      { beratSampahOrganik: 300, produkPadatId: d.padat.id, produkCairId: d.cair.id },
      d.operator.id,
    );
    expect(Number(await stokOrganik())).toBe(sebelum - 300);
  });

  it("menyimpan estimasi hasil pada batch, bukan menghitung ulang tiap dibaca", async () => {
    const b = await buatProduksi({ beratSampahOrganik: 200, produkPadatId: d.padat.id }, d.operator.id);
    expect(Number(b.estimasiPupukKasar)).toBe(60);
    expect(b.status).toBe("PROSES");
  });

  it("MENOLAK batch yang bahannya melebihi stok organik yang ada", async () => {
    await expect(
      buatProduksi({ beratSampahOrganik: 5000, produkPadatId: d.padat.id }, d.operator.id),
    ).rejects.toMatchObject({ kode: "STOK_ORGANIK_TIDAK_CUKUP" });
  });

  it("tidak mengurangi stok sama sekali ketika batch ditolak", async () => {
    const sebelum = Number(await stokOrganik());
    await expect(
      buatProduksi({ beratSampahOrganik: 5000, produkPadatId: d.padat.id }, d.operator.id),
    ).rejects.toThrow();
    expect(Number(await stokOrganik())).toBe(sebelum);
  });
});

describe("Memanen batch", () => {
  it("memasukkan hasil panen ke stok pupuk padat dan cair", async () => {
    const b = await buatProduksi(
      { beratSampahOrganik: 400, produkPadatId: d.padat.id, produkCairId: d.cair.id },
      d.operator.id,
    );
    await panenProduksi(b.id, { pupukKasarAktual: 124, pupukCairAktual: 36 }, d.operator.id);

    const padat = await prisma.produkPupuk.findUniqueOrThrow({ where: { id: d.padat.id } });
    const cair = await prisma.produkPupuk.findUniqueOrThrow({ where: { id: d.cair.id } });
    expect(Number(padat.stok)).toBe(124);
    expect(Number(cair.stok)).toBe(36);
  });

  it("menghitung rendemen padat dari hasil nyata, bukan dari estimasi", async () => {
    const b = await buatProduksi(
      { beratSampahOrganik: 400, produkPadatId: d.padat.id, produkCairId: d.cair.id },
      d.operator.id,
    );
    // Estimasi 30% (120 kg), tetapi hasil sebenarnya 124 kg -> 31%.
    const hasil = await panenProduksi(b.id, { pupukKasarAktual: 124, pupukCairAktual: 36 }, d.operator.id);
    expect(Number(hasil.rendemenPadatPersen)).toBe(31);
    expect(Number(hasil.hasilCairPerKg)).toBe(0.09);
  });

  it("mencatat batch tanpa hasil sebagai GAGAL, bukan SELESAI bernilai nol", async () => {
    const b = await buatProduksi({ beratSampahOrganik: 100, produkPadatId: d.padat.id }, d.operator.id);
    const hasil = await panenProduksi(b.id, { pupukKasarAktual: 0, pupukCairAktual: 0 }, d.operator.id);
    expect(hasil.status).toBe("GAGAL");
  });

  it("MENOLAK panen bila produk tujuan hasil padat belum ditetapkan", async () => {
    const b = await buatProduksi({ beratSampahOrganik: 100 }, d.operator.id);
    await expect(
      panenProduksi(b.id, { pupukKasarAktual: 30, pupukCairAktual: 0 }, d.operator.id),
    ).rejects.toMatchObject({ kode: "PRODUK_PADAT_BELUM_DITETAPKAN" });
  });

  it("MENOLAK panen ulang atas batch yang sudah selesai", async () => {
    const b = await buatProduksi({ beratSampahOrganik: 100, produkPadatId: d.padat.id }, d.operator.id);
    await panenProduksi(b.id, { pupukKasarAktual: 30, pupukCairAktual: 0 }, d.operator.id);
    await expect(
      panenProduksi(b.id, { pupukKasarAktual: 30, pupukCairAktual: 0 }, d.operator.id),
    ).rejects.toMatchObject({ kode: "BUKAN_PROSES" });
  });

  it("tidak menambah stok dua kali ketika panen ulang ditolak", async () => {
    const b = await buatProduksi({ beratSampahOrganik: 100, produkPadatId: d.padat.id }, d.operator.id);
    await panenProduksi(b.id, { pupukKasarAktual: 30, pupukCairAktual: 0 }, d.operator.id);
    await expect(
      panenProduksi(b.id, { pupukKasarAktual: 30, pupukCairAktual: 0 }, d.operator.id),
    ).rejects.toThrow();

    const padat = await prisma.produkPupuk.findUniqueOrThrow({ where: { id: d.padat.id } });
    expect(Number(padat.stok)).toBe(30);
  });
});

describe("Membatalkan batch", () => {
  it("mengembalikan bahan baku ke stok organik", async () => {
    const sebelum = Number(await stokOrganik());
    const b = await buatProduksi({ beratSampahOrganik: 250, produkPadatId: d.padat.id }, d.operator.id);
    expect(Number(await stokOrganik())).toBe(sebelum - 250);

    await batalProduksi(b.id, "Komposter bocor", d.operator.id);
    expect(Number(await stokOrganik())).toBe(sebelum);
  });

  it("MENOLAK pembatalan batch yang sudah selesai", async () => {
    const b = await buatProduksi({ beratSampahOrganik: 100, produkPadatId: d.padat.id }, d.operator.id);
    await panenProduksi(b.id, { pupukKasarAktual: 30, pupukCairAktual: 0 }, d.operator.id);
    await expect(batalProduksi(b.id, "salah catat", d.operator.id)).rejects.toMatchObject({
      kode: "BUKAN_PROSES",
    });
  });
});

describe("Buku besar tetap seimbang", () => {
  it("jumlah mutasi organik selalu sama dengan stok yang dilaporkan", async () => {
    const b1 = await buatProduksi({ beratSampahOrganik: 300, produkPadatId: d.padat.id }, d.operator.id);
    await buatProduksi({ beratSampahOrganik: 200, produkPadatId: d.padat.id }, d.operator.id);
    await batalProduksi(b1.id, "uji", d.operator.id);

    const mutasi = await prisma.mutasiSampahOrganik.findMany();
    const hitungSendiri = mutasi.reduce(
      (a, m) => (m.arah === "KELUAR" ? a - Number(m.beratKg) : a + Number(m.beratKg)), 0,
    );
    expect(Number(await stokOrganik())).toBe(hitungSendiri);
    expect(hitungSendiri).toBe(800); // 1000 - 300 - 200 + 300
  });

  it("jumlah mutasi stok pupuk selalu sama dengan angka stok pada produk", async () => {
    const b = await buatProduksi(
      { beratSampahOrganik: 400, produkPadatId: d.padat.id, produkCairId: d.cair.id },
      d.operator.id,
    );
    await panenProduksi(b.id, { pupukKasarAktual: 124, pupukCairAktual: 36 }, d.operator.id);

    for (const id of [d.padat.id, d.cair.id]) {
      const mutasi = await prisma.mutasiStokPupuk.findMany({ where: { produkPupukId: id } });
      const dariBukuBesar = mutasi.reduce(
        (a, m) => (m.arah === "KELUAR" ? a - Number(m.jumlah) : a + Number(m.jumlah)), 0,
      );
      const produk = await prisma.produkPupuk.findUniqueOrThrow({ where: { id } });
      expect(Number(produk.stok)).toBe(dariBukuBesar);
    }
  });
});

describe("Rasio aktual dan ringkasan", () => {
  it("mengabaikan batch GAGAL saat menghitung rasio yang tercapai", async () => {
    const b1 = await buatProduksi(
      { beratSampahOrganik: 400, produkPadatId: d.padat.id, produkCairId: d.cair.id },
      d.operator.id,
    );
    await panenProduksi(b1.id, { pupukKasarAktual: 124, pupukCairAktual: 36 }, d.operator.id);

    const b2 = await buatProduksi({ beratSampahOrganik: 400, produkPadatId: d.padat.id }, d.operator.id);
    await panenProduksi(b2.id, { pupukKasarAktual: 0, pupukCairAktual: 0 }, d.operator.id); // GAGAL

    const r = await rasioAktual();
    // Kalau batch gagal ikut dihitung, rendemennya akan jadi 15,5 persen.
    expect(r?.jumlahBatch).toBe(1);
    expect(Number(r?.rendemenPersen)).toBe(31);
  });

  it("mengembalikan null selama belum ada batch yang selesai", async () => {
    expect(await rasioAktual()).toBeNull();
  });

  it("ringkasan hanya menjumlahkan batch SELESAI", async () => {
    const b1 = await buatProduksi(
      { beratSampahOrganik: 400, produkPadatId: d.padat.id, produkCairId: d.cair.id },
      d.operator.id,
    );
    await panenProduksi(b1.id, { pupukKasarAktual: 124, pupukCairAktual: 36 }, d.operator.id);
    await buatProduksi({ beratSampahOrganik: 100, produkPadatId: d.padat.id }, d.operator.id);

    const r = await ringkasanProduksi();
    expect(Number(r.totalBahanKg)).toBe(400);
    expect(Number(r.totalPadatKg)).toBe(124);
    expect(Number(r.totalCairLiter)).toBe(36);
  });

  it("daftar produksi menyertakan rendemen hasil hitung untuk tiap baris", async () => {
    const b = await buatProduksi(
      { beratSampahOrganik: 400, produkPadatId: d.padat.id, produkCairId: d.cair.id },
      d.operator.id,
    );
    await panenProduksi(b.id, { pupukKasarAktual: 124, pupukCairAktual: 36 }, d.operator.id);

    const { rows, total } = await daftarProduksi({ page: 1, perPage: 20 });
    expect(total).toBe(1);
    expect(Number(rows[0].rendemenPadatPersen)).toBe(31);
  });
});

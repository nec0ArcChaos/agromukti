import { beforeEach, afterAll, describe, expect, it } from "vitest";
import {
  buatProdukUmkm, ubahProdukUmkm, ambilProdukUmkm, daftarProdukUmkm,
  skemaBuatProdukUmkm, skemaUbahProdukUmkm,
} from "./umkm.service";
import { siapkanDasar, tutupKoneksi, type Dasar } from "@/server/uji/persiapan";

let d: Dasar;

beforeEach(async () => { d = await siapkanDasar(); });
afterAll(async () => { await tutupKoneksi(); });

const contoh = {
  kode: "UMKM-UJI-01",
  nama: "Keripik Bawang Daun",
  kategori: "Makanan Ringan",
  harga: 12000,
  stok: 40,
  satuan: "PCS",
};

describe("Mencatat produk UMKM", () => {
  it("menyimpan produk baru dengan status TERSEDIA", async () => {
    const p = await buatProdukUmkm(contoh, d.operator.id);
    expect(p.kode).toBe("UMKM-UJI-01");
    expect(p.harga).toBe(12000);
    expect(Number(p.stok)).toBe(40);
    expect(p.status).toBe("TERSEDIA");
  });

  it("MENOLAK kode yang sudah dipakai produk lain", async () => {
    await buatProdukUmkm(contoh, d.operator.id);
    await expect(
      buatProdukUmkm({ ...contoh, nama: "Produk lain" }, d.operator.id),
    ).rejects.toMatchObject({ kode: "KODE_DIPAKAI" });
  });

  it("mencatat jejak audit untuk setiap produk yang dibuat", async () => {
    const p = await buatProdukUmkm(contoh, d.operator.id);
    const { prisma } = await import("@/server/lib/db");
    const jejak = await prisma.auditLog.findFirst({
      where: { tabel: "ProdukUmkm", recordId: p.id, aksi: "CREATE" },
    });
    expect(jejak).not.toBeNull();
  });
});

describe("Penjagaan masukan", () => {
  it("MENOLAK harga bernilai negatif", () => {
    const h = skemaBuatProdukUmkm.safeParse({ ...contoh, harga: -1 });
    expect(h.success).toBe(false);
  });

  it("MENOLAK stok bernilai negatif", () => {
    const h = skemaBuatProdukUmkm.safeParse({ ...contoh, stok: -5 });
    expect(h.success).toBe(false);
  });

  it("MENOLAK harga pecahan - rupiah dicatat sebagai bilangan bulat", () => {
    const h = skemaBuatProdukUmkm.safeParse({ ...contoh, harga: 12000.5 });
    expect(h.success).toBe(false);
  });

  it("MENOLAK nama kosong maupun berisi spasi saja", () => {
    expect(skemaBuatProdukUmkm.safeParse({ ...contoh, nama: "" }).success).toBe(false);
    expect(skemaBuatProdukUmkm.safeParse({ ...contoh, nama: "   " }).success).toBe(false);
  });

  it("MENOLAK status di luar tiga nilai yang dikenal", () => {
    expect(skemaUbahProdukUmkm.safeParse({ status: "DISKON" }).success).toBe(false);
  });

  it("menerima stok pecahan, karena ada produk yang dijual per kilogram", () => {
    const h = skemaBuatProdukUmkm.safeParse({ ...contoh, stok: 2.5, satuan: "KG" });
    expect(h.success).toBe(true);
  });

  it("membuang spasi berlebih pada kode dan nama", async () => {
    // Melalui skema lebih dulu, persis seperti rute API melakukannya:
    // src/app/api/produk-umkm/route.ts memanggil
    // skemaBuatProdukUmkm.parse() sebelum meneruskan ke service.
    // Memanggil service langsung dengan masukan mentah tidak mewakili
    // jalur yang benar-benar ditempuh aplikasi.
    const bersih = skemaBuatProdukUmkm.parse({
      ...contoh, kode: "  UMKM-UJI-09  ", nama: "  Sambal Cabai  ",
    });
    const p = await buatProdukUmkm(bersih, d.operator.id);
    expect(p.kode).toBe("UMKM-UJI-09");
    expect(p.nama).toBe("Sambal Cabai");
  });

  it("service memercayai pemanggilnya - pembersihan masukan ada di batas API", async () => {
    // Uji ini bukan menuntut perilaku tertentu, melainkan MENCATAT
    // pembagian tugas yang berlaku sekarang: skema Zod dijalankan di rute,
    // bukan di dalam service. Selama seluruh rute memanggil .parse(),
    // aturan itu terjaga. Bila kelak ada pemanggil baru yang lupa - misalnya
    // skrip pengisi data - masukan kotor akan masuk tanpa dicegat.
    const p = await buatProdukUmkm(
      { ...contoh, kode: "  UMKM-UJI-10  ", nama: "Tanpa Skema" },
      d.operator.id,
    );
    expect(p.kode).toBe("  UMKM-UJI-10  ");
  });
});

describe("Mengubah produk", () => {
  it("mengubah status menjadi HABIS dengan sendirinya ketika stok jadi nol", async () => {
    const p = await buatProdukUmkm(contoh, d.operator.id);
    const u = await ubahProdukUmkm(p.id, { stok: 0 }, d.operator.id);
    expect(u.status).toBe("HABIS");
  });

  it("mengembalikan status ke TERSEDIA ketika stok diisi lagi", async () => {
    const p = await buatProdukUmkm({ ...contoh, stok: 0 }, d.operator.id);
    const u = await ubahProdukUmkm(p.id, { stok: 12 }, d.operator.id);
    expect(u.status).toBe("TERSEDIA");
  });

  it("TIDAK menghidupkan kembali produk yang sengaja dinonaktifkan, meski stoknya diisi", async () => {
    const p = await buatProdukUmkm(contoh, d.operator.id);
    await ubahProdukUmkm(p.id, { status: "NONAKTIF" }, d.operator.id);
    const u = await ubahProdukUmkm(p.id, { stok: 99 }, d.operator.id);
    expect(u.status).toBe("NONAKTIF");
  });

  it("mempertahankan stok lama ketika yang diubah hanya harganya", async () => {
    const p = await buatProdukUmkm(contoh, d.operator.id);
    const u = await ubahProdukUmkm(p.id, { harga: 15000 }, d.operator.id);
    expect(u.harga).toBe(15000);
    expect(Number(u.stok)).toBe(40);
    expect(u.status).toBe("TERSEDIA");
  });

  it("MENOLAK perubahan atas produk yang tidak ada", async () => {
    await expect(
      ubahProdukUmkm("id-yang-tidak-ada", { harga: 1000 }, d.operator.id),
    ).rejects.toMatchObject({ kode: "TIDAK_DITEMUKAN" });
  });
});

describe("Membaca katalog", () => {
  it("menyaring hanya produk berstatus TERSEDIA bila diminta", async () => {
    await buatProdukUmkm(contoh, d.operator.id);
    const habis = await buatProdukUmkm({ ...contoh, kode: "UMKM-UJI-02", nama: "Manisan" }, d.operator.id);
    await ubahProdukUmkm(habis.id, { stok: 0 }, d.operator.id);

    expect((await daftarProdukUmkm()).length).toBe(2);
    expect((await daftarProdukUmkm(true)).length).toBe(1);
  });

  it("mengurutkan katalog menurut nama produk", async () => {
    await buatProdukUmkm({ ...contoh, kode: "U-1", nama: "Wajik Tomat" }, d.operator.id);
    await buatProdukUmkm({ ...contoh, kode: "U-2", nama: "Anyaman Bambu" }, d.operator.id);
    const daftar = await daftarProdukUmkm();
    expect(daftar.map((x) => x.nama)).toEqual(["Anyaman Bambu", "Wajik Tomat"]);
  });

  it("MENOLAK pembacaan produk yang tidak ada, bukan mengembalikan kosong diam-diam", async () => {
    await expect(ambilProdukUmkm("id-karangan")).rejects.toMatchObject({ kode: "TIDAK_DITEMUKAN" });
  });
});

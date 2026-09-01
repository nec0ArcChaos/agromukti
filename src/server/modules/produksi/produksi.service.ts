import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { AppError, ConflictError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import { tulisMutasiOrganik } from "@/server/modules/organik/organik.service";
import { tulisMutasiStok } from "@/server/modules/pupuk/pupuk.service";

export const skemaBuatProduksi = z.object({
  tanggalMulai: z.coerce.date().optional(),
  estimasiSelesai: z.coerce.date().optional(),
  beratSampahOrganik: z.coerce.number().positive("Berat bahan baku harus lebih dari 0."),
  estimasiPupukCair: z.coerce.number().min(0).default(0),
  estimasiPupukKasar: z.coerce.number().min(0).default(0),
  /// Produk tujuan hasil panen nanti.
  produkPadatId: z.string().min(1).optional(),
  produkCairId: z.string().min(1).optional(),
  keterangan: z.string().trim().optional(),
});

export const skemaPanenProduksi = z.object({
  pupukKasarAktual: z.coerce.number().min(0).default(0),
  pupukCairAktual: z.coerce.number().min(0).default(0),
  tanggalSelesai: z.coerce.date().optional(),
  keterangan: z.string().trim().optional(),
});

export const skemaFilterProduksi = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PROSES", "SELESAI", "GAGAL", "DIBATALKAN"]).optional(),
});

const SERTAKAN = {
  produkPadat: { select: { id: true, nama: true, satuan: true } },
  produkCair: { select: { id: true, nama: true, satuan: true } },
} satisfies Prisma.ProduksiPupukInclude;

/**
 * Hasil panen dilaporkan terpisah menurut satuannya.
 *
 * Output padat bersatuan kg dan cair bersatuan liter - menjumlahkan
 * keduanya untuk mendapat satu angka "rendemen" adalah pencampuran
 * satuan, dan angkanya tidak berarti apa-apa. Karena itu:
 *   - rendemenPadatPersen : kg kompos / kg bahan baku x 100
 *   - hasilCairPerKg      : liter POC per kg bahan baku
 */
function hitungHasil(beratBahan: Prisma.Decimal, padat: Prisma.Decimal | null, cair: Prisma.Decimal | null) {
  if (beratBahan.lessThanOrEqualTo(0)) return { rendemenPadatPersen: null, hasilCairPerKg: null };
  return {
    rendemenPadatPersen: padat ? padat.div(beratBahan).mul(100).toDecimalPlaces(2) : null,
    hasilCairPerKg: cair ? cair.div(beratBahan).toDecimalPlaces(4) : null,
  };
}

export async function daftarProduksi(f: z.infer<typeof skemaFilterProduksi>) {
  const where: Prisma.ProduksiPupukWhereInput = f.status ? { status: f.status } : {};

  const [rows, total] = await Promise.all([
    prisma.produksiPupuk.findMany({
      where,
      include: SERTAKAN,
      orderBy: { tanggalMulai: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.produksiPupuk.count({ where }),
  ]);

  return {
    rows: rows.map((p) => ({ ...p, ...hitungHasil(p.beratSampahOrganik, p.pupukKasarAktual, p.pupukCairAktual) })),
    total,
  };
}

export async function ambilProduksi(id: string) {
  const p = await prisma.produksiPupuk.findUnique({ where: { id }, include: SERTAKAN });
  if (!p) throw new NotFoundError("Produksi pupuk");
  return { ...p, ...hitungHasil(p.beratSampahOrganik, p.pupukKasarAktual, p.pupukCairAktual) };
}

/**
 * Memulai batch produksi: bahan baku organik langsung KELUAR dari stok,
 * karena fisiknya memang sudah masuk komposter sejak batch dimulai.
 */
export async function buatProduksi(input: z.infer<typeof skemaBuatProduksi>, operatorId: string) {
  for (const [label, id] of [["padat", input.produkPadatId], ["cair", input.produkCairId]] as const) {
    if (id) {
      const produk = await prisma.produkPupuk.findUnique({ where: { id } });
      if (!produk) throw new NotFoundError(`Produk pupuk ${label}`);
    }
  }

  const tanggal = input.tanggalMulai ?? new Date();

  const produksi = await prisma.$transaction(async (tx) => {
    const kode = await ambilNomor(tx, "PRODUKSI", tanggal);

    const dibuat = await tx.produksiPupuk.create({
      data: {
        kode,
        tanggalMulai: tanggal,
        estimasiSelesai: input.estimasiSelesai,
        beratSampahOrganik: input.beratSampahOrganik,
        estimasiPupukCair: input.estimasiPupukCair,
        estimasiPupukKasar: input.estimasiPupukKasar,
        produkPadatId: input.produkPadatId,
        produkCairId: input.produkCairId,
        keterangan: input.keterangan,
        operatorId,
      },
    });

    await tulisMutasiOrganik(tx, {
      arah: "KELUAR",
      beratKg: input.beratSampahOrganik,
      refTipe: "PRODUKSI",
      refId: dibuat.id,
      sumber: `Produksi ${kode}`,
      keterangan: "Bahan baku masuk komposter",
      operatorId,
      tanggal,
    });

    await catatAudit(
      {
        userId: operatorId,
        aksi: "CREATE",
        tabel: "ProduksiPupuk",
        recordId: dibuat.id,
        dataBaru: { kode, beratSampahOrganik: input.beratSampahOrganik },
      },
      tx,
    );

    return dibuat;
  });

  return ambilProduksi(produksi.id);
}

/**
 * Memanen batch: hasil aktual dicatat, lalu MASUK ke stok pupuk pilar
 * pertanian. Inilah titik sambung ekonomi sirkular - sampah organik warga
 * berakhir sebagai stok pupuk yang bisa disalurkan ke petani.
 */
export async function panenProduksi(
  id: string,
  input: z.infer<typeof skemaPanenProduksi>,
  operatorId: string,
) {
  const p = await prisma.produksiPupuk.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Produksi pupuk");
  if (p.status !== "PROSES") {
    throw new ConflictError("BUKAN_PROSES", `Produksi ${p.kode} berstatus ${p.status}, tidak bisa dipanen lagi.`);
  }

  if (input.pupukKasarAktual > 0 && !p.produkPadatId) {
    throw new AppError(
      "PRODUK_PADAT_BELUM_DITETAPKAN",
      `Produksi ${p.kode} menghasilkan kompos padat, tetapi produk tujuannya belum ditetapkan. ` +
        `Tetapkan dulu produk padat pada batch ini agar hasilnya bisa masuk stok.`,
      409,
    );
  }
  if (input.pupukCairAktual > 0 && !p.produkCairId) {
    throw new AppError(
      "PRODUK_CAIR_BELUM_DITETAPKAN",
      `Produksi ${p.kode} menghasilkan pupuk cair, tetapi produk tujuannya belum ditetapkan.`,
      409,
    );
  }

  const tanggalSelesai = input.tanggalSelesai ?? new Date();
  const gagal = input.pupukKasarAktual === 0 && input.pupukCairAktual === 0;

  const hasil = await prisma.$transaction(async (tx) => {
    const padat = new Prisma.Decimal(input.pupukKasarAktual);
    const cair = new Prisma.Decimal(input.pupukCairAktual);
    const { rendemenPadatPersen } = hitungHasil(p.beratSampahOrganik, padat, cair);

    const diperbarui = await tx.produksiPupuk.update({
      where: { id },
      data: {
        pupukKasarAktual: padat,
        pupukCairAktual: cair,
        rendemenPersen: rendemenPadatPersen,
        tanggalSelesai,
        // Batch tanpa hasil sama sekali dicatat GAGAL, bukan SELESAI -
        // kegagalan adalah data yang berharga untuk evaluasi, bukan
        // sesuatu yang perlu disamarkan jadi keberhasilan bernilai nol.
        status: gagal ? "GAGAL" : "SELESAI",
        keterangan: input.keterangan ?? p.keterangan,
      },
    });

    if (input.pupukKasarAktual > 0 && p.produkPadatId) {
      await tulisMutasiStok(tx, {
        produkPupukId: p.produkPadatId,
        arah: "MASUK",
        jumlah: padat,
        refTipe: "PRODUKSI",
        refId: id,
        sumber: `Produksi ${p.kode}`,
        keterangan: `Hasil pengolahan ${p.beratSampahOrganik.toString()} kg sampah organik`,
        tanggal: tanggalSelesai,
      });
    }
    if (input.pupukCairAktual > 0 && p.produkCairId) {
      await tulisMutasiStok(tx, {
        produkPupukId: p.produkCairId,
        arah: "MASUK",
        jumlah: cair,
        refTipe: "PRODUKSI",
        refId: id,
        sumber: `Produksi ${p.kode}`,
        keterangan: `Hasil pengolahan ${p.beratSampahOrganik.toString()} kg sampah organik`,
        tanggal: tanggalSelesai,
      });
    }

    await catatAudit(
      {
        userId: operatorId,
        aksi: "UPDATE",
        tabel: "ProduksiPupuk",
        recordId: id,
        dataBaru: { status: diperbarui.status, padat: padat.toString(), cair: cair.toString() },
      },
      tx,
    );

    return diperbarui;
  });

  return ambilProduksi(hasil.id);
}

/** Membatalkan batch yang masih PROSES: bahan baku dikembalikan ke stok. */
export async function batalProduksi(id: string, alasan: string, operatorId: string) {
  const p = await prisma.produksiPupuk.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Produksi pupuk");
  if (p.status !== "PROSES") {
    throw new ConflictError(
      "BUKAN_PROSES",
      `Produksi ${p.kode} berstatus ${p.status}. Hanya batch yang masih berproses bisa dibatalkan.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tulisMutasiOrganik(tx, {
      arah: "MASUK",
      beratKg: p.beratSampahOrganik,
      refTipe: "PRODUKSI",
      refId: id,
      sumber: `Pembatalan ${p.kode}`,
      keterangan: alasan,
      operatorId,
    });

    await tx.produksiPupuk.update({
      where: { id },
      data: { status: "DIBATALKAN", keterangan: `Dibatalkan: ${alasan}` },
    });

    await catatAudit(
      { userId: operatorId, aksi: "VOID", tabel: "ProduksiPupuk", recordId: id, dataBaru: { status: "DIBATALKAN", alasan } },
      tx,
    );
  });

  return ambilProduksi(id);
}

/** Ringkasan produksi untuk laporan: total bahan, hasil, dan rendemen rata-rata. */
export async function ringkasanProduksi() {
  const selesai = await prisma.produksiPupuk.findMany({ where: { status: "SELESAI" } });
  const semua = await prisma.produksiPupuk.groupBy({ by: ["status"], _count: true });

  const totalBahan = selesai.reduce((a, p) => a.add(p.beratSampahOrganik), new Prisma.Decimal(0));
  const totalPadat = selesai.reduce((a, p) => a.add(p.pupukKasarAktual ?? 0), new Prisma.Decimal(0));
  const totalCair = selesai.reduce((a, p) => a.add(p.pupukCairAktual ?? 0), new Prisma.Decimal(0));

  return {
    perStatus: semua.map((s) => ({ status: s.status, jumlah: s._count })),
    totalBahanKg: totalBahan,
    totalPadatKg: totalPadat,
    totalCairLiter: totalCair,
    ...hitungHasil(totalBahan, totalPadat, totalCair),
  };
}

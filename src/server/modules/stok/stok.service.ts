import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";

/**
 * Posisi sampah anorganik yang masih menumpuk di bank sampah (status
 * MENUNGGU), dikelompokkan per kategori. Tidak ada tabel mutasi stok
 * terpisah - status Setoran ITU SENDIRI adalah keadaan stok: MENUNGGU
 * berarti masih fisik ada di bank sampah, DIPROSES berarti sudah diambil
 * pengepul. Menghitung ulang di sini tidak mungkin melenceng dari
 * transaksi asli.
 */
export async function posisiMenunggu() {
  const kategoriList = await prisma.kategoriSampah.findMany({ orderBy: { nama: "asc" } });

  const hasil = await Promise.all(
    kategoriList.map(async (k) => {
      const agg = await prisma.setoran.aggregate({
        where: { status: "MENUNGGU", kategoriSampahId: k.id },
        _sum: { beratKg: true },
        _count: true,
      });
      return {
        kategoriSampahId: k.id,
        kode: k.kode,
        nama: k.nama,
        aktif: k.aktif,
        beratKg: agg._sum.beratKg ?? new Prisma.Decimal(0),
        jumlahSetoran: agg._count,
      };
    }),
  );

  const tanpaKategori = await prisma.setoran.aggregate({
    where: { status: "MENUNGGU", kategoriSampahId: null },
    _sum: { beratKg: true },
    _count: true,
  });
  if (tanpaKategori._count > 0) {
    hasil.push({
      kategoriSampahId: "tanpa-kategori",
      kode: "-",
      nama: "Tanpa kategori",
      aktif: true,
      beratKg: tanpaKategori._sum.beratKg ?? new Prisma.Decimal(0),
      jumlahSetoran: tanpaKategori._count,
    });
  }

  return hasil;
}

export async function totalMenunggu() {
  const agg = await prisma.setoran.aggregate({ where: { status: "MENUNGGU" }, _sum: { beratKg: true }, _count: true });
  return { beratKg: agg._sum.beratKg ?? new Prisma.Decimal(0), jumlahSetoran: agg._count };
}

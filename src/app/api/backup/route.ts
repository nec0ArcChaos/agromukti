import { NextResponse } from "next/server";
import { route } from "@/server/lib/handler";
import { wajibPeran } from "@/server/lib/auth";
import { prisma } from "@/server/lib/db";

/**
 * Cadangan basis data lengkap sebagai satu berkas JSON.
 *
 * Format JSON dipilih (bukan dump SQL) karena portabel: bisa dibuka dan
 * diperiksa siapa pun tanpa MySQL, dan bisa dipulihkan ke SQLite maupun
 * MySQL. Memenuhi indikator evaluasi minggu V - operator harus mampu
 * mencadangkan data secara mandiri.
 */
export const GET = route(async () => {
  await wajibPeran("ADMIN");

  const [
    pengaturan,
    user,
    nasabah,
    kategoriSampah,
    pengepul,
    setoran,
    pengambilanPengepul,
    mutasiTabungan,
    penarikan,
    mutasiKas,
    sequence,
  ] = await Promise.all([
    prisma.pengaturan.findMany(),
    prisma.user.findMany({ select: { id: true, username: true, nama: true, role: true, aktif: true, createdAt: true } }),
    prisma.nasabah.findMany(),
    prisma.kategoriSampah.findMany(),
    prisma.pengepul.findMany(),
    prisma.setoran.findMany(),
    prisma.pengambilanPengepul.findMany(),
    prisma.mutasiTabungan.findMany(),
    prisma.penarikan.findMany(),
    prisma.mutasiKas.findMany(),
    prisma.sequence.findMany(),
  ]);

  const cadangan = {
    dibuatPada: new Date().toISOString(),
    aplikasi: "Sistem Informasi Bank Sampah Desa Argamukti",
    versiSkema: 2,
    // Catatan: tabel User TIDAK menyertakan passwordHash - cadangan ini
    // aman dibagikan untuk keperluan pemulihan data tanpa membocorkan
    // kredensial.
    data: {
      pengaturan, user, nasabah, kategoriSampah, pengepul,
      setoran, pengambilanPengepul, mutasiTabungan, penarikan,
      mutasiKas, sequence,
    },
  };

  const nama = `cadangan-bank-sampah-argamukti-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(cadangan, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${nama}"`,
    },
  });
});

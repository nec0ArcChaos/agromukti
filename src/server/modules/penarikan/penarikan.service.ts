import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { AppError, ConflictError, NotFoundError, SaldoTidakCukupError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import { formatRupiah } from "@/server/lib/money";
import { ambilPengaturan } from "@/server/modules/pengaturan/pengaturan.service";
import type { InputAjukanPenarikan, skemaFilterPenarikan } from "./penarikan.schema";
import type { z } from "zod";

type FilterPenarikan = z.infer<typeof skemaFilterPenarikan>;

const SERTAKAN = {
  nasabah: { select: { id: true, kode: true, nama: true, saldo: true } },
  pengaju: { select: { id: true, nama: true } },
  penyetuju: { select: { id: true, nama: true } },
} satisfies Prisma.PenarikanInclude;

export async function daftarPenarikan(f: FilterPenarikan) {
  const where: Prisma.PenarikanWhereInput = {
    ...(f.nasabahId ? { nasabahId: f.nasabahId } : {}),
    ...(f.status ? { status: f.status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.penarikan.findMany({
      where,
      include: SERTAKAN,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.penarikan.count({ where }),
  ]);
  return { rows, total };
}

export async function ambilPenarikan(id: string) {
  const p = await prisma.penarikan.findUnique({ where: { id }, include: SERTAKAN });
  if (!p) throw new NotFoundError("Penarikan");
  return p;
}

/** Mengajukan penarikan. Mutasi buku besar BELUM ditulis di sini - baru saat disetujui. */
export async function ajukanPenarikan(input: InputAjukanPenarikan, userId: string) {
  const [nasabah, pengaturan] = await Promise.all([
    prisma.nasabah.findUnique({ where: { id: input.nasabahId } }),
    ambilPengaturan(),
  ]);
  if (!nasabah) throw new NotFoundError("Nasabah");
  if (nasabah.status !== "AKTIF") {
    throw new AppError("NASABAH_NONAKTIF", `${nasabah.nama} berstatus nonaktif.`, 409);
  }
  if (input.jumlah < pengaturan.minimalPenarikan) {
    throw new AppError(
      "DI_BAWAH_MINIMAL",
      `Penarikan minimal ${formatRupiah(pengaturan.minimalPenarikan)}.`,
      400,
      { jumlah: `Minimal ${formatRupiah(pengaturan.minimalPenarikan)}` },
    );
  }
  const sisaMinimum = nasabah.saldo - input.jumlah;
  if (sisaMinimum < pengaturan.saldoMinimum) {
    throw new SaldoTidakCukupError(nasabah.nama, formatRupiah(nasabah.saldo), formatRupiah(input.jumlah));
  }

  const penarikan = await prisma.$transaction(async (tx) => {
    const nomor = await ambilNomor(tx, "PENARIKAN");
    return tx.penarikan.create({
      data: {
        nomor,
        nasabahId: input.nasabahId,
        jumlah: input.jumlah,
        metode: input.metode,
        diajukanOleh: userId,
      },
      include: SERTAKAN,
    });
  });

  await catatAudit({ userId, aksi: "CREATE", tabel: "Penarikan", recordId: penarikan.id, dataBaru: penarikan });
  return penarikan;
}

/**
 * Menyetujui dan mencairkan penarikan. Khusus admin.
 *
 * Saldo divalidasi ULANG di sini, bukan hanya saat pengajuan - kondisi bisa
 * berubah antara diajukan dan disetujui (mis. ada penarikan lain yang
 * lebih dulu disetujui). Menulis MutasiTabungan (debit) dan MutasiKas
 * (keluar) dalam satu transaksi yang sama.
 */
export async function setujuiPenarikan(id: string, adminId: string) {
  const p = await prisma.penarikan.findUnique({ where: { id }, include: { nasabah: true } });
  if (!p) throw new NotFoundError("Penarikan");
  if (p.status !== "PENDING") {
    throw new ConflictError("BUKAN_PENDING", `Penarikan ${p.nomor} sudah diproses sebelumnya (${p.status}).`);
  }
  if (p.nasabah.saldo < p.jumlah) {
    throw new SaldoTidakCukupError(p.nasabah.nama, formatRupiah(p.nasabah.saldo), formatRupiah(p.jumlah));
  }

  const hasil = await prisma.$transaction(async (tx) => {
    const sekarang = new Date();
    const saldoSesudah = p.nasabah.saldo - p.jumlah;

    const diperbarui = await tx.penarikan.update({
      where: { id },
      data: { status: "DISETUJUI", disetujuiOleh: adminId, tanggalCair: sekarang },
      include: SERTAKAN,
    });

    await tx.mutasiTabungan.create({
      data: {
        nasabahId: p.nasabahId,
        tanggal: sekarang,
        jenis: "PENARIKAN",
        debit: p.jumlah,
        saldoSesudah,
        refTipe: "PENARIKAN",
        refId: id,
        keterangan: `Penarikan ${p.nomor}`,
      },
    });
    await tx.nasabah.update({ where: { id: p.nasabahId }, data: { saldo: saldoSesudah } });

    const kasTerakhir = await tx.mutasiKas.findFirst({ orderBy: { createdAt: "desc" } });
    const saldoKasSesudah = (kasTerakhir?.saldoSesudah ?? 0) - p.jumlah;
    await tx.mutasiKas.create({
      data: {
        tanggal: sekarang,
        arah: "KELUAR",
        kategori: "PENARIKAN_NASABAH",
        jumlah: p.jumlah,
        saldoSesudah: saldoKasSesudah,
        refTipe: "PENARIKAN",
        refId: id,
        keterangan: `Pencairan ${p.nomor} kepada ${p.nasabah.nama}`,
      },
    });

    await catatAudit(
      { userId: adminId, aksi: "APPROVE", tabel: "Penarikan", recordId: id, dataBaru: { status: "DISETUJUI" } },
      tx,
    );

    return diperbarui;
  });

  return hasil;
}

export async function tolakPenarikan(id: string, alasan: string, adminId: string) {
  const p = await prisma.penarikan.findUnique({ where: { id } });
  if (!p) throw new NotFoundError("Penarikan");
  if (p.status !== "PENDING") {
    throw new ConflictError("BUKAN_PENDING", `Penarikan ${p.nomor} sudah diproses sebelumnya (${p.status}).`);
  }

  const hasil = await prisma.penarikan.update({
    where: { id },
    data: { status: "DITOLAK", alasanTolak: alasan, disetujuiOleh: adminId },
    include: SERTAKAN,
  });

  await catatAudit({ userId: adminId, aksi: "REJECT", tabel: "Penarikan", recordId: id, dataBaru: { status: "DITOLAK", alasan } });
  return hasil;
}

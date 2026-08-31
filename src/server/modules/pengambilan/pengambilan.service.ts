import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { AppError, ConflictError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import { bagiProporsional, totalBerat, formatRupiah } from "@/server/lib/money";
import type { InputBuatPengambilan, skemaFilterPengambilan } from "./pengambilan.schema";
import type { z } from "zod";

type FilterPengambilan = z.infer<typeof skemaFilterPengambilan>;

const SERTAKAN = {
  pengepul: { select: { id: true, kode: true, nama: true } },
  operator: { select: { id: true, nama: true } },
  setoran: {
    select: {
      id: true,
      nomor: true,
      beratKg: true,
      nilaiAlokasi: true,
      nasabah: { select: { id: true, kode: true, warga: { select: { nama: true } } } },
    },
  },
} satisfies Prisma.PengambilanPengepulInclude;

export async function daftarPengambilan(f: FilterPengambilan) {
  const where: Prisma.PengambilanPengepulWhereInput = {
    ...(f.pengepulId ? { pengepulId: f.pengepulId } : {}),
    ...(f.status ? { status: f.status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.pengambilanPengepul.findMany({
      where,
      include: SERTAKAN,
      orderBy: { tanggal: "desc" },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.pengambilanPengepul.count({ where }),
  ]);

  return { rows, total };
}

export async function ambilPengambilan(id: string) {
  const p = await prisma.pengambilanPengepul.findUnique({ where: { id }, include: SERTAKAN });
  if (!p) throw new NotFoundError("Pengambilan pengepul");
  return p;
}

/**
 * Mencatat kedatangan pengepul yang membeli borongan dari banyak setoran
 * MENUNGGU sekaligus, lalu membagi totalNilai secara proporsional menurut
 * berat ke tiap setoran dan mengkredit nasabahnya masing-masing.
 *
 * PENTING: bila satu nasabah punya lebih dari satu setoran dalam batch
 * yang sama, saldo berjalan (untuk MutasiTabungan.saldoSesudah) dihitung
 * bertahap dalam memori selama loop - BUKAN dibaca ulang dari cache
 * Nasabah.saldo yang sudah basi setelah baris pertama nasabah itu diproses.
 */
export async function buatPengambilan(input: InputBuatPengambilan, operatorId: string) {
  const pengepul = await prisma.pengepul.findUnique({ where: { id: input.pengepulId } });
  if (!pengepul) throw new NotFoundError("Pengepul");

  const idUnik = [...new Set(input.setoranIds)];
  const setoranList = await prisma.setoran.findMany({
    where: { id: { in: idUnik } },
    include: { nasabah: { select: { id: true, saldo: true, warga: { select: { nama: true } } } } },
  });
  if (setoranList.length !== idUnik.length) {
    throw new NotFoundError("Setoran");
  }
  for (const s of setoranList) {
    if (s.status !== "MENUNGGU") {
      throw new ConflictError("BUKAN_MENUNGGU", `Setoran ${s.nomor} berstatus ${s.status}, tidak bisa diikutsertakan lagi.`);
    }
  }

  const beratList = setoranList.map((s) => s.beratKg);
  const totalBeratKg = totalBerat(beratList);
  const alokasi = bagiProporsional(input.totalNilai, beratList);
  const tanggal = input.tanggal ?? new Date();

  const hasil = await prisma.$transaction(async (tx) => {
    const nomor = await ambilNomor(tx, "PENGAMBILAN", tanggal);

    const pengambilan = await tx.pengambilanPengepul.create({
      data: {
        nomor,
        pengepulId: pengepul.id,
        tanggal,
        totalBeratKg,
        totalNilai: input.totalNilai,
        catatan: input.catatan,
        operatorId,
      },
    });

    const saldoBerjalan = new Map<string, number>();
    for (const s of setoranList) {
      if (!saldoBerjalan.has(s.nasabahId)) saldoBerjalan.set(s.nasabahId, s.nasabah.saldo);
    }

    for (let i = 0; i < setoranList.length; i++) {
      const s = setoranList[i];
      const nilai = alokasi[i];

      await tx.setoran.update({
        where: { id: s.id },
        data: { status: "DIPROSES", nilaiAlokasi: nilai, pengambilanId: pengambilan.id },
      });

      const saldoSesudah = saldoBerjalan.get(s.nasabahId)! + nilai;
      saldoBerjalan.set(s.nasabahId, saldoSesudah);

      await tx.mutasiTabungan.create({
        data: {
          nasabahId: s.nasabahId,
          tanggal,
          jenis: "PENGAMBILAN_PENGEPUL",
          kredit: nilai,
          saldoSesudah,
          refTipe: "PENGAMBILAN",
          refId: pengambilan.id,
          keterangan: `Hasil setoran ${s.nomor} dibeli ${pengepul.nama} (${nomor})`,
        },
      });
    }

    for (const [nasabahId, saldoAkhir] of saldoBerjalan) {
      await tx.nasabah.update({ where: { id: nasabahId }, data: { saldo: saldoAkhir } });
    }

    const kasTerakhir = await tx.mutasiKas.findFirst({ orderBy: { createdAt: "desc" } });
    const saldoKasSesudah = (kasTerakhir?.saldoSesudah ?? 0) + input.totalNilai;
    await tx.mutasiKas.create({
      data: {
        tanggal,
        arah: "MASUK",
        kategori: "PENGEPUL",
        jumlah: input.totalNilai,
        saldoSesudah: saldoKasSesudah,
        refTipe: "PENGAMBILAN",
        refId: pengambilan.id,
        keterangan: `Pembayaran ${pengepul.nama} - ${nomor}`,
      },
    });

    await catatAudit(
      {
        userId: operatorId,
        aksi: "CREATE",
        tabel: "PengambilanPengepul",
        recordId: pengambilan.id,
        dataBaru: { nomor, totalNilai: input.totalNilai, jumlahSetoran: setoranList.length },
      },
      tx,
    );

    return pengambilan;
  });

  return ambilPengambilan(hasil.id);
}

/**
 * Membatalkan SELURUH pengambilan sekaligus - jalur koreksi satu-satunya
 * untuk setoran yang sudah DIPROSES (setoran individual tidak bisa
 * dibatalkan sendiri-sendiri setelah statusnya berubah). Mengembalikan
 * setiap setoran ke MENUNGGU, menarik balik kredit tiap nasabah, dan
 * mengeluarkan kembali nilainya dari kas.
 */
export async function batalPengambilan(id: string, alasan: string, userId: string) {
  const p = await prisma.pengambilanPengepul.findUnique({
    where: { id },
    include: { setoran: true },
  });
  if (!p) throw new NotFoundError("Pengambilan pengepul");
  if (p.status === "VOID") {
    throw new ConflictError("SUDAH_DIBATALKAN", "Pengambilan ini sudah dibatalkan sebelumnya.");
  }

  const totalAlokasiPerNasabah = new Map<string, number>();
  for (const s of p.setoran) {
    totalAlokasiPerNasabah.set(s.nasabahId, (totalAlokasiPerNasabah.get(s.nasabahId) ?? 0) + (s.nilaiAlokasi ?? 0));
  }

  const nasabahList = await prisma.nasabah.findMany({ where: { id: { in: [...totalAlokasiPerNasabah.keys()] } }, include: { warga: { select: { nama: true } } } });
  for (const n of nasabahList) {
    const totalAlokasi = totalAlokasiPerNasabah.get(n.id)!;
    if (n.saldo < totalAlokasi) {
      throw new AppError(
        "SALDO_TIDAK_CUKUP_UNTUK_BATAL",
        `Saldo ${n.warga.nama} saat ini ${formatRupiah(n.saldo)}, kurang dari total kredit ` +
          `${formatRupiah(totalAlokasi)} dari pengambilan ini. Kemungkinan sudah ada penarikan setelahnya.`,
        409,
      );
    }
  }

  const kasTerakhir = await prisma.mutasiKas.findFirst({ orderBy: { createdAt: "desc" } });
  const saldoKasSaatIni = kasTerakhir?.saldoSesudah ?? 0;
  if (saldoKasSaatIni < p.totalNilai) {
    throw new AppError(
      "KAS_TIDAK_CUKUP_UNTUK_BATAL",
      `Kas saat ini ${formatRupiah(saldoKasSaatIni)}, kurang dari nilai pengambilan ` +
        `${formatRupiah(p.totalNilai)} yang akan dibatalkan. Kas mungkin sudah terpakai untuk keperluan lain.`,
      409,
    );
  }

  const hasil = await prisma.$transaction(async (tx) => {
    const saldoBerjalan = new Map(nasabahList.map((n) => [n.id, n.saldo]));

    for (const s of p.setoran) {
      const nilai = s.nilaiAlokasi ?? 0;
      const saldoSesudah = saldoBerjalan.get(s.nasabahId)! - nilai;
      saldoBerjalan.set(s.nasabahId, saldoSesudah);

      await tx.mutasiTabungan.create({
        data: {
          nasabahId: s.nasabahId,
          jenis: "PEMBATALAN",
          debit: nilai,
          saldoSesudah,
          refTipe: "PENGAMBILAN",
          refId: p.id,
          keterangan: `Pembatalan pengambilan ${p.nomor}: ${alasan}`,
        },
      });

      await tx.setoran.update({ where: { id: s.id }, data: { status: "MENUNGGU", nilaiAlokasi: null, pengambilanId: null } });
    }

    for (const [nasabahId, saldoAkhir] of saldoBerjalan) {
      await tx.nasabah.update({ where: { id: nasabahId }, data: { saldo: saldoAkhir } });
    }

    const saldoKasSesudah = saldoKasSaatIni - p.totalNilai;
    await tx.mutasiKas.create({
      data: {
        arah: "KELUAR",
        kategori: "KOREKSI",
        jumlah: p.totalNilai,
        saldoSesudah: saldoKasSesudah,
        refTipe: "PENGAMBILAN",
        refId: p.id,
        keterangan: `Pembatalan pengambilan ${p.nomor}: ${alasan}`,
      },
    });

    const diperbarui = await tx.pengambilanPengepul.update({
      where: { id },
      data: { status: "VOID", alasanBatal: alasan },
    });

    await catatAudit(
      { userId, aksi: "VOID", tabel: "PengambilanPengepul", recordId: id, dataBaru: { status: "VOID", alasan } },
      tx,
    );

    return diperbarui;
  });

  return ambilPengambilan(hasil.id);
}

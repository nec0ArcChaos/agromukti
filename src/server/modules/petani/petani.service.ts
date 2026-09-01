import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { ConflictError, NotFoundError } from "@/server/lib/errors";
import { catatAudit } from "@/server/lib/audit";
import { ambilNomor } from "@/server/lib/sequence";
import { keHektare } from "@/server/lib/satuan";
import type { InputBuatPetani, InputUbahPetani, skemaFilterPetani } from "./petani.schema";
import type { z } from "zod";

type FilterPetani = z.infer<typeof skemaFilterPetani>;

const SERTAKAN = {
  warga: { select: { id: true, nama: true, noHp: true, alamat: true, dusun: true, rt: true, rw: true } },
} satisfies Prisma.PetaniInclude;

export async function daftarPetani(f: FilterPetani) {
  const where: Prisma.PetaniWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(f.kelompokTani ? { kelompokTani: f.kelompokTani } : {}),
    ...(f.dusun ? { warga: { dusun: f.dusun } } : {}),
    ...(f.q
      ? {
          OR: [
            { kode: { contains: f.q } },
            { kelompokTani: { contains: f.q } },
            { warga: { nama: { contains: f.q } } },
            { warga: { noHp: { contains: f.q } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.petani.findMany({
      where,
      include: { ...SERTAKAN, _count: { select: { lahan: true, panen: true } } },
      orderBy: { warga: { nama: "asc" } },
      skip: (f.page - 1) * f.perPage,
      take: f.perPage,
    }),
    prisma.petani.count({ where }),
  ]);

  return { rows, total };
}

export async function ambilPetani(id: string) {
  const petani = await prisma.petani.findUnique({
    where: { id },
    include: {
      ...SERTAKAN,
      lahan: { include: { komoditas: { select: { id: true, nama: true, dosisPupukPerHa: true } } } },
    },
  });
  if (!petani) throw new NotFoundError("Petani");

  // Total luas garapan dinormalkan ke hektare, karena tiap lahan boleh
  // memakai satuan berbeda (m² atau ha).
  const totalHektare = petani.lahan
    .filter((l) => l.status === "AKTIF")
    .reduce((acc, l) => acc.add(keHektare(l.luas, l.satuan)), new Prisma.Decimal(0));

  return { ...petani, totalHektare };
}

export async function daftarKelompokTani() {
  const rows = await prisma.petani.findMany({
    where: { kelompokTani: { not: null } },
    distinct: ["kelompokTani"],
    select: { kelompokTani: true },
    orderBy: { kelompokTani: "asc" },
  });
  return rows.map((r) => r.kelompokTani).filter(Boolean) as string[];
}

/**
 * Memastikan warga memenuhi syarat menjadi petani.
 *
 * Petani hanya boleh warga yang sudah menjadi nasabah bank sampah AKTIF
 * DAN pernah benar-benar menyetor sampah. Alasannya bukan administratif:
 * pupuk dibayar dengan memotong tabungan bank sampah, jadi petani tanpa
 * rekening tidak punya cara membayar, dan yang belum pernah menyetor tidak
 * punya isi tabungan. Syarat ini juga yang membuat lingkaran ekonomi
 * sirkularnya benar-benar melingkar: hanya yang berkontribusi mengelola
 * sampah yang memperoleh pupuknya.
 */
async function pastikanLayakJadiPetani(wargaId: string) {
  const warga = await prisma.warga.findUnique({
    where: { id: wargaId },
    include: {
      petani: { select: { id: true, kode: true } },
      nasabah: { select: { id: true, kode: true, status: true } },
    },
  });
  if (!warga) throw new NotFoundError("Warga");

  // Satu warga tidak perlu dua kartu petani - kalau sudah ada, itu hampir
  // pasti kekeliruan input, bukan kehendak operator.
  if (warga.petani.length > 0) {
    throw new ConflictError(
      "SUDAH_JADI_PETANI",
      `${warga.nama} sudah terdaftar sebagai petani dengan kode ${warga.petani[0].kode}.`,
    );
  }

  const nasabahAktif = warga.nasabah.find((n) => n.status === "AKTIF");
  if (!nasabahAktif) {
    throw new ConflictError(
      "BUKAN_NASABAH_AKTIF",
      `${warga.nama} belum menjadi nasabah bank sampah yang aktif. ` +
        `Daftarkan dulu di menu Nasabah, karena pupuk dibayar dari tabungan bank sampah.`,
    );
  }

  const jumlahSetoran = await prisma.setoran.count({
    where: { nasabahId: nasabahAktif.id, status: { not: "VOID" } },
  });
  if (jumlahSetoran === 0) {
    throw new ConflictError(
      "BELUM_PERNAH_MENYETOR",
      `${warga.nama} sudah punya rekening ${nasabahAktif.kode}, tetapi belum pernah menyetor sampah. ` +
        `Catat setorannya dulu di menu Setoran sebelum didaftarkan sebagai petani.`,
    );
  }

  return { warga, nasabahId: nasabahAktif.id };
}

export async function buatPetani(input: InputBuatPetani, userId: string) {
  // Warga baru tidak mungkin memenuhi syarat (belum punya rekening, apalagi
  // setoran), jadi jalur "buat identitas baru sekaligus" ditutup - lebih
  // jujur menolak di sini daripada membuat data yang langsung melanggar.
  if (!input.wargaId) {
    throw new ConflictError(
      "WARGA_BARU_TIDAK_LAYAK",
      "Petani hanya boleh warga yang sudah menjadi nasabah bank sampah dan pernah menyetor. " +
        "Daftarkan warganya sebagai nasabah lebih dulu, catat setoran pertamanya, baru daftarkan sebagai petani.",
    );
  }

  await pastikanLayakJadiPetani(input.wargaId);

  const petani = await prisma.$transaction(async (tx) => {
    const kode = await ambilNomor(tx, "PETANI");
    return tx.petani.create({
      data: { kode, wargaId: input.wargaId!, kelompokTani: input.kelompokTani },
      include: SERTAKAN,
    });
  });

  await catatAudit({ userId, aksi: "CREATE", tabel: "Petani", recordId: petani.id, dataBaru: petani });
  return petani;
}

/**
 * Petani lama yang tidak memenuhi syarat baru.
 *
 * Aturan "wajib nasabah aktif + pernah menyetor" hanya menjaga pendaftaran
 * BARU. Data lama sengaja tidak dinonaktifkan diam-diam - itu merusak
 * catatan yang sedang dipakai tanpa sepengetahuan petugas. Daftar ini yang
 * memunculkannya supaya petugas membereskannya secara sadar.
 */
export async function petaniTidakPatuh() {
  const semua = await prisma.petani.findMany({
    where: { status: "AKTIF" },
    include: {
      warga: { select: { id: true, nama: true, nasabah: { select: { id: true, kode: true, status: true } } } },
    },
    orderBy: { kode: "asc" },
  });

  const hasil: { kode: string; nama: string; alasan: string }[] = [];
  for (const p of semua) {
    const nasabahAktif = p.warga.nasabah.find((n) => n.status === "AKTIF");
    if (!nasabahAktif) {
      hasil.push({ kode: p.kode, nama: p.warga.nama, alasan: "Belum menjadi nasabah bank sampah aktif" });
      continue;
    }
    const jumlah = await prisma.setoran.count({
      where: { nasabahId: nasabahAktif.id, status: { not: "VOID" } },
    });
    if (jumlah === 0) {
      hasil.push({
        kode: p.kode,
        nama: p.warga.nama,
        alasan: `Punya rekening ${nasabahAktif.kode} tetapi belum pernah menyetor sampah`,
      });
    }
  }

  return hasil;
}

export async function ubahPetani(id: string, input: InputUbahPetani, userId: string) {
  const lama = await prisma.petani.findUnique({ where: { id }, include: SERTAKAN });
  if (!lama) throw new NotFoundError("Petani");

  const petani = await prisma.$transaction(async (tx) => {
    if (input.warga && Object.keys(input.warga).length > 0) {
      await tx.warga.update({ where: { id: lama.wargaId }, data: input.warga });
    }
    return tx.petani.update({
      where: { id },
      data: { kelompokTani: input.kelompokTani, status: input.status },
      include: SERTAKAN,
    });
  });

  await catatAudit({ userId, aksi: "UPDATE", tabel: "Petani", recordId: id, dataLama: lama, dataBaru: petani });
  return petani;
}

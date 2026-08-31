import { Prisma } from "@prisma/client";

export type TipeSequence =
  | "SETORAN"
  | "PENARIKAN"
  | "PENGAMBILAN"
  | "NASABAH"
  | "PETANI"
  | "PERMINTAAN"
  | "DISTRIBUSI"
  | "PRODUKSI";

const AWALAN: Record<TipeSequence, string> = {
  SETORAN: "ST",
  PENARIKAN: "TR",
  PENGAMBILAN: "PP",
  NASABAH: "AGM",
  PETANI: "TN",
  PERMINTAAN: "PMT",
  DISTRIBUSI: "DST",
  PRODUKSI: "PRD",
};

/** Nomor identitas orang berjalan terus, tidak direset tiap bulan. */
const TANPA_PERIODE: TipeSequence[] = ["NASABAH", "PETANI"];

function periodeDari(tanggal: Date): string {
  const th = tanggal.getFullYear();
  const bl = String(tanggal.getMonth() + 1).padStart(2, "0");
  return `${th}${bl}`;
}

/**
 * Membangkitkan nomor dokumen berikutnya.
 *
 * WAJIB dipanggil di dalam `prisma.$transaction` yang sama dengan penulisan
 * dokumennya. Jangan pernah memakai `COUNT(*) + 1`: dua operator yang menekan
 * Simpan pada detik yang sama akan mendapat nomor kembar, dan nomor kembar
 * pada bukti setoran adalah persis jenis kesalahan yang meruntuhkan
 * kepercayaan nasabah.
 *
 *   ST-202608-0001   setoran
 *   TR-202608-0001   penarikan
 *   PP-202608-0001   pengambilan pengepul
 *   AGM-0001         nasabah
 */
export async function ambilNomor(
  tx: Prisma.TransactionClient,
  tipe: TipeSequence,
  tanggal: Date = new Date(),
): Promise<string> {
  const periode = TANPA_PERIODE.includes(tipe) ? "-" : periodeDari(tanggal);

  const seq = await tx.sequence.upsert({
    where: { tipe_periode: { tipe, periode } },
    create: { tipe, periode, nomorTerakhir: 1 },
    update: { nomorTerakhir: { increment: 1 } },
  });

  const urut = String(seq.nomorTerakhir).padStart(4, "0");
  return periode === "-"
    ? `${AWALAN[tipe]}-${urut}`
    : `${AWALAN[tipe]}-${periode}-${urut}`;
}

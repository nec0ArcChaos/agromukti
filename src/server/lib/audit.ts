import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type AksiAudit =
  | "CREATE"
  | "UPDATE"
  | "VOID"
  | "LOGIN"
  | "LOGOUT"
  | "APPROVE"
  | "REJECT"
  | "INGEST";

type ArgAudit = {
  userId?: string | null;
  aksi: AksiAudit;
  tabel: string;
  recordId?: string | null;
  dataLama?: unknown;
  dataBaru?: unknown;
  ip?: string | null;
};

function ringkas(nilai: unknown): string | null {
  if (nilai === undefined || nilai === null) return null;
  try {
    // Batasi ukuran: audit log tidak boleh menjadi tempat penyimpanan data.
    return JSON.stringify(nilai).slice(0, 8000);
  } catch {
    return null;
  }
}

/**
 * Mencatat perubahan data.
 *
 * Untuk operasi yang menyentuh uang, panggil dengan `tx` DI DALAM transaksi
 * yang sama — kalau transaksinya batal, catatan auditnya ikut batal, dan
 * audit log tidak pernah menyebut kejadian yang sebenarnya tidak terjadi.
 */
export async function catatAudit(
  arg: ArgAudit,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: arg.userId ?? null,
      aksi: arg.aksi,
      tabel: arg.tabel,
      recordId: arg.recordId ?? null,
      dataLama: ringkas(arg.dataLama),
      dataBaru: ringkas(arg.dataBaru),
      ip: arg.ip ?? null,
    },
  });
}

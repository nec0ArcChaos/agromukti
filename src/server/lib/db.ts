import { PrismaClient } from "@prisma/client";

/**
 * Satu instance PrismaClient untuk seluruh aplikasi.
 *
 * Di mode dev, Next.js me-reload modul setiap kali berkas berubah. Tanpa
 * penampung di globalThis, setiap reload membuat koneksi baru sampai MySQL
 * menolak dengan "Too many connections".
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

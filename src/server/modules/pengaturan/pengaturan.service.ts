import { prisma } from "@/server/lib/db";
import { catatAudit } from "@/server/lib/audit";

export async function ambilPengaturan() {
  // Selalu ada satu baris karena dibuat lewat seed. Upsert jaga-jaga saja.
  return prisma.pengaturan.upsert({
    where: { id: "SINGLETON" },
    create: { id: "SINGLETON" },
    update: {},
  });
}

export async function perbaruiPengaturan(
  input: Partial<{
    namaBankSampah: string;
    alamat: string;
    kepalaDesa: string;
    ketuaBankSampah: string;
    minimalPenarikan: number;
    saldoMinimum: number;
  }>,
  userId: string,
) {
  const hasil = await prisma.pengaturan.update({ where: { id: "SINGLETON" }, data: input });
  await catatAudit({ userId, aksi: "UPDATE", tabel: "Pengaturan", recordId: "SINGLETON", dataBaru: input });
  return hasil;
}

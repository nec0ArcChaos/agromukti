import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { prisma } from "@/server/lib/db";

/** PUBLIK - daftar pupuk yang bisa diajukan warga. Tanpa data stok internal. */
export const GET = route(async () => {
  const rows = await prisma.produkPupuk.findMany({
    where: { aktif: true },
    select: { id: true, nama: true, satuan: true },
    orderBy: { nama: "asc" },
  });
  return sukses(rows);
});

import { z } from "zod";
import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { ambilPengaturan, perbaruiPengaturan } from "@/server/modules/pengaturan/pengaturan.service";

const skemaUbah = z.object({
  namaBankSampah: z.string().trim().min(1).optional(),
  alamat: z.string().trim().optional(),
  kepalaDesa: z.string().trim().optional(),
  ketuaBankSampah: z.string().trim().optional(),
  minimalPenarikan: z.coerce.number().int().min(0).optional(),
  saldoMinimum: z.coerce.number().int().min(0).optional(),
  // Rendemen dibatasi 0-100%: nilai di luar itu pasti salah ketik, dan
  // kalau lolos akan menghasilkan estimasi yang menyesatkan operator.
  rendemenKomposPersen: z.coerce.number().min(0).max(100).optional(),
  hasilPocLiterPerKg: z.coerce.number().min(0).max(10).optional(),
});

export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await ambilPengaturan());
});

export const PATCH = route(async (req) => {
  const sesi = await wajibPeran("ADMIN");
  const input = skemaUbah.parse(await bacaBody(req));
  return sukses(await perbaruiPengaturan(input, sesi.userId));
});

import { z } from "zod";
import { route } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { hitungEstimasi, rasioAktual } from "@/server/modules/produksi/produksi.service";

const skema = z.object({ berat: z.coerce.number().min(0).default(0) });

/**
 * Perkiraan hasil produksi dari berat bahan baku, beserta rasio yang
 * benar-benar tercapai dari batch sebelumnya sebagai pembanding.
 */
export const GET = route(async (req) => {
  await wajibMasuk();
  const { berat } = skema.parse(bacaQuery(req.url));
  const [estimasi, aktual] = await Promise.all([hitungEstimasi(berat), rasioAktual()]);
  return sukses({ ...estimasi, aktual });
});

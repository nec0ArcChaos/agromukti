import { z } from "zod";
import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarMutasiStok, penyesuaianStok, skemaPenyesuaianStok } from "@/server/modules/pupuk/pupuk.service";

const skemaFilter = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  produkPupukId: z.string().optional(),
});

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilter.parse(bacaQuery(req.url));
  const { rows, total } = await daftarMutasiStok(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const input = skemaPenyesuaianStok.parse(await bacaBody(req));
  return sukses(await penyesuaianStok(input, sesi.userId), undefined, 201);
});

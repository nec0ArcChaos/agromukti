import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarPanen, buatPanen, skemaBuatPanen, skemaFilterPanen } from "@/server/modules/panen/panen.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterPanen.parse(bacaQuery(req.url));
  const { rows, total } = await daftarPanen(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const input = skemaBuatPanen.parse(await bacaBody(req));
  return sukses(await buatPanen(input, sesi.userId), undefined, 201);
});

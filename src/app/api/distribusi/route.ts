import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarDistribusi, buatDistribusi, skemaBuatDistribusi, skemaFilterDistribusi } from "@/server/modules/distribusi/distribusi.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterDistribusi.parse(bacaQuery(req.url));
  const { rows, total } = await daftarDistribusi(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const input = skemaBuatDistribusi.parse(await bacaBody(req));
  return sukses(await buatDistribusi(input, sesi.userId), undefined, 201);
});

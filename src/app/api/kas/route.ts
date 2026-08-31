import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaEntriKas, skemaFilterKas } from "@/server/modules/kas/kas.schema";
import { daftarKas, catatEntriKas } from "@/server/modules/kas/kas.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterKas.parse(bacaQuery(req.url));
  const { rows, total } = await daftarKas(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN");
  const input = skemaEntriKas.parse(await bacaBody(req));
  return sukses(await catatEntriKas(input, sesi.userId), undefined, 201);
});

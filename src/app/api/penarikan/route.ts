import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { skemaAjukanPenarikan, skemaFilterPenarikan } from "@/server/modules/penarikan/penarikan.schema";
import { daftarPenarikan, ajukanPenarikan } from "@/server/modules/penarikan/penarikan.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterPenarikan.parse(bacaQuery(req.url));
  const { rows, total } = await daftarPenarikan(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibMasuk();
  const input = skemaAjukanPenarikan.parse(await bacaBody(req));
  return sukses(await ajukanPenarikan(input, sesi.userId), undefined, 201);
});

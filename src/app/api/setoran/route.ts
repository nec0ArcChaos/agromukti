import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaBuatSetoran, skemaFilterSetoran } from "@/server/modules/setoran/setoran.schema";
import { daftarSetoran, buatSetoran } from "@/server/modules/setoran/setoran.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterSetoran.parse(bacaQuery(req.url));
  const { rows, total } = await daftarSetoran(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_SAMPAH");
  const input = skemaBuatSetoran.parse(await bacaBody(req));
  return sukses(await buatSetoran(input, sesi.userId), undefined, 201);
});

import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaBuatPengambilan, skemaFilterPengambilan } from "@/server/modules/pengambilan/pengambilan.schema";
import { daftarPengambilan, buatPengambilan } from "@/server/modules/pengambilan/pengambilan.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterPengambilan.parse(bacaQuery(req.url));
  const { rows, total } = await daftarPengambilan(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_SAMPAH");
  const input = skemaBuatPengambilan.parse(await bacaBody(req));
  return sukses(await buatPengambilan(input, sesi.userId), undefined, 201);
});

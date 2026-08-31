import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { daftarWarga, buatWarga, skemaBuatWarga, skemaFilterWarga } from "@/server/modules/warga/warga.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterWarga.parse(bacaQuery(req.url));
  const { rows, total } = await daftarWarga(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibMasuk();
  const input = skemaBuatWarga.parse(await bacaBody(req));
  return sukses(await buatWarga(input, sesi.userId), undefined, 201);
});

import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarPermintaan, buatPermintaan, skemaBuatPermintaan, skemaFilterPermintaan } from "@/server/modules/permintaan/permintaan.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterPermintaan.parse(bacaQuery(req.url));
  const { rows, total } = await daftarPermintaan(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const input = skemaBuatPermintaan.parse(await bacaBody(req));
  return sukses(await buatPermintaan(input, sesi.userId), undefined, 201);
});

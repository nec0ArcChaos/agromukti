import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarLahan, buatLahan, skemaBuatLahan, skemaFilterLahan } from "@/server/modules/lahan/lahan.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterLahan.parse(bacaQuery(req.url));
  const { rows, total } = await daftarLahan(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const input = skemaBuatLahan.parse(await bacaBody(req));
  return sukses(await buatLahan(input, sesi.userId), undefined, 201);
});

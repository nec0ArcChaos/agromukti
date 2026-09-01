import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarProduksi, buatProduksi, skemaBuatProduksi, skemaFilterProduksi } from "@/server/modules/produksi/produksi.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterProduksi.parse(bacaQuery(req.url));
  const { rows, total } = await daftarProduksi(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_ORGANIK");
  const input = skemaBuatProduksi.parse(await bacaBody(req));
  return sukses(await buatProduksi(input, sesi.userId), undefined, 201);
});

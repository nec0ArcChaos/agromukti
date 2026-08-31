import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaBuatPetani, skemaFilterPetani } from "@/server/modules/petani/petani.schema";
import { daftarPetani, buatPetani } from "@/server/modules/petani/petani.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterPetani.parse(bacaQuery(req.url));
  const { rows, total } = await daftarPetani(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const input = skemaBuatPetani.parse(await bacaBody(req));
  return sukses(await buatPetani(input, sesi.userId), undefined, 201);
});

import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaBuatNasabah, skemaFilterNasabah } from "@/server/modules/nasabah/nasabah.schema";
import { daftarNasabah, buatNasabah } from "@/server/modules/nasabah/nasabah.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterNasabah.parse(Object.fromEntries(new URL(req.url).searchParams));
  const { rows, total } = await daftarNasabah(f);
  return sukses(rows, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_SAMPAH");
  const input = skemaBuatNasabah.parse(await bacaBody(req));
  return sukses(await buatNasabah(input, sesi.userId), undefined, 201);
});

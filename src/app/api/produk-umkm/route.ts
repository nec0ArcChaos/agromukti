import { z } from "zod";
import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarProdukUmkm, buatProdukUmkm, skemaBuatProdukUmkm } from "@/server/modules/umkm/umkm.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const tersedia = z.coerce.boolean().default(false).parse(new URL(req.url).searchParams.get("tersedia") ?? undefined);
  return sukses(await daftarProdukUmkm(tersedia));
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_ORGANIK");
  const input = skemaBuatProdukUmkm.parse(await bacaBody(req));
  return sukses(await buatProdukUmkm(input, sesi.userId), undefined, 201);
});

import { z } from "zod";
import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarProdukPupuk, buatProdukPupuk, skemaBuatProdukPupuk } from "@/server/modules/pupuk/pupuk.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const aktif = z.coerce.boolean().default(false).parse(new URL(req.url).searchParams.get("aktif") ?? undefined);
  return sukses(await daftarProdukPupuk(aktif));
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const input = skemaBuatProdukPupuk.parse(await bacaBody(req));
  return sukses(await buatProdukPupuk(input, sesi.userId), undefined, 201);
});

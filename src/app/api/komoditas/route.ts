import { z } from "zod";
import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarKomoditas, buatKomoditas, skemaBuatKomoditas } from "@/server/modules/komoditas/komoditas.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const aktif = z.coerce.boolean().default(false).parse(new URL(req.url).searchParams.get("aktif") ?? undefined);
  return sukses(await daftarKomoditas(aktif));
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const input = skemaBuatKomoditas.parse(await bacaBody(req));
  return sukses(await buatKomoditas(input, sesi.userId), undefined, 201);
});

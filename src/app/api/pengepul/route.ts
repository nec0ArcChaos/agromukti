import { z } from "zod";
import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaBuatPengepul } from "@/server/modules/pengepul/pengepul.schema";
import { daftarPengepul, buatPengepul } from "@/server/modules/pengepul/pengepul.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const hanyaAktif = z.coerce.boolean().default(false).parse(new URL(req.url).searchParams.get("aktif") ?? undefined);
  return sukses(await daftarPengepul(hanyaAktif));
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_SAMPAH");
  const input = skemaBuatPengepul.parse(await bacaBody(req));
  return sukses(await buatPengepul(input, sesi.userId), undefined, 201);
});

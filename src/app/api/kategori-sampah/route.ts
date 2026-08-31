import { z } from "zod";
import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { skemaBuatKategori } from "@/server/modules/kategori-sampah/kategori-sampah.schema";
import { daftarKategori, buatKategori } from "@/server/modules/kategori-sampah/kategori-sampah.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const hanyaAktif = z.coerce.boolean().default(false).parse(new URL(req.url).searchParams.get("aktif") ?? undefined);
  return sukses(await daftarKategori(hanyaAktif));
});

export const POST = route(async (req) => {
  const sesi = await wajibMasuk();
  const input = skemaBuatKategori.parse(await bacaBody(req));
  return sukses(await buatKategori(input, sesi.userId), undefined, 201);
});

import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaUbahKategori } from "@/server/modules/kategori-sampah/kategori-sampah.schema";
import { ambilKategori, ubahKategori } from "@/server/modules/kategori-sampah/kategori-sampah.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilKategori(id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_SAMPAH");
  const { id } = await params;
  const input = skemaUbahKategori.parse(await bacaBody(req));
  return sukses(await ubahKategori(id, input, sesi.userId));
});

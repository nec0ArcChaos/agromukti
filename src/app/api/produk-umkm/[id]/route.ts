import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { ambilProdukUmkm, ubahProdukUmkm, skemaUbahProdukUmkm } from "@/server/modules/umkm/umkm.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilProdukUmkm(id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_ORGANIK");
  const { id } = await params;
  const input = skemaUbahProdukUmkm.parse(await bacaBody(req));
  return sukses(await ubahProdukUmkm(id, input, sesi.userId));
});

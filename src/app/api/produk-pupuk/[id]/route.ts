import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { ambilProdukPupuk, ubahProdukPupuk, skemaUbahProdukPupuk } from "@/server/modules/pupuk/pupuk.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilProdukPupuk(id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const { id } = await params;
  const input = skemaUbahProdukPupuk.parse(await bacaBody(req));
  return sukses(await ubahProdukPupuk(id, input, sesi.userId));
});

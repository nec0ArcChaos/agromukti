import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaUbahPetani } from "@/server/modules/petani/petani.schema";
import { ambilPetani, ubahPetani } from "@/server/modules/petani/petani.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilPetani(id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const { id } = await params;
  const input = skemaUbahPetani.parse(await bacaBody(req));
  return sukses(await ubahPetani(id, input, sesi.userId));
});

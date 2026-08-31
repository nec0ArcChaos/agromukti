import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaUbahNasabah } from "@/server/modules/nasabah/nasabah.schema";
import { ambilNasabah, ubahNasabah } from "@/server/modules/nasabah/nasabah.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilNasabah(id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_SAMPAH");
  const { id } = await params;
  const input = skemaUbahNasabah.parse(await bacaBody(req));
  return sukses(await ubahNasabah(id, input, sesi.userId));
});

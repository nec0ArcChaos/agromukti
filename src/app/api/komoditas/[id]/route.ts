import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { ambilKomoditas, ubahKomoditas, skemaUbahKomoditas } from "@/server/modules/komoditas/komoditas.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilKomoditas(id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const { id } = await params;
  const input = skemaUbahKomoditas.parse(await bacaBody(req));
  return sukses(await ubahKomoditas(id, input, sesi.userId));
});

import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { ambilWarga, ubahWarga, skemaUbahWarga } from "@/server/modules/warga/warga.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilWarga(id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibMasuk();
  const { id } = await params;
  const input = skemaUbahWarga.parse(await bacaBody(req));
  return sukses(await ubahWarga(id, input, sesi.userId));
});

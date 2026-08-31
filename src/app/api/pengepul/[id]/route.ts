import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { skemaUbahPengepul } from "@/server/modules/pengepul/pengepul.schema";
import { ambilPengepul, ubahPengepul } from "@/server/modules/pengepul/pengepul.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilPengepul(id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibMasuk();
  const { id } = await params;
  const input = skemaUbahPengepul.parse(await bacaBody(req));
  return sukses(await ubahPengepul(id, input, sesi.userId));
});

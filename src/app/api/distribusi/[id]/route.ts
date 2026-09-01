import { z } from "zod";
import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { ambilDistribusi, ubahStatusDistribusi } from "@/server/modules/distribusi/distribusi.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilDistribusi(id));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const { id } = await params;
  const { status } = z.object({ status: z.enum(["DIKIRIM", "DITERIMA"]) }).parse(await bacaBody(req));
  return sukses(await ubahStatusDistribusi(id, status, sesi.userId));
});

import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { tolakPermintaan, skemaKeputusan } from "@/server/modules/permintaan/permintaan.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const { id } = await params;
  const { alasan } = skemaKeputusan.parse(await bacaBody(req));
  return sukses(await tolakPermintaan(id, alasan ?? "Tanpa alasan", sesi.userId));
});

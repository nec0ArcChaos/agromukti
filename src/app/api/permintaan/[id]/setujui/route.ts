import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { setujuiPermintaan } from "@/server/modules/permintaan/permintaan.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_TANI");
  const { id } = await params;
  return sukses(await setujuiPermintaan(id, sesi.userId));
});

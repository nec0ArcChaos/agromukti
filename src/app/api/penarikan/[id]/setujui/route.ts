import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { setujuiPenarikan } from "@/server/modules/penarikan/penarikan.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const sesi = await wajibPeran("ADMIN");
  const { id } = await params;
  return sukses(await setujuiPenarikan(id, sesi.userId));
});

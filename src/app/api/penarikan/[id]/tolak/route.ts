import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { skemaTolakPenarikan } from "@/server/modules/penarikan/penarikan.schema";
import { tolakPenarikan } from "@/server/modules/penarikan/penarikan.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN");
  const { id } = await params;
  const { alasan } = skemaTolakPenarikan.parse(await bacaBody(req));
  return sukses(await tolakPenarikan(id, alasan, sesi.userId));
});

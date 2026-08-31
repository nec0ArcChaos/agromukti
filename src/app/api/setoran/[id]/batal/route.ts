import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { skemaBatalSetoran } from "@/server/modules/setoran/setoran.schema";
import { batalSetoran } from "@/server/modules/setoran/setoran.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_SAMPAH");
  const { id } = await params;
  const { alasan } = skemaBatalSetoran.parse(await bacaBody(req));
  return sukses(await batalSetoran(id, alasan, sesi.userId));
});

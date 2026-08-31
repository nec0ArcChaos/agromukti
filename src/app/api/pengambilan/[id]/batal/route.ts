import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { skemaBatalPengambilan } from "@/server/modules/pengambilan/pengambilan.schema";
import { batalPengambilan } from "@/server/modules/pengambilan/pengambilan.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_SAMPAH");
  const { id } = await params;
  const { alasan } = skemaBatalPengambilan.parse(await bacaBody(req));
  return sukses(await batalPengambilan(id, alasan, sesi.userId));
});

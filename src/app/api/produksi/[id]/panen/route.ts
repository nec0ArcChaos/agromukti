import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { panenProduksi, skemaPanenProduksi } from "@/server/modules/produksi/produksi.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_ORGANIK");
  const { id } = await params;
  const input = skemaPanenProduksi.parse(await bacaBody(req));
  return sukses(await panenProduksi(id, input, sesi.userId));
});

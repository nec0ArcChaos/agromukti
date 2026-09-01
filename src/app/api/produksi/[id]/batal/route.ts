import { z } from "zod";
import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { batalProduksi } from "@/server/modules/produksi/produksi.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, { params }) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_ORGANIK");
  const { id } = await params;
  const { alasan } = z.object({ alasan: z.string().trim().min(1, "Alasan wajib diisi.") }).parse(await bacaBody(req));
  return sukses(await batalProduksi(id, alasan, sesi.userId));
});

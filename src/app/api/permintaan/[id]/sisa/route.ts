import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { sisaBolehSalur } from "@/server/modules/permintaan/permintaan.service";

type Ctx = { params: Promise<{ id: string }> };

/** Sisa yang masih boleh disalurkan per produk pada permintaan ini. */
export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await sisaBolehSalur(id));
});

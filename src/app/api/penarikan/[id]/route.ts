import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { ambilPenarikan } from "@/server/modules/penarikan/penarikan.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  return sukses(await ambilPenarikan(id));
});

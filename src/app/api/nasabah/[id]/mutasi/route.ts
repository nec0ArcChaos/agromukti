import { z } from "zod";
import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { mutasiNasabah } from "@/server/modules/nasabah/nasabah.service";

const skema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  await wajibMasuk();
  const { id } = await params;
  const { page, perPage } = skema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const { rows, total } = await mutasiNasabah(id, page, perPage);
  return sukses(rows, { page, perPage, total, totalPage: Math.max(1, Math.ceil(total / perPage)) });
});

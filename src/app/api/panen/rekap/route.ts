import { z } from "zod";
import { route } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { rekapPanen } from "@/server/modules/panen/panen.service";

const skema = z.object({
  dari: z.coerce.date().optional(),
  sampai: z.coerce.date().optional(),
  groupBy: z.enum(["komoditas", "dusun", "petani"]).default("komoditas"),
});

export const GET = route(async (req) => {
  await wajibMasuk();
  return sukses(await rekapPanen(skema.parse(bacaQuery(req.url))));
});

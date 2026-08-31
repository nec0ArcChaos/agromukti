import { route } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { skemaRentang } from "@/server/modules/laporan/laporan.schema";
import { laporanArusKas } from "@/server/modules/laporan/laporan.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaRentang.parse(bacaQuery(req.url));
  return sukses(await laporanArusKas(f));
});

import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { ringkasanDashboard } from "@/server/modules/laporan/laporan.service";

export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await ringkasanDashboard());
});

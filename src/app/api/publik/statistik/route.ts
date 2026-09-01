import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { statistikPublik } from "@/server/modules/publik/publik.service";

/** PUBLIK - hanya angka agregat desa, tidak ada data pribadi. */
export const GET = route(async () => {
  return sukses(await statistikPublik());
});

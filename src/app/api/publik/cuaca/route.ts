import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { cuacaArgamukti } from "@/server/modules/publik/publik.service";

/** PUBLIK - null bila tidak ada internet; halaman menyembunyikan widgetnya. */
export const GET = route(async () => {
  return sukses(await cuacaArgamukti());
});

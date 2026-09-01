import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { komoditasPublik } from "@/server/modules/publik/publik.service";

/** PUBLIK - nama komoditas + dosis anjuran, untuk kalkulator kebutuhan pupuk. */
export const GET = route(async () => {
  return sukses(await komoditasPublik());
});

import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { rekapLuasPerKomoditas } from "@/server/modules/lahan/lahan.service";

/** Luas garapan per komoditas (hektare) + usulan kebutuhan pupuknya. */
export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await rekapLuasPerKomoditas());
});

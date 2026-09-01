import { route, bacaBody, bacaIp } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { batasiLaju } from "@/server/lib/batas-laju";
import { ajukanPublik, skemaAjukanPublik } from "@/server/modules/publik/publik.service";

/**
 * PUBLIK - pengajuan pupuk mandiri tanpa login.
 *
 * Ini satu-satunya endpoint publik yang MENULIS ke basis data, jadi
 * batasnya paling ketat. Pengajuan selalu berstatus DIAJUKAN; petugas desa
 * yang memutuskan.
 */
export const POST = route(async (req) => {
  batasiLaju(`ajukan:${bacaIp(req) ?? "tanpa-ip"}`, 3, 300);
  const input = skemaAjukanPublik.parse(await bacaBody(req));
  return sukses(await ajukanPublik(input), undefined, 201);
});

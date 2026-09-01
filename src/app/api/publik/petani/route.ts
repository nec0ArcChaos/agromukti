import { route, bacaBody, bacaIp } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { batasiLaju } from "@/server/lib/batas-laju";
import { verifikasiPetani, skemaVerifikasiPetani } from "@/server/modules/publik/publik.service";

/** PUBLIK - verifikasi kartu tani sebelum warga boleh mengisi pengajuan. */
export const POST = route(async (req) => {
  batasiLaju(`petani:${bacaIp(req) ?? "tanpa-ip"}`, 10, 60);
  const input = skemaVerifikasiPetani.parse(await bacaBody(req));
  return sukses(await verifikasiPetani(input));
});

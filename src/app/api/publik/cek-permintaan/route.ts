import { route, bacaBody, bacaIp } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { batasiLaju } from "@/server/lib/batas-laju";
import { cekPermintaan, skemaCekPermintaan } from "@/server/modules/publik/publik.service";

/**
 * PUBLIK - cek status pengajuan pupuk.
 *
 * Dibatasi lajunya karena nomor pengajuan berurutan: tanpa batas, seseorang
 * bisa mencoba ribuan kombinasi nomor dan nama untuk menebak isi pengajuan
 * warga lain.
 */
export const POST = route(async (req) => {
  batasiLaju(`cek:${bacaIp(req) ?? "tanpa-ip"}`, 10, 60);
  const input = skemaCekPermintaan.parse(await bacaBody(req));
  return sukses(await cekPermintaan(input));
});

import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { cariWargaGanda } from "@/server/modules/warga/warga.service";

/** Deteksi kemungkinan data warga ganda (nama + dusun sama). */
export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await cariWargaGanda());
});

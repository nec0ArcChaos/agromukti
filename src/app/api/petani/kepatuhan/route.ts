import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { petaniTidakPatuh } from "@/server/modules/petani/petani.service";

/** Petani lama yang belum memenuhi syarat "nasabah aktif + pernah menyetor". */
export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await petaniTidakPatuh());
});

import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { daftarKelompokTani } from "@/server/modules/petani/petani.service";

export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await daftarKelompokTani());
});

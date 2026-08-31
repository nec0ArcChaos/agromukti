import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { daftarDusun } from "@/server/modules/nasabah/nasabah.service";

export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await daftarDusun());
});

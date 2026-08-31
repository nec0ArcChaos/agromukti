import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { daftarSetoranMenunggu } from "@/server/modules/setoran/setoran.service";

export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await daftarSetoranMenunggu());
});

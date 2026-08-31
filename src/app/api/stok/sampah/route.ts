import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { posisiMenunggu } from "@/server/modules/stok/stok.service";

export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await posisiMenunggu());
});

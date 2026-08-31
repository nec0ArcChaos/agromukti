import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { rekonsiliasiSaldo } from "@/server/modules/nasabah/nasabah.service";

/** Hitung ulang saldo seluruh nasabah dari buku besar. Khusus admin. */
export const POST = route(async () => {
  await wajibPeran("ADMIN");
  return sukses(await rekonsiliasiSaldo());
});

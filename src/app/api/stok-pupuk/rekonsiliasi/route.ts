import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { rekonsiliasiStokPupuk } from "@/server/modules/pupuk/pupuk.service";

/** Hitung ulang cache stok dari buku besar mutasi. Khusus admin. */
export const POST = route(async () => {
  await wajibPeran("ADMIN");
  return sukses(await rekonsiliasiStokPupuk());
});

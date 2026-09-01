import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";
import { ringkasanProduksi } from "@/server/modules/produksi/produksi.service";

export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await ringkasanProduksi());
});

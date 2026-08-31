import { route } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk } from "@/server/lib/auth";

export const GET = route(async () => {
  const sesi = await wajibMasuk();
  return sukses(sesi);
});

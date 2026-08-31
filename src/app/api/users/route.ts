import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { skemaBuatUser } from "@/server/modules/auth/auth.schema";
import { daftarUser, buatUser } from "@/server/modules/auth/auth.service";

export const GET = route(async () => {
  await wajibMasuk();
  return sukses(await daftarUser());
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN");
  const input = skemaBuatUser.parse(await bacaBody(req));
  return sukses(await buatUser(input, sesi.userId), undefined, 201);
});

import { route, bacaBody } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { wajibPeran } from "@/server/lib/auth";
import { koreksiOrganik, skemaKoreksiOrganik } from "@/server/modules/organik/organik.service";

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_ORGANIK");
  const input = skemaKoreksiOrganik.parse(await bacaBody(req));
  return sukses(await koreksiOrganik(input, sesi.userId), undefined, 201);
});

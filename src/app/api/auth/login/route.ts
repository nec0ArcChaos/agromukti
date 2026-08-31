import { route, bacaBody, bacaIp } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { skemaLogin } from "@/server/modules/auth/auth.schema";
import { login } from "@/server/modules/auth/auth.service";

export const POST = route(async (req) => {
  const input = skemaLogin.parse(await bacaBody(req));
  const sesi = await login(input, bacaIp(req));
  return sukses(sesi);
});

import { route, bacaBody } from "@/server/lib/handler";
import { bacaQuery } from "@/server/lib/pagination";
import { sukses } from "@/server/lib/response";
import { wajibMasuk, wajibPeran } from "@/server/lib/auth";
import { daftarMutasiOrganik, catatSetoranOrganik, stokOrganik, skemaSetoranOrganik, skemaFilterOrganik } from "@/server/modules/organik/organik.service";

export const GET = route(async (req) => {
  await wajibMasuk();
  const f = skemaFilterOrganik.parse(bacaQuery(req.url));
  const [{ rows, total }, stok] = await Promise.all([daftarMutasiOrganik(f), stokOrganik()]);
  return sukses({ stokKg: stok, mutasi: rows }, { page: f.page, perPage: f.perPage, total, totalPage: Math.max(1, Math.ceil(total / f.perPage)) });
});

export const POST = route(async (req) => {
  const sesi = await wajibPeran("ADMIN", "OPERATOR_ORGANIK");
  const input = skemaSetoranOrganik.parse(await bacaBody(req));
  return sukses(await catatSetoranOrganik(input, sesi.userId), undefined, 201);
});

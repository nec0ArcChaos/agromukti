import { route, bacaIp } from "@/server/lib/handler";
import { sukses } from "@/server/lib/response";
import { bacaSesiTerverifikasi } from "@/server/lib/auth";
import { logout } from "@/server/modules/auth/auth.service";

export const POST = route(async (req) => {
  // Sengaja memakai sesi terverifikasi: bila usernya sudah tidak ada,
  // cookie tetap dibersihkan tetapi audit log dilewati - menulis audit
  // dengan userId yang tidak ada akan melanggar foreign key dan membuat
  // pengguna terjebak tidak bisa keluar.
  const sesi = await bacaSesiTerverifikasi();
  await logout(sesi?.userId, bacaIp(req));
  return sukses({ pesan: "Berhasil keluar." });
});

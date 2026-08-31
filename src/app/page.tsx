import { redirect } from "next/navigation";
import { bacaSesiTerverifikasi } from "@/server/lib/auth";

export default async function Beranda() {
  const sesi = await bacaSesiTerverifikasi();
  redirect(sesi ? "/dashboard" : "/login");
}

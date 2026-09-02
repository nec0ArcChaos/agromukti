import { redirect } from "next/navigation";
import { bacaSesiTerverifikasi } from "@/server/lib/auth";
import Kerangka from "./kerangka";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesi = await bacaSesiTerverifikasi();
  if (!sesi) redirect("/petugas");

  return (
    <Kerangka nama={sesi.nama} role={sesi.role}>
      {children}
    </Kerangka>
  );
}

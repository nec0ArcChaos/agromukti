"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { api } from "@/lib/api";
import Sidebar, { KELOMPOK_TAUT } from "./sidebar";

const LABEL_PERAN: Record<string, string> = {
  ADMIN: "Administrator",
  OPERATOR_SAMPAH: "Operator Bank Sampah",
  OPERATOR_ORGANIK: "Operator Organik",
  OPERATOR_TANI: "Operator Pertanian",
  KEPALA_DESA: "Kepala Desa",
};

/**
 * Topbar menampilkan KELOMPOK modulnya, bukan nama halamannya.
 *
 * Tiap halaman sudah punya judul sendiri yang lebih spesifik ("Setoran
 * Sampah Anorganik"); menampilkan "Setoran" lagi di atasnya hanya
 * pengulangan. Kelompok ("Bank Sampah") justru memberi konteks pilar mana
 * yang sedang dibuka - berguna karena sistem ini menggabungkan tiga proker.
 */
function kelompokDari(pathname: string): string {
  for (const kel of KELOMPOK_TAUT) {
    if (kel.taut.some((x) => x.href === pathname)) return kel.label;
  }
  return "AgroMukti";
}

export default function Kerangka({
  nama,
  role,
  children,
}: {
  nama: string;
  role: string;
  children: React.ReactNode;
}) {
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function keluar() {
    await api.post("/api/auth/logout");
    router.push("/petugas");
    router.refresh();
  }

  const inisial = nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen">
      <Sidebar terbuka={menuTerbuka} onTutup={() => setMenuTerbuka(false)} />

      <div className="lg:pl-[265px]">
        <header className="tanpa-cetak sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuTerbuka(true)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {kelompokDari(pathname)}
              </p>
              <p className="text-[13px] font-semibold leading-tight text-foreground">
                Sistem Informasi Terpadu Desa Argamukti
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-semibold leading-tight text-foreground">{nama}</p>
              <p className="text-[11px] text-muted-foreground">{LABEL_PERAN[role] ?? role}</p>
            </div>
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {inisial}
            </div>
            <button
              onClick={keluar}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

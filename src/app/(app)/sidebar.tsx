"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote, Boxes, ClipboardList, FileText, FlaskConical, LayoutDashboard, Leaf,
  MapPinned, PackagePlus, Send, ShoppingBag, Sprout, Store, Tags, Tractor, Truck,
  UserCircle, Users, Wallet, Wheat, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Taut = { href: string; label: string; ikon: React.ComponentType<{ className?: string }> };
export type Kelompok = { label: string; taut: Taut[] };

export const KELOMPOK_TAUT: Kelompok[] = [
  {
    label: "Umum",
    taut: [
      { href: "/dashboard", label: "Beranda", ikon: LayoutDashboard },
      { href: "/warga", label: "Data Warga", ikon: Users },
      { href: "/laporan", label: "Laporan", ikon: FileText },
    ],
  },
  {
    label: "Bank Sampah",
    taut: [
      { href: "/setoran", label: "Setoran", ikon: PackagePlus },
      { href: "/pengambilan", label: "Pengambilan Pengepul", ikon: Truck },
      { href: "/penarikan", label: "Penarikan", ikon: Banknote },
      { href: "/nasabah", label: "Nasabah", ikon: UserCircle },
      { href: "/kategori-sampah", label: "Kategori Sampah", ikon: Tags },
      { href: "/pengepul", label: "Pengepul", ikon: Store },
      { href: "/kas", label: "Kas", ikon: Wallet },
    ],
  },
  {
    label: "Pertanian",
    taut: [
      { href: "/petani", label: "Petani", ikon: Tractor },
      { href: "/lahan", label: "Lahan", ikon: MapPinned },
      { href: "/komoditas", label: "Komoditas", ikon: Sprout },
      { href: "/panen", label: "Panen", ikon: Wheat },
    ],
  },
  {
    label: "Pupuk",
    taut: [
      { href: "/pupuk", label: "Stok Pupuk", ikon: Boxes },
      { href: "/permintaan", label: "Permintaan", ikon: ClipboardList },
      { href: "/distribusi", label: "Distribusi", ikon: Send },
    ],
  },
  {
    label: "Organik & UMKM",
    taut: [
      { href: "/organik", label: "Sampah Organik", ikon: Leaf },
      { href: "/produksi", label: "Produksi Pupuk", ikon: FlaskConical },
      { href: "/umkm", label: "Produk UMKM", ikon: ShoppingBag },
    ],
  },
];

export default function Sidebar({ terbuka, onTutup }: { terbuka: boolean; onTutup: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Lapisan gelap saat sidebar dibuka di layar kecil. */}
      {terbuka && (
        <button
          aria-label="Tutup menu"
          onClick={onTutup}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[265px] flex-col bg-sidebar transition-transform lg:translate-x-0",
          terbuka ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <div>
            <p className="text-base font-extrabold tracking-tight text-white">
              Agro<span className="text-sidebar-active-foreground">Mukti</span>
            </p>
            <p className="text-[11px] text-sidebar-foreground">Desa Argamukti</p>
          </div>
          <button onClick={onTutup} className="text-sidebar-foreground hover:text-white lg:hidden" aria-label="Tutup menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {KELOMPOK_TAUT.map((kel) => (
            <div key={kel.label} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {kel.label}
              </p>
              <ul className="space-y-0.5">
                {kel.taut.map((t) => {
                  const aktif = pathname === t.href;
                  const Ikon = t.ikon;
                  return (
                    <li key={t.href}>
                      <Link
                        href={t.href}
                        onClick={onTutup}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                          aktif
                            ? "bg-[var(--sidebar-active)] text-sidebar-active-foreground"
                            : "text-sidebar-foreground hover:bg-[var(--sidebar-hover)] hover:text-white",
                        )}
                        aria-current={aktif ? "page" : undefined}
                      >
                        <Ikon className="size-4 shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border px-5 py-3">
          <p className="text-[10px] leading-relaxed text-slate-600">
            KKM Kelompok 45 · Universitas Muhammadiyah Cirebon 2026
          </p>
        </div>
      </aside>
    </>
  );
}

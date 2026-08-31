import { redirect } from "next/navigation";
import { bacaSesiTerverifikasi } from "@/server/lib/auth";
import NavKlien from "./nav-klien";

const TAUT = [
  { href: "/dashboard", label: "Beranda" },
  { href: "/setoran", label: "Setoran" },
  { href: "/pengambilan", label: "Pengambilan Pengepul" },
  { href: "/penarikan", label: "Penarikan" },
  { href: "/nasabah", label: "Nasabah" },
  { href: "/kategori-sampah", label: "Kategori Sampah" },
  { href: "/pengepul", label: "Pengepul" },
  { href: "/kas", label: "Kas" },
  { href: "/laporan", label: "Laporan" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesi = await bacaSesiTerverifikasi();
  if (!sesi) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-medium text-emerald-700">Bank Sampah Organik</p>
            <p className="text-sm font-semibold text-neutral-900">Desa Argamukti</p>
          </div>
          <NavKlien nama={sesi.nama} role={sesi.role} />
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {TAUT.map((t) => (
            <a
              key={t.href}
              href={t.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              {t.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

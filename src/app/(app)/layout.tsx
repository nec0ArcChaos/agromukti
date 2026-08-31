import { redirect } from "next/navigation";
import { bacaSesiTerverifikasi } from "@/server/lib/auth";
import NavKlien from "./nav-klien";

const KELOMPOK_TAUT = [
  {
    label: "Umum",
    taut: [
      { href: "/dashboard", label: "Beranda" },
      { href: "/warga", label: "Data Warga" },
      { href: "/laporan", label: "Laporan" },
    ],
  },
  {
    label: "Bank Sampah",
    taut: [
      { href: "/setoran", label: "Setoran" },
      { href: "/pengambilan", label: "Pengambilan Pengepul" },
      { href: "/penarikan", label: "Penarikan" },
      { href: "/nasabah", label: "Nasabah" },
      { href: "/kategori-sampah", label: "Kategori Sampah" },
      { href: "/pengepul", label: "Pengepul" },
      { href: "/kas", label: "Kas" },
    ],
  },
  {
    label: "Pertanian",
    taut: [
      { href: "/petani", label: "Petani" },
      { href: "/lahan", label: "Lahan" },
      { href: "/komoditas", label: "Komoditas" },
      { href: "/panen", label: "Panen" },
    ],
  },
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
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-1 gap-y-2 px-4 pb-2 text-sm">
          {KELOMPOK_TAUT.map((kel) => (
            <div key={kel.label} className="flex items-center gap-1">
              <span className="mr-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {kel.label}
              </span>
              {kel.taut.map((t) => (
                <a
                  key={t.href}
                  href={t.href}
                  className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  {t.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

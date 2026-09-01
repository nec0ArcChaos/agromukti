import Link from "next/link";
import {
  AlertTriangle, Banknote, Boxes, CheckCircle2, ClipboardList, FlaskConical,
  Leaf, PackagePlus, Recycle, Tractor, Truck, Users, Wallet, Wheat,
} from "lucide-react";
import { ringkasanTerpadu } from "@/server/modules/laporan/laporan.service";
import { formatRupiah, formatKg } from "@/server/lib/money";

export const dynamic = "force-dynamic";

type Kartu = {
  label: string;
  nilai: string;
  sub: string;
  ikon: React.ComponentType<{ className?: string }>;
  href: string;
};

function Pilar({ judul, warna, ikon: Ikon, kartu }: {
  judul: string;
  warna: string;
  ikon: React.ComponentType<{ className?: string }>;
  kartu: Kartu[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className={`grid size-7 place-items-center rounded-md ${warna}`}>
          <Ikon className="size-4" />
        </div>
        <h2 className="text-sm font-bold text-foreground">{judul}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kartu.map((k) => {
          const KIkon = k.ikon;
          return (
            <Link key={k.label} href={k.href} className="card group transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</p>
                <KIkon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <p className="mt-2 text-xl font-bold text-foreground">{k.nilai}</p>
              <p className="text-xs text-muted-foreground">{k.sub}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default async function Dashboard() {
  const r = await ringkasanTerpadu();
  const selisihKas = r.bankSampah.saldoKasSaatIni - r.bankSampah.totalKewajibanTabungan;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Ringkasan Desa</h1>
        <p className="text-sm text-muted-foreground">
          Tiga pilar pengelolaan Desa Argamukti dalam satu pandangan.
        </p>
      </div>

      <Pilar
        judul="Bank Sampah — sampah anorganik"
        warna="bg-primary/10 text-primary"
        ikon={Recycle}
        kartu={[
          {
            label: "Setoran bulan ini", ikon: PackagePlus, href: "/setoran",
            nilai: `${r.bankSampah.setoranBulanIni.jumlahTransaksi} transaksi`,
            sub: formatKg(r.bankSampah.setoranBulanIni.totalBeratKg),
          },
          {
            label: "Menunggu pengepul", ikon: Truck, href: "/pengambilan",
            nilai: `${r.bankSampah.menungguDiproses.jumlahSetoran} setoran`,
            sub: formatKg(r.bankSampah.menungguDiproses.totalBeratKg),
          },
          {
            label: "Saldo kas", ikon: Wallet, href: "/kas",
            nilai: formatRupiah(r.bankSampah.saldoKasSaatIni), sub: "kas lembaga",
          },
          {
            label: "Kewajiban tabungan", ikon: Banknote, href: "/penarikan",
            nilai: formatRupiah(r.bankSampah.totalKewajibanTabungan),
            sub: `${r.bankSampah.penarikanMenunggu} penarikan menunggu`,
          },
        ]}
      />

      <div className={`card flex items-start gap-3 ${selisihKas < 0 ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
        {selisihKas < 0
          ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {selisihKas < 0
              ? "Kas belum menutupi seluruh kewajiban tabungan"
              : "Kas mencukupi seluruh kewajiban tabungan"}
          </p>
          <p className="text-xs text-muted-foreground">
            Selisih kas dikurangi kewajiban: {formatRupiah(selisihKas)}. Nasabah hanya dikredit bersamaan dengan uang
            masuk dari pengepul, jadi selisih negatif berarti kas terpakai untuk keperluan lain.
          </p>
        </div>
      </div>

      <Pilar
        judul="Sampah Organik — produksi pupuk"
        warna="bg-emerald-100 text-emerald-700"
        ikon={Leaf}
        kartu={[
          {
            label: "Stok bahan baku", ikon: Leaf, href: "/organik",
            nilai: `${Number(r.organik.stokKg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg`,
            sub: "sampah organik siap diolah",
          },
          {
            label: "Batch berproses", ikon: FlaskConical, href: "/produksi",
            nilai: String(r.organik.batchProses), sub: "sedang dikomposkan",
          },
          {
            label: "Batch selesai", ikon: CheckCircle2, href: "/produksi",
            nilai: String(r.organik.batchSelesai), sub: "sudah dipanen",
          },
          {
            label: "Permintaan pupuk", ikon: ClipboardList, href: "/permintaan",
            nilai: String(r.pertanian.permintaanMenunggu), sub: "menunggu persetujuan",
          },
        ]}
      />

      <Pilar
        judul="Pertanian — lahan & distribusi pupuk"
        warna="bg-amber-100 text-amber-700"
        ikon={Tractor}
        kartu={[
          {
            label: "Petani aktif", ikon: Users, href: "/petani",
            nilai: String(r.pertanian.petaniAktif), sub: "terdaftar",
          },
          {
            label: "Luas garapan", ikon: Tractor, href: "/lahan",
            nilai: `${Number(r.pertanian.totalHektare).toLocaleString("id-ID", { maximumFractionDigits: 2 })} ha`,
            sub: "lahan aktif",
          },
          {
            label: "Total panen", ikon: Wheat, href: "/panen",
            nilai: `${Number(r.pertanian.totalPanenKg).toLocaleString("id-ID", { maximumFractionDigits: 0 })} kg`,
            sub: "seluruh komoditas",
          },
          {
            label: "Stok pupuk", ikon: Boxes, href: "/pupuk",
            nilai: r.pertanian.stokPupuk.length
              ? r.pertanian.stokPupuk
                  .map((p) => `${Number(p.stok).toLocaleString("id-ID", { maximumFractionDigits: 0 })} ${p.satuan.toLowerCase()}`)
                  .join(" · ")
              : "—",
            sub: r.pertanian.stokPupuk.map((p) => p.nama.split(" ")[1] ?? p.nama).join(" · ") || "belum ada produk",
          },
        ]}
      />
    </div>
  );
}

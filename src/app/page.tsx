import Link from "next/link";
import { Prisma } from "@prisma/client";
import {
  ArrowRight, Cloud, Droplets, Leaf, Recycle, Search, Sprout, Tractor, Wind,
} from "lucide-react";
import { statistikPublik, cuacaArgamukti } from "@/server/modules/publik/publik.service";
import KalkulatorPupuk from "./kalkulator-pupuk";

export const revalidate = 300;

function angka(n: Prisma.Decimal | number, desimal = 0) {
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: desimal });
}

export default async function Beranda() {
  const [stat, cuaca] = await Promise.all([statistikPublik(), cuacaArgamukti()]);

  const metrik = [
    { label: "Petani terdaftar", nilai: angka(stat.petaniAktif), satuan: "orang", ikon: Tractor },
    { label: "Luas lahan tercatat", nilai: angka(stat.totalHektare, 2), satuan: "hektare", ikon: Sprout },
    { label: "Pupuk tersalurkan", nilai: angka(stat.pupukTersalurkan), satuan: "kg/liter", ikon: Leaf },
    { label: "Sampah terkelola", nilai: angka(Number(stat.sampahAnorganikKg) + Number(stat.sampahOrganikKg)), satuan: "kg", ikon: Recycle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ---------- Kepala ---------- */}
      {/*
        Header sengaja tanpa tombol apa pun.

        Pintu petugas (/petugas) tidak ditautkan dari situs publik supaya
        halaman ini terbaca sebagai situs layanan warga, bukan gerbang
        aplikasi kantor. CATATAN: ini pilihan tampilan, BUKAN pengamanan -
        alamatnya tetap bisa diketik siapa pun, dan yang benar-benar
        menjaga adalah autentikasi di baliknya.

        Tombol "Portal Warga" juga dibuang: tombol "Ajukan Pupuk" di hero
        sudah menuju ke sana, dan dua tombol ke tujuan yang sama hanya
        membuat pengunjung ragu harus menekan yang mana.
      */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-foreground">
              Agro<span className="text-primary">Mukti</span>
            </p>
            <p className="text-[11px] text-muted-foreground">Desa Argamukti, Argapura, Majalengka</p>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Sistem Informasi Terpadu Desa
          </p>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="bg-sidebar">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.2fr_1fr] lg:py-20">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--sidebar-active)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sidebar-active-foreground">
              Sistem Informasi Terpadu Desa
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Sampah warga menyuburkan lahan petani Argamukti
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-sidebar-foreground">
              Satu sistem yang menghubungkan tiga program desa: bank sampah anorganik yang menabung untuk warga,
              pengolahan sampah organik menjadi pupuk kompos, serta pendataan pertanian dan penyaluran pupuknya
              kepada petani.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#cek-status" className="btn">
                <Search className="size-4" /> Cek Status Pengajuan Pupuk
              </Link>
              <Link href="/portal" className="btn-secondary">
                Ajukan Pupuk <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Widget cuaca. Disembunyikan sepenuhnya bila tidak ada internet -
              sistem ini dirancang tetap berguna di jaringan lokal balai desa. */}
          {cuaca && (
            <div className="self-start rounded-xl border border-sidebar-border bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground">
                  Cuaca Argamukti
                </p>
                <Cloud className="size-4 text-sidebar-active-foreground" />
              </div>
              <p className="text-4xl font-extrabold text-white">{cuaca.suhu}°C</p>
              <p className="mt-1 text-sm text-sidebar-active-foreground">{cuaca.keterangan}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-sidebar-border pt-4">
                <div className="flex items-center gap-2">
                  <Droplets className="size-4 text-sidebar-foreground" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-600">Kelembaban</p>
                    <p className="text-sm font-semibold text-white">{cuaca.kelembaban}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="size-4 text-sidebar-foreground" />
                  <div>
                    <p className="text-[10px] uppercase text-slate-600">Angin</p>
                    <p className="text-sm font-semibold text-white">{cuaca.angin} km/j</p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-slate-600">
                Sumber: Open-Meteo · diperbarui berkala
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Metrik desa ---------- */}
      <section className="mx-auto -mt-8 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrik.map((m) => {
            const Ikon = m.ikon;
            return (
              <div key={m.label} className="card">
                <Ikon className="mb-2 size-5 text-primary" />
                <p className="text-2xl font-extrabold text-foreground">{m.nilai}</p>
                <p className="text-[11px] text-muted-foreground">{m.satuan}</p>
                <p className="mt-1 text-xs font-medium text-foreground">{m.label}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Angka dihitung langsung dari data sistem desa dan diperbarui otomatis.
        </p>
      </section>

      {/* ---------- Tiga pilar ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-xl font-bold text-foreground">Tiga program, satu sistem</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Ketiganya saling menyambung: sampah anorganik jadi tabungan warga, sampah organik jadi pupuk,
          dan pupuk itu menyuburkan lahan yang panennya dicatat kembali di sistem yang sama.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            {
              ikon: Recycle, judul: "Bank Sampah",
              isi: "Warga menyetor sampah anorganik dan ditimbang. Setelah pengepul membeli, hasilnya dibagi ke tiap penyetor sesuai beratnya dan masuk tabungan.",
            },
            {
              ikon: Leaf, judul: "Sampah Organik & Pupuk",
              isi: "Sampah organik desa diolah menjadi kompos padat dan pupuk cair. Setiap batch produksi tercatat lengkap dengan rendemennya.",
            },
            {
              ikon: Tractor, judul: "Pertanian & Distribusi",
              isi: "Data petani, lahan, komoditas, dan panen. Kebutuhan pupuk dihitung dari luas lahan, lalu disalurkan secara tercatat.",
            },
          ].map((p) => {
            const Ikon = p.ikon;
            return (
              <div key={p.judul} className="card">
                <div className="mb-3 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Ikon className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{p.judul}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.isi}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- Layanan mandiri ---------- */}
      <section id="cek-status" className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-xl font-bold text-foreground">Layanan mandiri warga</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tanpa perlu akun. Cukup gunakan kode kartu tani dan nama Anda.
          </p>
          <div className="mt-6">
            <KalkulatorPupuk />
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-sidebar">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-sm font-bold text-white">
            Agro<span className="text-sidebar-active-foreground">Mukti</span>
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground">
            Kuliah Kerja Mahasiswa Kelompok 45 · Universitas Muhammadiyah Cirebon 2026
            <br />
            Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka, Jawa Barat
          </p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, CheckCircle2, IdCard, Leaf } from "lucide-react";
import { api, ApiError } from "@/lib/api";

type Lahan = {
  id: string; luas: string; satuan: string; lokasi: string | null;
  komoditas: string; usulanPupukKg: string;
};
type Petani = {
  petaniId: string; kode: string; nama: string; dusun: string | null;
  kelompokTani: string | null; lahan: Lahan[];
};
type Produk = { id: string; nama: string; satuan: string };

export default function PortalWarga() {
  const [petani, setPetani] = useState<Petani | null>(null);
  const [nomorJadi, setNomorJadi] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Beranda
          </Link>
          <p className="text-base font-extrabold tracking-tight text-foreground">
            Agro<span className="text-primary">Mukti</span>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Portal Warga</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajukan kebutuhan pupuk kompos secara mandiri, tanpa perlu akun. Pengajuan Anda diteruskan ke petugas desa
            untuk diputuskan.
          </p>
        </div>

        {nomorJadi ? (
          <Selesai nomor={nomorJadi} onUlang={() => { setNomorJadi(null); setPetani(null); }} />
        ) : petani ? (
          <FormPengajuan petani={petani} onSelesai={setNomorJadi} onGanti={() => setPetani(null)} />
        ) : (
          <VerifikasiKartu onTerverifikasi={setPetani} />
        )}
      </main>
    </div>
  );
}

function VerifikasiKartu({ onTerverifikasi }: { onTerverifikasi: (p: Petani) => void }) {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMemuat(true);
    try {
      onTerverifikasi(await api.post<Petani>("/api/publik/petani", { kode, nama }));
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal memverifikasi. Coba lagi.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-md space-y-4">
      <div className="flex items-center gap-2">
        <IdCard className="size-5 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Verifikasi kartu tani</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Masukkan kode kartu tani dan nama Anda. Keduanya harus cocok dengan data desa.
      </p>

      <div>
        <label className="label" htmlFor="kode">Kode kartu tani</label>
        <input id="kode" className="field" placeholder="TN-0001" value={kode} onChange={(e) => setKode(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="nama">Nama lengkap</label>
        <input id="nama" className="field" value={nama} onChange={(e) => setNama(e.target.value)} required />
      </div>

      {galat && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{galat}</p>}
      <button className="btn w-full" disabled={memuat}>{memuat ? "Memeriksa..." : "Lanjutkan"}</button>

      <p className="text-xs text-muted-foreground">
        Belum punya kode kartu tani? Hubungi petugas desa untuk pendaftaran.
      </p>
    </form>
  );
}

function FormPengajuan({
  petani, onSelesai, onGanti,
}: { petani: Petani; onSelesai: (nomor: string) => void; onGanti: () => void }) {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [jumlah, setJumlah] = useState<Record<string, string>>({});
  const [keterangan, setKeterangan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = useCallback(async () => {
    try {
      setProdukList(await api.get<Produk[]>("/api/publik/produk-pupuk"));
    } catch {
      setProdukList([]);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- memuat daftar pupuk sekali saat komponen dipasang.
  useEffect(() => { muat(); }, [muat]);

  const totalUsulan = petani.lahan.reduce((a, l) => a + Number(l.usulanPupukKg), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      const item = produkList
        .filter((p) => jumlah[p.id] && Number(jumlah[p.id]) > 0)
        .map((p) => ({ produkPupukId: p.id, jumlah: Number(jumlah[p.id]) }));

      if (item.length === 0) {
        setGalat("Isi jumlah untuk sekurang-kurangnya satu jenis pupuk.");
        return;
      }

      const hasil = await api.post<{ nomor: string }>("/api/publik/pengajuan", {
        kode: petani.kode, nama: petani.nama,
        keterangan: keterangan || undefined, item,
      });
      onSelesai(hasil.nomor);
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal mengirim pengajuan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Kartu tani terverifikasi</p>
          <p className="mt-0.5 text-base font-bold text-foreground">{petani.nama}</p>
          <p className="text-xs text-muted-foreground">
            {petani.kode}
            {petani.dusun ? ` · Dusun ${petani.dusun}` : ""}
            {petani.kelompokTani ? ` · ${petani.kelompokTani}` : ""}
          </p>
        </div>
        <button onClick={onGanti} className="text-xs text-primary hover:underline">Ganti</button>
      </div>

      {petani.lahan.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <Leaf className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Lahan Anda &amp; perkiraan kebutuhan</h2>
          </div>
          <table className="tbl">
            <thead><tr><th>Komoditas</th><th>Lokasi</th><th className="text-right">Luas</th><th className="text-right">Perkiraan pupuk</th></tr></thead>
            <tbody>
              {petani.lahan.map((l) => (
                <tr key={l.id}>
                  <td>{l.komoditas}</td>
                  <td className="text-xs text-muted-foreground">{l.lokasi ?? "-"}</td>
                  <td className="text-right tabular-nums">
                    {Number(l.luas).toLocaleString("id-ID")} {l.satuan === "HA" ? "ha" : "m²"}
                  </td>
                  <td className="text-right tabular-nums font-medium">
                    {Number(l.usulanPupukKg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total perkiraan</td>
                <td className="text-right tabular-nums">
                  {totalUsulan.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Angka ini perkiraan dari dosis anjuran komoditas. Anda tetap boleh mengajukan jumlah berbeda.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="card space-y-4">
        <h2 className="text-sm font-bold text-foreground">Jumlah yang diajukan</h2>
        {produkList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada jenis pupuk yang tersedia untuk diajukan.</p>
        ) : (
          <div className="space-y-3">
            {produkList.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_140px] items-center gap-3">
                <label className="text-sm text-foreground" htmlFor={`p-${p.id}`}>
                  {p.nama} <span className="text-xs text-muted-foreground">({p.satuan.toLowerCase()})</span>
                </label>
                <input
                  id={`p-${p.id}`} type="number" step="0.01" min="0" placeholder="0"
                  className="field" value={jumlah[p.id] ?? ""}
                  onChange={(e) => setJumlah((prev) => ({ ...prev, [p.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="label" htmlFor="ket">Keterangan (opsional)</label>
          <input id="ket" className="field" maxLength={500} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
        </div>

        {galat && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{galat}</p>}
        <button className="btn w-full" disabled={menyimpan || produkList.length === 0}>
          {menyimpan ? "Mengirim..." : "Kirim pengajuan"}
        </button>
      </form>
    </div>
  );
}

function Selesai({ nomor, onUlang }: { nomor: string; onUlang: () => void }) {
  return (
    <div className="card max-w-md text-center">
      <CheckCircle2 className="mx-auto size-12 text-primary" />
      <h2 className="mt-3 text-lg font-bold text-foreground">Pengajuan terkirim</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Simpan nomor pengajuan berikut untuk memeriksa statusnya di halaman beranda.
      </p>
      <p className="my-4 rounded-lg border border-primary/30 bg-primary/5 py-3 font-mono text-lg font-bold text-primary">
        {nomor}
      </p>
      <p className="text-xs text-muted-foreground">
        Petugas desa akan meninjau pengajuan Anda. Status bisa dicek kapan saja dengan nomor di atas dan nama Anda.
      </p>
      <button onClick={onUlang} className="btn-secondary mt-4 w-full">Ajukan lagi</button>
    </div>
  );
}

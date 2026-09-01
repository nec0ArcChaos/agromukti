"use client";

import { useEffect, useState, useCallback } from "react";
import { Calculator, Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";

type Komoditas = { id: string; nama: string; dosisPupukPerHa: string };
type HasilCek = {
  nomor: string; tanggal: string; status: string; alasanTolak: string | null; atasNama: string;
  item: { produk: string; jumlah: string; satuan: string }[];
  distribusi: { nomor: string; status: string; tanggal: string }[];
};

const WARNA: Record<string, string> = {
  DIAJUKAN: "bg-amber-100 text-amber-800",
  DIPROSES: "bg-sky-100 text-sky-800",
  DISETUJUI: "bg-emerald-100 text-emerald-800",
  DITOLAK: "bg-red-100 text-red-700",
  SELESAI: "bg-muted text-muted-foreground",
};

export default function KalkulatorPupuk() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <CekStatus />
      <Kalkulator />
    </div>
  );
}

function CekStatus() {
  const [nomor, setNomor] = useState("");
  const [nama, setNama] = useState("");
  const [hasil, setHasil] = useState<HasilCek | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setHasil(null);
    setMemuat(true);
    try {
      setHasil(await api.post<HasilCek>("/api/publik/cek-permintaan", { nomor, nama }));
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal memeriksa. Coba lagi.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <Search className="size-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Cek Status Pengajuan Pupuk</h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Masukkan nomor pengajuan beserta nama Anda. Keduanya harus cocok agar pengajuan orang lain tidak bisa dilihat.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="nomor">Nomor pengajuan</label>
          <input
            id="nomor" className="field" placeholder="PMT-202609-0001"
            value={nomor} onChange={(e) => setNomor(e.target.value)} required
          />
        </div>
        <div>
          <label className="label" htmlFor="nama-cek">Nama petani</label>
          <input
            id="nama-cek" className="field" placeholder="Sesuai data kartu tani"
            value={nama} onChange={(e) => setNama(e.target.value)} required
          />
        </div>
        {galat && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{galat}</p>}
        <button className="btn w-full" disabled={memuat}>{memuat ? "Memeriksa..." : "Cek status"}</button>
      </form>

      {hasil && (
        <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted-foreground">{hasil.nomor}</p>
            <span className={`pill ${WARNA[hasil.status] ?? ""}`}>{hasil.status}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">{hasil.atasNama}</p>
          <p className="text-xs text-muted-foreground">
            Diajukan {new Date(hasil.tanggal).toLocaleDateString("id-ID", { dateStyle: "long" })}
          </p>

          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-foreground">
            {hasil.item.map((i, n) => (
              <li key={n} className="flex justify-between">
                <span>{i.produk}</span>
                <span className="tabular-nums font-medium">
                  {Number(i.jumlah).toLocaleString("id-ID")} {i.satuan.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>

          {hasil.alasanTolak && (
            <p className="mt-3 text-xs text-destructive">Alasan ditolak: {hasil.alasanTolak}</p>
          )}
          {hasil.distribusi.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Penyaluran</p>
              {hasil.distribusi.map((d) => (
                <p key={d.nomor} className="text-xs text-foreground">
                  {d.nomor} — {d.status} ({new Date(d.tanggal).toLocaleDateString("id-ID")})
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Kalkulator() {
  const [komoditas, setKomoditas] = useState<Komoditas[]>([]);
  const [komoditasId, setKomoditasId] = useState("");
  const [luas, setLuas] = useState("");
  const [satuan, setSatuan] = useState("M2");

  const muat = useCallback(async () => {
    try {
      setKomoditas(await api.get<Komoditas[]>("/api/publik/komoditas"));
    } catch {
      setKomoditas([]);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- memuat daftar komoditas sekali saat komponen dipasang.
  useEffect(() => { muat(); }, [muat]);

  const k = komoditas.find((x) => x.id === komoditasId);
  const hektare = luas ? (satuan === "HA" ? Number(luas) : Number(luas) / 10000) : 0;
  const kebutuhan = k ? hektare * Number(k.dosisPupukPerHa) : 0;

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <Calculator className="size-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Kalkulator Kebutuhan Pupuk</h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Perkiraan kebutuhan pupuk kompos berdasarkan luas lahan dan dosis anjuran komoditas.
      </p>

      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="kom">Komoditas</label>
          <select id="kom" className="field" value={komoditasId} onChange={(e) => setKomoditasId(e.target.value)}>
            <option value="">Pilih komoditas...</option>
            {komoditas.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nama} ({Number(x.dosisPupukPerHa).toLocaleString("id-ID")} kg/ha)
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <div>
            <label className="label" htmlFor="luas">Luas lahan</label>
            <input
              id="luas" type="number" step="0.01" min="0" className="field"
              value={luas} onChange={(e) => setLuas(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="sat">Satuan</label>
            <select id="sat" className="field" value={satuan} onChange={(e) => setSatuan(e.target.value)}>
              <option value="M2">m²</option>
              <option value="HA">hektare</option>
            </select>
          </div>
        </div>
      </div>

      {k && hektare > 0 && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">
            {hektare.toLocaleString("id-ID", { maximumFractionDigits: 4 })} ha ×{" "}
            {Number(k.dosisPupukPerHa).toLocaleString("id-ID")} kg/ha
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">
            {kebutuhan.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg
          </p>
          <p className="text-xs text-muted-foreground">
            Perkiraan kebutuhan pupuk untuk {k.nama}. Jumlah yang disetujui petugas bisa berbeda menyesuaikan stok.
          </p>
        </div>
      )}
    </div>
  );
}

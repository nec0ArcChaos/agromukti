"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Petani = { id: string; kode: string; warga: { nama: string; dusun: string | null } };
type Komoditas = { id: string; nama: string; dosisPupukPerHa: string };
type Lahan = {
  id: string;
  luas: string;
  satuan: string;
  lokasi: string | null;
  status: string;
  luasHektare: string;
  usulanPupukKg: string;
  petani: { kode: string; warga: { nama: string; dusun: string | null } };
  komoditas: { nama: string };
};
type Rekap = { komoditasId: string; nama: string; hektare: string; jumlahLahan: number; usulanPupukKg: string };

export default function HalamanLahan() {
  const [rows, setRows] = useState<Lahan[]>([]);
  const [rekap, setRekap] = useState<Rekap[]>([]);
  const [petaniList, setPetaniList] = useState<Petani[]>([]);
  const [komoditasList, setKomoditasList] = useState<Komoditas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [l, r, p, k] = await Promise.all([
      api.get<Lahan[]>("/api/lahan?perPage=50"),
      api.get<Rekap[]>("/api/lahan/rekap"),
      api.get<Petani[]>("/api/petani?perPage=100&status=AKTIF"),
      api.get<Komoditas[]>("/api/komoditas?aktif=true"),
    ]);
    setRows(l); setRekap(r); setPetaniList(p); setKomoditasList(k);
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Lahan</h1>
          <p className="text-sm text-neutral-500">Luas boleh dicatat dalam m² atau hektare - rekap selalu dinormalkan ke hektare.</p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Lahan baru"}</button>
      </div>

      {formTerbuka && (
        <FormLahan petaniList={petaniList} komoditasList={komoditasList} onSelesai={() => { setFormTerbuka(false); muat(); }} />
      )}

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Rekap luas per komoditas</h2>
        <table className="tbl">
          <thead><tr><th>Komoditas</th><th className="text-right">Jumlah lahan</th><th className="text-right">Luas (ha)</th><th className="text-right">Usulan pupuk</th></tr></thead>
          <tbody>
            {rekap.map((r) => (
              <tr key={r.komoditasId}>
                <td>{r.nama}</td>
                <td className="text-right tabular-nums">{r.jumlahLahan}</td>
                <td className="text-right tabular-nums">{Number(r.hektare).toLocaleString("id-ID", { maximumFractionDigits: 4 })}</td>
                <td className="text-right tabular-nums">{Number(r.usulanPupukKg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg</td>
              </tr>
            ))}
            {rekap.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-neutral-400">Belum ada lahan aktif.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Daftar lahan</h2>
        {memuat ? <p className="text-sm text-neutral-500">Memuat...</p> : (
          <table className="tbl">
            <thead>
              <tr><th>Petani</th><th>Komoditas</th><th className="text-right">Luas</th><th className="text-right">Setara (ha)</th><th className="text-right">Usulan pupuk</th><th>Lokasi</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td>{l.petani.warga.nama}<br /><span className="font-mono text-xs text-neutral-400">{l.petani.kode}</span></td>
                  <td>{l.komoditas.nama}</td>
                  <td className="text-right tabular-nums">{Number(l.luas).toLocaleString("id-ID")} {l.satuan === "HA" ? "ha" : "m²"}</td>
                  <td className="text-right tabular-nums">{Number(l.luasHektare).toLocaleString("id-ID", { maximumFractionDigits: 4 })}</td>
                  <td className="text-right tabular-nums">{Number(l.usulanPupukKg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg</td>
                  <td className="text-xs text-neutral-500">{l.lokasi ?? "-"}</td>
                  <td><span className={`pill ${l.status === "AKTIF" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-600"}`}>{l.status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-neutral-400">Belum ada lahan.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormLahan({
  petaniList, komoditasList, onSelesai,
}: { petaniList: Petani[]; komoditasList: Komoditas[]; onSelesai: () => void }) {
  const [petaniId, setPetaniId] = useState("");
  const [komoditasId, setKomoditasId] = useState("");
  const [luas, setLuas] = useState("");
  const [satuan, setSatuan] = useState("M2");
  const [lokasi, setLokasi] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const komoditas = komoditasList.find((k) => k.id === komoditasId);
  const hektare = luas ? (satuan === "HA" ? Number(luas) : Number(luas) / 10000) : 0;
  const usulan = komoditas ? hektare * Number(komoditas.dosisPupukPerHa) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.post("/api/lahan", { petaniId, komoditasId, luas: Number(luas), satuan, lokasi: lokasi || undefined });
      onSelesai();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Petani</label>
          <select className="field" value={petaniId} onChange={(e) => setPetaniId(e.target.value)} required>
            <option value="">Pilih petani...</option>
            {petaniList.map((p) => <option key={p.id} value={p.id}>{p.kode} - {p.warga.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Komoditas</label>
          <select className="field" value={komoditasId} onChange={(e) => setKomoditasId(e.target.value)} required>
            <option value="">Pilih komoditas...</option>
            {komoditasList.map((k) => <option key={k.id} value={k.id}>{k.nama} ({k.dosisPupukPerHa} kg/ha)</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div><label className="label">Luas</label><input type="number" step="0.01" min="0.01" className="field" value={luas} onChange={(e) => setLuas(e.target.value)} required /></div>
        <div>
          <label className="label">Satuan</label>
          <select className="field" value={satuan} onChange={(e) => setSatuan(e.target.value)}>
            <option value="M2">m²</option><option value="HA">hektare</option>
          </select>
        </div>
        <div><label className="label">Lokasi</label><input className="field" value={lokasi} onChange={(e) => setLokasi(e.target.value)} /></div>
      </div>

      {hektare > 0 && (
        <p className="text-sm text-neutral-600">
          Setara <span className="font-medium">{hektare.toLocaleString("id-ID", { maximumFractionDigits: 4 })} ha</span>
          {komoditas && <> · usulan kebutuhan pupuk <span className="font-medium">{usulan.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg</span></>}
        </p>
      )}

      {galat && <p className="text-sm text-red-600">{galat}</p>}
      <button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan lahan"}</button>
    </form>
  );
}

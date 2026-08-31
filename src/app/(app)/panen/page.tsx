"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Petani = { id: string; kode: string; warga: { nama: string } };
type Komoditas = { id: string; nama: string };
type Panen = {
  id: string;
  jumlahPanen: string;
  satuan: string;
  jumlahKg: string;
  tanggalPanen: string;
  keterangan: string | null;
  petani: { kode: string; warga: { nama: string; dusun: string | null } };
  komoditas: { nama: string };
};
type Rekap = { rows: { key: string; label: string; jumlahKg: string; jumlahCatatan: number }[]; totalKg: string };

const LABEL_SATUAN: Record<string, string> = { KG: "kg", KUINTAL: "kuintal", TON: "ton" };

export default function HalamanPanen() {
  const [rows, setRows] = useState<Panen[]>([]);
  const [rekap, setRekap] = useState<Rekap | null>(null);
  const [petaniList, setPetaniList] = useState<Petani[]>([]);
  const [komoditasList, setKomoditasList] = useState<Komoditas[]>([]);
  const [groupBy, setGroupBy] = useState("komoditas");
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [p, r, pt, k] = await Promise.all([
      api.get<Panen[]>("/api/panen?perPage=50"),
      api.get<Rekap>(`/api/panen/rekap?groupBy=${groupBy}`),
      api.get<Petani[]>("/api/petani?perPage=100&status=AKTIF"),
      api.get<Komoditas[]>("/api/komoditas?aktif=true"),
    ]);
    setRows(p); setRekap(r); setPetaniList(pt); setKomoditasList(k);
    setMemuat(false);
  }, [groupBy]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Panen</h1>
          <p className="text-sm text-neutral-500">Boleh dicatat dalam kg, kuintal, atau ton - rekap selalu dinormalkan ke kilogram.</p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Catat panen"}</button>
      </div>

      {formTerbuka && (
        <FormPanen petaniList={petaniList} komoditasList={komoditasList} onSelesai={() => { setFormTerbuka(false); muat(); }} />
      )}

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Rekap panen</h2>
          <select className="field max-w-[180px]" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="komoditas">Per komoditas</option>
            <option value="dusun">Per dusun</option>
            <option value="petani">Per petani</option>
          </select>
        </div>
        <table className="tbl">
          <thead><tr><th>Kelompok</th><th className="text-right">Catatan</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {rekap?.rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td className="text-right tabular-nums">{r.jumlahCatatan}</td>
                <td className="text-right tabular-nums">{Number(r.jumlahKg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg</td>
              </tr>
            ))}
            {rekap?.rows.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-neutral-400">Belum ada data panen.</td></tr>}
          </tbody>
          {rekap && rekap.rows.length > 0 && (
            <tfoot><tr className="font-semibold"><td>Total</td><td></td><td className="text-right tabular-nums">{Number(rekap.totalKg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg</td></tr></tfoot>
          )}
        </table>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Catatan panen terbaru</h2>
        {memuat ? <p className="text-sm text-neutral-500">Memuat...</p> : (
          <table className="tbl">
            <thead>
              <tr><th>Tanggal</th><th>Petani</th><th>Komoditas</th><th className="text-right">Jumlah</th><th className="text-right">Setara (kg)</th><th>Keterangan</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="text-xs">{new Date(p.tanggalPanen).toLocaleDateString("id-ID")}</td>
                  <td>{p.petani.warga.nama}<br /><span className="font-mono text-xs text-neutral-400">{p.petani.kode}</span></td>
                  <td>{p.komoditas.nama}</td>
                  <td className="text-right tabular-nums">{Number(p.jumlahPanen).toLocaleString("id-ID")} {LABEL_SATUAN[p.satuan] ?? p.satuan}</td>
                  <td className="text-right tabular-nums">{Number(p.jumlahKg).toLocaleString("id-ID", { maximumFractionDigits: 2 })}</td>
                  <td className="text-xs text-neutral-500">{p.keterangan ?? "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-neutral-400">Belum ada catatan panen.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormPanen({
  petaniList, komoditasList, onSelesai,
}: { petaniList: Petani[]; komoditasList: Komoditas[]; onSelesai: () => void }) {
  const [petaniId, setPetaniId] = useState("");
  const [komoditasId, setKomoditasId] = useState("");
  const [jumlahPanen, setJumlah] = useState("");
  const [satuan, setSatuan] = useState("KG");
  const [tanggalPanen, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const kg = jumlahPanen ? Number(jumlahPanen) * (satuan === "TON" ? 1000 : satuan === "KUINTAL" ? 100 : 1) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.post("/api/panen", {
        petaniId, komoditasId,
        jumlahPanen: Number(jumlahPanen), satuan, tanggalPanen,
        keterangan: keterangan || undefined,
      });
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
            {komoditasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div><label className="label">Jumlah</label><input type="number" step="0.01" min="0.01" className="field" value={jumlahPanen} onChange={(e) => setJumlah(e.target.value)} required /></div>
        <div>
          <label className="label">Satuan</label>
          <select className="field" value={satuan} onChange={(e) => setSatuan(e.target.value)}>
            <option value="KG">kg</option><option value="KUINTAL">kuintal</option><option value="TON">ton</option>
          </select>
        </div>
        <div><label className="label">Tanggal panen</label><input type="date" className="field" value={tanggalPanen} onChange={(e) => setTanggal(e.target.value)} required /></div>
        <div><label className="label">Keterangan</label><input className="field" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></div>
      </div>

      {kg > 0 && satuan !== "KG" && (
        <p className="text-sm text-neutral-600">Setara <span className="font-medium">{kg.toLocaleString("id-ID")} kg</span></p>
      )}

      {galat && <p className="text-sm text-red-600">{galat}</p>}
      <button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan panen"}</button>
    </form>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Komoditas = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  dosisPupukPerHa: string;
  aktif: boolean;
  _count: { lahan: number; panen: number };
};

export default function HalamanKomoditas() {
  const [rows, setRows] = useState<Komoditas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setRows(await api.get<Komoditas[]>("/api/komoditas"));
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Komoditas</h1>
          <p className="text-sm text-muted-foreground">Dosis pupuk per hektare dipakai menghitung usulan kebutuhan pupuk tiap lahan.</p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Komoditas baru"}</button>
      </div>

      {formTerbuka && <FormKomoditas onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        {memuat ? <p className="text-sm text-muted-foreground">Memuat...</p> : (
          <table className="tbl">
            <thead>
              <tr><th>Kode</th><th>Nama</th><th>Deskripsi</th><th className="text-right">Dosis/ha</th><th className="text-right">Lahan</th><th className="text-right">Panen</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id}>
                  <td className="font-mono text-xs">{k.kode}</td>
                  <td>{k.nama}</td>
                  <td className="text-xs text-muted-foreground">{k.deskripsi ?? "-"}</td>
                  <td className="text-right tabular-nums">{k.dosisPupukPerHa} kg</td>
                  <td className="text-right tabular-nums">{k._count.lahan}</td>
                  <td className="text-right tabular-nums">{k._count.panen}</td>
                  <td><span className={`pill ${k.aktif ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{k.aktif ? "Aktif" : "Nonaktif"}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Belum ada komoditas.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormKomoditas({ onSelesai }: { onSelesai: () => void }) {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [dosis, setDosis] = useState("5");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.post("/api/komoditas", {
        kode,
        nama,
        deskripsi: deskripsi || undefined,
        dosisPupukPerHa: Number(dosis),
      });
      onSelesai();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div><label className="label">Kode</label><input className="field" value={kode} onChange={(e) => setKode(e.target.value)} required /></div>
      <div><label className="label">Nama</label><input className="field" value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
      <div className="sm:col-span-1"><label className="label">Dosis pupuk (kg/ha)</label><input type="number" step="0.01" min="0" className="field" value={dosis} onChange={(e) => setDosis(e.target.value)} required /></div>
      <div><label className="label">Deskripsi</label><input className="field" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} /></div>
      {galat && <p className="col-span-4 text-sm text-red-600">{galat}</p>}
      <div className="col-span-4"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan komoditas"}</button></div>
    </form>
  );
}

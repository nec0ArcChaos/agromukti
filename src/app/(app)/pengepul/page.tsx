"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Pengepul = { id: string; kode: string; nama: string; noHp: string | null; alamat: string | null; aktif: boolean };

export default function HalamanPengepul() {
  const [rows, setRows] = useState<Pengepul[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setRows(await api.get<Pengepul[]>("/api/pengepul"));
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Pengepul</h1>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Pengepul baru"}</button>
      </div>

      {formTerbuka && <FormPengepul onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        {memuat ? <p className="text-sm text-muted-foreground">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Nama</th><th>No. HP</th><th>Alamat</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.kode}</td>
                  <td>{p.nama}</td>
                  <td>{p.noHp ?? "-"}</td>
                  <td className="text-xs text-muted-foreground">{p.alamat ?? "-"}</td>
                  <td><span className={`pill ${p.aktif ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{p.aktif ? "Aktif" : "Nonaktif"}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Belum ada pengepul.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormPengepul({ onSelesai }: { onSelesai: () => void }) {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.post("/api/pengepul", { kode, nama, noHp: noHp || undefined, alamat: alamat || undefined });
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
      <div><label className="label">No. HP</label><input className="field" value={noHp} onChange={(e) => setNoHp(e.target.value)} /></div>
      <div><label className="label">Alamat</label><input className="field" value={alamat} onChange={(e) => setAlamat(e.target.value)} /></div>
      {galat && <p className="col-span-4 text-sm text-red-600">{galat}</p>}
      <div className="col-span-4"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan pengepul"}</button></div>
    </form>
  );
}

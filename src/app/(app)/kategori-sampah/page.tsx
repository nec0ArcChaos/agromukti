"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Kategori = { id: string; kode: string; nama: string; aktif: boolean };

export default function HalamanKategoriSampah() {
  const [rows, setRows] = useState<Kategori[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setRows(await api.get<Kategori[]>("/api/kategori-sampah"));
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Kategori Sampah</h1>
          <p className="text-sm text-neutral-500">Label ringan untuk laporan komposisi. Tidak ada harga di sini - harga ditentukan pengepul saat datang.</p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Kategori baru"}</button>
      </div>

      {formTerbuka && <FormKategori onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        {memuat ? <p className="text-sm text-neutral-500">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Nama</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id}>
                  <td className="font-mono text-xs">{k.kode}</td>
                  <td>{k.nama}</td>
                  <td><span className={`pill ${k.aktif ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-600"}`}>{k.aktif ? "Aktif" : "Nonaktif"}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-neutral-400">Belum ada kategori.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormKategori({ onSelesai }: { onSelesai: () => void }) {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.post("/api/kategori-sampah", { kode, nama });
      onSelesai();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div><label className="label">Kode</label><input className="field" value={kode} onChange={(e) => setKode(e.target.value)} required /></div>
      <div><label className="label">Nama</label><input className="field" value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
      {galat && <p className="col-span-3 text-sm text-red-600">{galat}</p>}
      <div className="col-span-3"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan kategori"}</button></div>
    </form>
  );
}

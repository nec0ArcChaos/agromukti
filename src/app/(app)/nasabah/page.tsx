"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Nasabah = {
  id: string;
  kode: string;
  nama: string;
  noHp: string | null;
  dusun: string | null;
  status: string;
  saldo: number;
};

export default function HalamanNasabah() {
  const [rows, setRows] = useState<Nasabah[]>([]);
  const [q, setQ] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    const { data } = await api.getMeta<Nasabah[]>(`/api/nasabah?perPage=50${q ? `&q=${encodeURIComponent(q)}` : ""}`);
    setRows(data);
    setMemuat(false);
  }, [q]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Nasabah</h1>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>
          {formTerbuka ? "Tutup formulir" : "+ Nasabah baru"}
        </button>
      </div>

      {formTerbuka && <FormNasabah onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        <input
          className="field mb-3 max-w-xs"
          placeholder="Cari nama, kode, atau no. HP..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {memuat ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Kode</th><th>Nama</th><th>Dusun</th><th>No. HP</th><th>Status</th><th className="text-right">Saldo</th></tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td className="font-mono text-xs">{n.kode}</td>
                  <td>{n.nama}</td>
                  <td>{n.dusun ?? "-"}</td>
                  <td>{n.noHp ?? "-"}</td>
                  <td>
                    <span className={`pill ${n.status === "AKTIF" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-600"}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">Rp {n.saldo.toLocaleString("id-ID")}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-neutral-400">Belum ada nasabah.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormNasabah({ onSelesai }: { onSelesai: () => void }) {
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [dusun, setDusun] = useState("");
  const [alamat, setAlamat] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.post("/api/nasabah", { nama, noHp: noHp || undefined, dusun: dusun || undefined, alamat: alamat || undefined });
      onSelesai();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Nama</label>
        <input className="field" value={nama} onChange={(e) => setNama(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">No. HP</label>
        <input className="field" value={noHp} onChange={(e) => setNoHp(e.target.value)} />
      </div>
      <div>
        <label className="label">Dusun</label>
        <input className="field" value={dusun} onChange={(e) => setDusun(e.target.value)} />
      </div>
      <div>
        <label className="label">Alamat</label>
        <input className="field" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
      </div>
      {galat && <p className="col-span-2 text-sm text-red-600">{galat}</p>}
      <div className="col-span-2">
        <button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan nasabah"}</button>
      </div>
    </form>
  );
}

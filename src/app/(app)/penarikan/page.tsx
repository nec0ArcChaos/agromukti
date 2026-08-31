"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Nasabah = { id: string; kode: string; nama: string; saldo: number };
type Penarikan = {
  id: string;
  nomor: string;
  jumlah: number;
  metode: string;
  status: string;
  nasabah: { nama: string; kode: string };
  createdAt: string;
};
type Sesi = { role: "ADMIN" | "OPERATOR" };

export default function HalamanPenarikan() {
  const [nasabahList, setNasabahList] = useState<Nasabah[]>([]);
  const [rows, setRows] = useState<Penarikan[]>([]);
  const [sesi, setSesi] = useState<Sesi | null>(null);
  const [memuat, setMemuat] = useState(true);

  const [nasabahId, setNasabahId] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [n, p, me] = await Promise.all([
      api.get<Nasabah[]>("/api/nasabah?perPage=100&status=AKTIF"),
      api.get<Penarikan[]>("/api/penarikan?perPage=20"),
      api.get<Sesi>("/api/auth/me"),
    ]);
    setNasabahList(n);
    setRows(p);
    setSesi(me);
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.post("/api/penarikan", { nasabahId, jumlah: Number(jumlah) });
      setNasabahId("");
      setJumlah("");
      muat();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal mengajukan penarikan.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function setujui(id: string) {
    try {
      await api.post(`/api/penarikan/${id}/setujui`);
      muat();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menyetujui.");
    }
  }

  async function tolak(id: string) {
    const alasan = window.prompt("Alasan penolakan?");
    if (!alasan) return;
    try {
      await api.post(`/api/penarikan/${id}/tolak`, { alasan });
      muat();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menolak.");
    }
  }

  const nasabahTerpilih = nasabahList.find((n) => n.id === nasabahId);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900">Penarikan Saldo</h1>

      <form onSubmit={submit} className="card space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nasabah</label>
            <select className="field" value={nasabahId} onChange={(e) => setNasabahId(e.target.value)} required>
              <option value="">Pilih nasabah...</option>
              {nasabahList.map((n) => (
                <option key={n.id} value={n.id}>{n.kode} - {n.nama} (saldo Rp {n.saldo.toLocaleString("id-ID")})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Jumlah penarikan (Rp)</label>
            <input type="number" min="1" className="field" value={jumlah} onChange={(e) => setJumlah(e.target.value)} required />
            {nasabahTerpilih && (
              <p className="mt-1 text-xs text-neutral-500">Saldo tersedia: Rp {nasabahTerpilih.saldo.toLocaleString("id-ID")}</p>
            )}
          </div>
        </div>
        {galat && <p className="text-sm text-red-600">{galat}</p>}
        <button className="btn" disabled={menyimpan}>{menyimpan ? "Mengajukan..." : "Ajukan penarikan"}</button>
      </form>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Daftar penarikan</h2>
        {memuat ? (
          <p className="text-sm text-neutral-500">Memuat...</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Nomor</th><th>Nasabah</th><th className="text-right">Jumlah</th><th>Metode</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.nomor}</td>
                  <td>{p.nasabah.nama}</td>
                  <td className="text-right tabular-nums">Rp {p.jumlah.toLocaleString("id-ID")}</td>
                  <td className="text-xs text-neutral-500">{p.metode}</td>
                  <td>
                    <span className={`pill ${
                      p.status === "DISETUJUI" ? "bg-emerald-100 text-emerald-800" :
                      p.status === "DITOLAK" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="space-x-2">
                    {p.status === "PENDING" && sesi?.role === "ADMIN" && (
                      <>
                        <button onClick={() => setujui(p.id)} className="text-xs text-emerald-700 hover:underline">Setujui</button>
                        <button onClick={() => tolak(p.id)} className="text-xs text-red-600 hover:underline">Tolak</button>
                      </>
                    )}
                    {p.status === "PENDING" && sesi?.role !== "ADMIN" && (
                      <span className="text-xs text-neutral-400">Menunggu admin</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-neutral-400">Belum ada penarikan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

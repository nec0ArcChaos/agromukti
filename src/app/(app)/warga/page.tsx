"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Warga = {
  id: string;
  nama: string;
  noHp: string | null;
  dusun: string | null;
  rt: string | null;
  rw: string | null;
  aktif: boolean;
  nasabah: { id: string; kode: string; saldo: number; status: string }[];
  petani: { id: string; kode: string; kelompokTani: string | null; status: string }[];
};
type Ganda = { id: string; nama: string; dusun: string | null; noHp: string | null }[];

export default function HalamanWarga() {
  const [rows, setRows] = useState<Warga[]>([]);
  const [ganda, setGanda] = useState<Ganda[]>([]);
  const [q, setQ] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [w, g] = await Promise.all([
      api.get<Warga[]>(`/api/warga?perPage=50${q ? `&q=${encodeURIComponent(q)}` : ""}`),
      api.get<Ganda[]>("/api/warga/ganda"),
    ]);
    setRows(w);
    setGanda(g);
    setMemuat(false);
  }, [q]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Data Warga</h1>
          <p className="text-sm text-neutral-500">Identitas tunggal warga desa. Satu orang bisa punya peran di beberapa pilar sekaligus.</p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Warga baru"}</button>
      </div>

      {formTerbuka && <FormWarga onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      {ganda.length > 0 && (
        <div className="card border-amber-300 bg-amber-50">
          <p className="text-sm font-medium text-neutral-900">
            {ganda.length} kemungkinan data warga ganda terdeteksi
          </p>
          <p className="mb-2 text-xs text-neutral-600">
            Nama dan dusun yang sama biasanya berarti satu orang terdaftar dua kali - misalnya sekali lewat bank
            sampah, sekali lewat pertanian. Master data warga hanya bermanfaat kalau benar-benar tunggal.
          </p>
          <ul className="text-xs text-neutral-700">
            {ganda.map((g, i) => (
              <li key={i}>· {g[0].nama} {g[0].dusun ? `(${g[0].dusun})` : ""} — {g.length} baris</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <input className="field mb-3 max-w-xs" placeholder="Cari nama atau no. HP..." value={q} onChange={(e) => setQ(e.target.value)} />
        {memuat ? <p className="text-sm text-neutral-500">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Nama</th><th>Dusun</th><th>RT/RW</th><th>No. HP</th><th>Peran</th></tr></thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id}>
                  <td>{w.nama}</td>
                  <td>{w.dusun ?? "-"}</td>
                  <td className="text-xs text-neutral-500">{w.rt || w.rw ? `${w.rt ?? "-"}/${w.rw ?? "-"}` : "-"}</td>
                  <td>{w.noHp ?? "-"}</td>
                  <td className="space-x-1">
                    {w.nasabah.map((n) => (
                      <span key={n.id} className="pill bg-emerald-100 text-emerald-800">Nasabah {n.kode}</span>
                    ))}
                    {w.petani.map((p) => (
                      <span key={p.id} className="pill bg-sky-100 text-sky-800">Petani {p.kode}</span>
                    ))}
                    {w.nasabah.length === 0 && w.petani.length === 0 && (
                      <span className="text-xs text-neutral-400">Belum punya peran</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-neutral-400">Belum ada data warga.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormWarga({ onSelesai }: { onSelesai: () => void }) {
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [dusun, setDusun] = useState("");
  const [rt, setRt] = useState("");
  const [rw, setRw] = useState("");
  const [alamat, setAlamat] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.post("/api/warga", {
        nama,
        noHp: noHp || undefined,
        dusun: dusun || undefined,
        rt: rt || undefined,
        rw: rw || undefined,
        alamat: alamat || undefined,
      });
      onSelesai();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-6">
      <div className="sm:col-span-2"><label className="label">Nama</label><input className="field" value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
      <div><label className="label">No. HP</label><input className="field" value={noHp} onChange={(e) => setNoHp(e.target.value)} /></div>
      <div><label className="label">Dusun</label><input className="field" value={dusun} onChange={(e) => setDusun(e.target.value)} /></div>
      <div><label className="label">RT</label><input className="field" value={rt} onChange={(e) => setRt(e.target.value)} /></div>
      <div><label className="label">RW</label><input className="field" value={rw} onChange={(e) => setRw(e.target.value)} /></div>
      <div className="sm:col-span-6"><label className="label">Alamat</label><input className="field" value={alamat} onChange={(e) => setAlamat(e.target.value)} /></div>
      {galat && <p className="sm:col-span-6 text-sm text-red-600">{galat}</p>}
      <div className="sm:col-span-6"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan warga"}</button></div>
    </form>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Warga = { id: string; nama: string; dusun: string | null };
type Mutasi = {
  id: string; tanggal: string; arah: string; beratKg: string;
  sumber: string | null; keterangan: string | null; namaWarga: string | null;
};
type Data = { stokKg: string; mutasi: Mutasi[] };

export default function HalamanOrganik() {
  const [data, setData] = useState<Data | null>(null);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formSetor, setFormSetor] = useState(false);
  const [formKoreksi, setFormKoreksi] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [d, w] = await Promise.all([
      api.get<Data>("/api/organik?perPage=25"),
      api.get<Warga[]>("/api/warga?perPage=100"),
    ]);
    setData(d); setWargaList(w);
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Sampah Organik</h1>
          <p className="text-sm text-neutral-500">Bahan baku produksi pupuk. Setiap perubahan tercatat sebagai mutasi, bukan angka yang ditimpa.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => { setFormSetor((v) => !v); setFormKoreksi(false); }}>+ Setoran</button>
          <button className="btn" onClick={() => { setFormKoreksi((v) => !v); setFormSetor(false); }}>Koreksi</button>
        </div>
      </div>

      <div className="card border-emerald-300 bg-emerald-50">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Stok bahan baku tersedia</p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900">
          {data ? Number(data.stokKg).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "—"} kg
        </p>
      </div>

      {formSetor && <FormSetoran wargaList={wargaList} onSelesai={() => { setFormSetor(false); muat(); }} />}
      {formKoreksi && <FormKoreksi onSelesai={() => { setFormKoreksi(false); muat(); }} />}

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Buku besar sampah organik</h2>
        {memuat ? <p className="text-sm text-neutral-500">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Tanggal</th><th>Arah</th><th className="text-right">Berat</th><th>Warga</th><th>Sumber</th><th>Keterangan</th></tr></thead>
            <tbody>
              {data?.mutasi.map((m) => (
                <tr key={m.id}>
                  <td className="text-xs">{new Date(m.tanggal).toLocaleDateString("id-ID")}</td>
                  <td><span className={`pill ${m.arah === "MASUK" ? "bg-emerald-100 text-emerald-800" : m.arah === "KELUAR" ? "bg-red-100 text-red-700" : "bg-neutral-200 text-neutral-700"}`}>{m.arah}</span></td>
                  <td className="text-right tabular-nums">{Number(m.beratKg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg</td>
                  <td className="text-xs">{m.namaWarga ?? "-"}</td>
                  <td className="text-xs text-neutral-500">{m.sumber ?? "-"}</td>
                  <td className="text-xs text-neutral-500">{m.keterangan ?? "-"}</td>
                </tr>
              ))}
              {data?.mutasi.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-neutral-400">Belum ada mutasi.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormSetoran({ wargaList, onSelesai }: { wargaList: Warga[]; onSelesai: () => void }) {
  const [wargaId, setWargaId] = useState(""); const [beratKg, setBerat] = useState("");
  const [sumber, setSumber] = useState(""); const [keterangan, setKeterangan] = useState("");
  const [galat, setGalat] = useState<string | null>(null); const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setGalat(null); setMenyimpan(true);
    try {
      await api.post("/api/organik", {
        wargaId: wargaId || undefined, beratKg: Number(beratKg),
        sumber: sumber || undefined, keterangan: keterangan || undefined,
      });
      onSelesai();
    } catch (err) { setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan."); }
    finally { setMenyimpan(false); }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div>
        <label className="label">Warga (opsional)</label>
        <select className="field" value={wargaId} onChange={(e) => setWargaId(e.target.value)}>
          <option value="">Tidak spesifik</option>
          {wargaList.map((w) => <option key={w.id} value={w.id}>{w.nama} {w.dusun ? `(${w.dusun})` : ""}</option>)}
        </select>
      </div>
      <div><label className="label">Berat (kg)</label><input type="number" step="0.01" min="0.01" className="field" value={beratKg} onChange={(e) => setBerat(e.target.value)} required /></div>
      <div><label className="label">Sumber</label><input className="field" placeholder="mis. Pengumpulan RT 02" value={sumber} onChange={(e) => setSumber(e.target.value)} /></div>
      <div><label className="label">Keterangan</label><input className="field" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></div>
      {galat && <p className="sm:col-span-4 text-sm text-red-600">{galat}</p>}
      <div className="sm:col-span-4"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan setoran"}</button></div>
    </form>
  );
}

function FormKoreksi({ onSelesai }: { onSelesai: () => void }) {
  const [arah, setArah] = useState("MASUK"); const [beratKg, setBerat] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [galat, setGalat] = useState<string | null>(null); const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setGalat(null); setMenyimpan(true);
    try {
      await api.post("/api/organik/koreksi", { arah, beratKg: Number(beratKg), keterangan });
      onSelesai();
    } catch (err) { setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan."); }
    finally { setMenyimpan(false); }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label className="label">Arah</label>
        <select className="field" value={arah} onChange={(e) => setArah(e.target.value)}>
          <option value="MASUK">Masuk (tambah)</option><option value="KELUAR">Keluar (kurang)</option>
        </select>
      </div>
      <div><label className="label">Berat (kg)</label><input type="number" step="0.01" min="0.01" className="field" value={beratKg} onChange={(e) => setBerat(e.target.value)} required /></div>
      <div><label className="label">Keterangan (wajib)</label><input className="field" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required /></div>
      {galat && <p className="sm:col-span-3 text-sm text-red-600">{galat}</p>}
      <div className="sm:col-span-3"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan koreksi"}</button></div>
    </form>
  );
}

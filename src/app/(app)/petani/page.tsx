"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Petani = {
  id: string;
  kode: string;
  kelompokTani: string | null;
  status: string;
  warga: { id: string; nama: string; noHp: string | null; dusun: string | null };
  _count: { lahan: number; panen: number };
};
type Warga = { id: string; nama: string; dusun: string | null; petani: { kode: string }[] };

export default function HalamanPetani() {
  const [rows, setRows] = useState<Petani[]>([]);
  const [q, setQ] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setRows(await api.get<Petani[]>(`/api/petani?perPage=50${q ? `&q=${encodeURIComponent(q)}` : ""}`));
    setMemuat(false);
  }, [q]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Petani</h1>
          <p className="text-sm text-muted-foreground">Identitasnya diambil dari data warga - satu orang bisa sekaligus jadi nasabah bank sampah.</p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>
          {formTerbuka ? "Tutup formulir" : "+ Petani baru"}
        </button>
      </div>

      {formTerbuka && <FormPetani onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        <input className="field mb-3 max-w-xs" placeholder="Cari nama, kode, kelompok tani..." value={q} onChange={(e) => setQ(e.target.value)} />
        {memuat ? <p className="text-sm text-muted-foreground">Memuat...</p> : (
          <table className="tbl">
            <thead>
              <tr><th>Kode</th><th>Nama</th><th>Dusun</th><th>Kelompok tani</th><th className="text-right">Lahan</th><th className="text-right">Panen</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.kode}</td>
                  <td>{p.warga.nama}</td>
                  <td>{p.warga.dusun ?? "-"}</td>
                  <td className="text-xs text-muted-foreground">{p.kelompokTani ?? "-"}</td>
                  <td className="text-right tabular-nums">{p._count.lahan}</td>
                  <td className="text-right tabular-nums">{p._count.panen}</td>
                  <td><span className={`pill ${p.status === "AKTIF" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{p.status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Belum ada petani.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormPetani({ onSelesai }: { onSelesai: () => void }) {
  const [mode, setMode] = useState<"baru" | "warga">("baru");
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [wargaId, setWargaId] = useState("");
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [dusun, setDusun] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kelompokTani, setKelompokTani] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const muatWarga = useCallback(async () => {
    setWargaList(await api.get<Warga[]>("/api/warga?perPage=100"));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muatWarga(); }, [muatWarga]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      const body =
        mode === "warga"
          ? { wargaId, kelompokTani: kelompokTani || undefined }
          : {
              warga: { nama, noHp: noHp || undefined, dusun: dusun || undefined, alamat: alamat || undefined },
              kelompokTani: kelompokTani || undefined,
            };
      await api.post("/api/petani", body);
      onSelesai();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setMenyimpan(false);
    }
  }

  const belumJadiPetani = wargaList.filter((w) => w.petani.length === 0);

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "baru"} onChange={() => setMode("baru")} />
          Warga baru
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "warga"} onChange={() => setMode("warga")} />
          Warga yang sudah terdaftar ({belumJadiPetani.length} tersedia)
        </label>
      </div>

      {mode === "warga" ? (
        <div>
          <label className="label">Pilih warga</label>
          <select className="field" value={wargaId} onChange={(e) => setWargaId(e.target.value)} required>
            <option value="">Pilih warga...</option>
            {belumJadiPetani.map((w) => (
              <option key={w.id} value={w.id}>{w.nama} {w.dusun ? `(${w.dusun})` : ""}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">Warga yang sudah menjadi petani tidak ditampilkan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div><label className="label">Nama</label><input className="field" value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
          <div><label className="label">No. HP</label><input className="field" value={noHp} onChange={(e) => setNoHp(e.target.value)} /></div>
          <div><label className="label">Dusun</label><input className="field" value={dusun} onChange={(e) => setDusun(e.target.value)} /></div>
          <div><label className="label">Alamat</label><input className="field" value={alamat} onChange={(e) => setAlamat(e.target.value)} /></div>
        </div>
      )}

      <div className="max-w-sm">
        <label className="label">Kelompok tani (opsional)</label>
        <input className="field" value={kelompokTani} onChange={(e) => setKelompokTani(e.target.value)} />
      </div>

      {galat && <p className="text-sm text-red-600">{galat}</p>}
      <button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan petani"}</button>
    </form>
  );
}

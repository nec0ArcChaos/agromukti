"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Nasabah = { id: string; kode: string; warga: { nama: string; dusun: string | null } };
type Kategori = { id: string; kode: string; nama: string };
type Setoran = {
  id: string;
  nomor: string;
  tanggal: string;
  beratKg: string;
  status: string;
  nilaiAlokasi: number | null;
  nasabah: { kode: string; warga: { nama: string } };
  kategoriSampah: { nama: string } | null;
};

export default function HalamanSetoran() {
  const [nasabahList, setNasabahList] = useState<Nasabah[]>([]);
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [setoranList, setSetoranList] = useState<Setoran[]>([]);
  const [memuat, setMemuat] = useState(true);

  const [nasabahId, setNasabahId] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [beratKg, setBeratKg] = useState("");
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const muatSemua = useCallback(async () => {
    setMemuat(true);
    const [n, k, s] = await Promise.all([
      api.get<Nasabah[]>("/api/nasabah?perPage=100&status=AKTIF"),
      api.get<Kategori[]>("/api/kategori-sampah?aktif=true"),
      api.get<Setoran[]>("/api/setoran?perPage=20"),
    ]);
    setNasabahList(n);
    setKategoriList(k);
    setSetoranList(s);
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muatSemua(); }, [muatSemua]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setPesan(null);
    setMenyimpan(true);
    try {
      const hasil = await api.post<Setoran>("/api/setoran", {
        nasabahId,
        kategoriSampahId: kategoriId || undefined,
        beratKg: parseFloat(beratKg),
        catatan: catatan || undefined,
      });
      setPesan(`Tersimpan: ${hasil.nomor} - ${hasil.beratKg} kg (menunggu diproses pengepul)`);
      setNasabahId("");
      setKategoriId("");
      setBeratKg("");
      setCatatan("");
      muatSemua();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan setoran.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function batalkan(id: string) {
    const alasan = window.prompt("Alasan pembatalan setoran ini?");
    if (!alasan) return;
    try {
      await api.post(`/api/setoran/${id}/batal`, { alasan });
      muatSemua();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal membatalkan.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Setoran Sampah Anorganik</h1>
        <p className="text-sm text-muted-foreground">Hanya mencatat berat. Nilai rupiah baru muncul saat pengepul membeli lewat menu Pengambilan Pengepul.</p>
      </div>

      <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nasabah</label>
          <select className="field" value={nasabahId} onChange={(e) => setNasabahId(e.target.value)} required>
            <option value="">Pilih nasabah...</option>
            {nasabahList.map((n) => (
              <option key={n.id} value={n.id}>{n.kode} - {n.warga.nama} {n.warga.dusun ? `(${n.warga.dusun})` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Kategori sampah (opsional)</label>
          <select className="field" value={kategoriId} onChange={(e) => setKategoriId(e.target.value)}>
            <option value="">Tidak dikategorikan</option>
            {kategoriList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Berat (kg)</label>
          <input type="number" step="0.01" min="0.01" className="field" value={beratKg} onChange={(e) => setBeratKg(e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Catatan (opsional)</label>
          <input className="field" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>

        {galat && <p className="sm:col-span-2 text-sm text-red-600">{galat}</p>}
        {pesan && <p className="sm:col-span-2 text-sm text-emerald-700">{pesan}</p>}

        <div className="sm:col-span-2">
          <button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan setoran"}</button>
        </div>
      </form>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Setoran terbaru</h2>
        {memuat ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Nomor</th><th>Nasabah</th><th>Kategori</th><th className="text-right">Berat</th><th>Status</th><th className="text-right">Nilai</th><th></th></tr>
            </thead>
            <tbody>
              {setoranList.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.nomor}</td>
                  <td>{s.nasabah.warga.nama}</td>
                  <td className="text-xs text-muted-foreground">{s.kategoriSampah?.nama ?? "-"}</td>
                  <td className="text-right tabular-nums">{s.beratKg} kg</td>
                  <td>
                    <span className={`pill ${
                      s.status === "DIPROSES" ? "bg-emerald-100 text-emerald-800" :
                      s.status === "VOID" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{s.nilaiAlokasi !== null ? `Rp ${s.nilaiAlokasi.toLocaleString("id-ID")}` : "-"}</td>
                  <td>
                    {s.status === "MENUNGGU" && (
                      <button onClick={() => batalkan(s.id)} className="text-xs text-red-600 hover:underline">Batalkan</button>
                    )}
                  </td>
                </tr>
              ))}
              {setoranList.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Belum ada setoran.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

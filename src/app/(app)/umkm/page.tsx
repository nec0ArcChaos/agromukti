"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Produk = {
  id: string; kode: string; nama: string; kategori: string | null;
  deskripsi: string | null; harga: number; stok: string; satuan: string; status: string;
};

const WARNA: Record<string, string> = {
  TERSEDIA: "bg-emerald-100 text-emerald-800",
  HABIS: "bg-amber-100 text-amber-800",
  NONAKTIF: "bg-muted text-muted-foreground",
};

export default function HalamanUmkm() {
  const [rows, setRows] = useState<Produk[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setRows(await api.get<Produk[]>("/api/produk-umkm"));
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Produk UMKM</h1>
          <p className="text-sm text-muted-foreground">Produk olahan warga, mis. Wajik Tomat dari hasil panen desa.</p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Produk baru"}</button>
      </div>

      {formTerbuka && <FormProduk onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        {memuat ? <p className="text-sm text-muted-foreground">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Nama</th><th>Kategori</th><th className="text-right">Harga</th><th className="text-right">Stok</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.kode}</td>
                  <td>{p.nama}<br /><span className="text-xs text-muted-foreground">{p.deskripsi ?? ""}</span></td>
                  <td className="text-xs text-muted-foreground">{p.kategori ?? "-"}</td>
                  <td className="text-right tabular-nums">Rp {p.harga.toLocaleString("id-ID")}</td>
                  <td className="text-right tabular-nums">{Number(p.stok).toLocaleString("id-ID")} {p.satuan.toLowerCase()}</td>
                  <td><span className={`pill ${WARNA[p.status] ?? ""}`}>{p.status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada produk UMKM.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormProduk({ onSelesai }: { onSelesai: () => void }) {
  const [kode, setKode] = useState(""); const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState(""); const [harga, setHarga] = useState("0");
  const [stok, setStok] = useState("0"); const [satuan, setSatuan] = useState("PCS");
  const [deskripsi, setDeskripsi] = useState("");
  const [galat, setGalat] = useState<string | null>(null); const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setGalat(null); setMenyimpan(true);
    try {
      await api.post("/api/produk-umkm", {
        kode, nama, kategori: kategori || undefined, deskripsi: deskripsi || undefined,
        harga: Number(harga), stok: Number(stok), satuan,
      });
      onSelesai();
    } catch (err) { setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan."); }
    finally { setMenyimpan(false); }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-6">
      <div><label className="label">Kode</label><input className="field" value={kode} onChange={(e) => setKode(e.target.value)} required /></div>
      <div className="sm:col-span-2"><label className="label">Nama</label><input className="field" value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
      <div><label className="label">Kategori</label><input className="field" value={kategori} onChange={(e) => setKategori(e.target.value)} /></div>
      <div><label className="label">Harga (Rp)</label><input type="number" min="0" className="field" value={harga} onChange={(e) => setHarga(e.target.value)} /></div>
      <div><label className="label">Stok</label><input type="number" step="0.01" min="0" className="field" value={stok} onChange={(e) => setStok(e.target.value)} /></div>
      <div><label className="label">Satuan</label><input className="field" value={satuan} onChange={(e) => setSatuan(e.target.value)} /></div>
      <div className="sm:col-span-5"><label className="label">Deskripsi</label><input className="field" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} /></div>
      {galat && <p className="sm:col-span-6 text-sm text-red-600">{galat}</p>}
      <div className="sm:col-span-6"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan produk"}</button></div>
    </form>
  );
}

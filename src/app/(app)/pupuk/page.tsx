"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Produk = {
  id: string; kode: string; nama: string; jenis: string;
  harga: number; satuan: string; stok: string; aktif: boolean;
};
type Mutasi = {
  id: string; tanggal: string; arah: string; jumlah: string;
  sumber: string | null; keterangan: string | null;
  produkPupuk: { kode: string; nama: string; satuan: string };
};

const LABEL_JENIS: Record<string, string> = { KOMPOS_PADAT: "Kompos padat", PUPUK_CAIR: "Pupuk cair" };

export default function HalamanPupuk() {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [mutasi, setMutasi] = useState<Mutasi[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formProduk, setFormProduk] = useState(false);
  const [formStok, setFormStok] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [p, m] = await Promise.all([
      api.get<Produk[]>("/api/produk-pupuk"),
      api.get<Mutasi[]>("/api/stok-pupuk?perPage=25"),
    ]);
    setProduk(p); setMutasi(m);
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Pupuk &amp; Stok</h1>
          <p className="text-sm text-neutral-500">Stok bertambah dari produksi pupuk organik, berkurang saat disalurkan ke petani.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={() => { setFormProduk((v) => !v); setFormStok(false); }}>+ Produk</button>
          <button className="btn" onClick={() => { setFormStok((v) => !v); setFormProduk(false); }}>Penyesuaian stok</button>
        </div>
      </div>

      {formProduk && <FormProduk onSelesai={() => { setFormProduk(false); muat(); }} />}
      {formStok && <FormPenyesuaian produk={produk} onSelesai={() => { setFormStok(false); muat(); }} />}

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Produk pupuk</h2>
        <table className="tbl">
          <thead><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th className="text-right">Harga</th><th className="text-right">Stok</th><th>Status</th></tr></thead>
          <tbody>
            {produk.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.kode}</td>
                <td>{p.nama}</td>
                <td className="text-xs text-neutral-500">{LABEL_JENIS[p.jenis] ?? p.jenis}</td>
                <td className="text-right tabular-nums">Rp {p.harga.toLocaleString("id-ID")}</td>
                <td className="text-right tabular-nums font-medium">{Number(p.stok).toLocaleString("id-ID", { maximumFractionDigits: 2 })} {p.satuan.toLowerCase()}</td>
                <td><span className={`pill ${p.aktif ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-600"}`}>{p.aktif ? "Aktif" : "Nonaktif"}</span></td>
              </tr>
            ))}
            {produk.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-neutral-400">Belum ada produk pupuk.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Buku besar mutasi stok</h2>
        {memuat ? <p className="text-sm text-neutral-500">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Tanggal</th><th>Produk</th><th>Arah</th><th className="text-right">Jumlah</th><th>Sumber</th><th>Keterangan</th></tr></thead>
            <tbody>
              {mutasi.map((m) => (
                <tr key={m.id}>
                  <td className="text-xs">{new Date(m.tanggal).toLocaleDateString("id-ID")}</td>
                  <td>{m.produkPupuk.nama}</td>
                  <td>
                    <span className={`pill ${m.arah === "MASUK" ? "bg-emerald-100 text-emerald-800" : m.arah === "KELUAR" ? "bg-red-100 text-red-700" : "bg-neutral-200 text-neutral-700"}`}>{m.arah}</span>
                  </td>
                  <td className="text-right tabular-nums">{Number(m.jumlah).toLocaleString("id-ID", { maximumFractionDigits: 2 })} {m.produkPupuk.satuan.toLowerCase()}</td>
                  <td className="text-xs text-neutral-500">{m.sumber ?? "-"}</td>
                  <td className="text-xs text-neutral-500">{m.keterangan ?? "-"}</td>
                </tr>
              ))}
              {mutasi.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-neutral-400">Belum ada mutasi stok.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormProduk({ onSelesai }: { onSelesai: () => void }) {
  const [kode, setKode] = useState(""); const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState("KOMPOS_PADAT"); const [harga, setHarga] = useState("0");
  const [satuan, setSatuan] = useState("KG");
  const [galat, setGalat] = useState<string | null>(null); const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setGalat(null); setMenyimpan(true);
    try {
      await api.post("/api/produk-pupuk", { kode, nama, jenis, harga: Number(harga), satuan });
      onSelesai();
    } catch (err) { setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan."); }
    finally { setMenyimpan(false); }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-5">
      <div><label className="label">Kode</label><input className="field" value={kode} onChange={(e) => setKode(e.target.value)} required /></div>
      <div><label className="label">Nama</label><input className="field" value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
      <div>
        <label className="label">Jenis</label>
        <select className="field" value={jenis} onChange={(e) => { setJenis(e.target.value); setSatuan(e.target.value === "PUPUK_CAIR" ? "LITER" : "KG"); }}>
          <option value="KOMPOS_PADAT">Kompos padat</option><option value="PUPUK_CAIR">Pupuk cair</option>
        </select>
      </div>
      <div><label className="label">Harga (Rp)</label><input type="number" min="0" className="field" value={harga} onChange={(e) => setHarga(e.target.value)} /></div>
      <div><label className="label">Satuan</label><input className="field" value={satuan} onChange={(e) => setSatuan(e.target.value)} /></div>
      {galat && <p className="sm:col-span-5 text-sm text-red-600">{galat}</p>}
      <div className="sm:col-span-5"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan produk"}</button></div>
    </form>
  );
}

function FormPenyesuaian({ produk, onSelesai }: { produk: Produk[]; onSelesai: () => void }) {
  const [produkPupukId, setProdukId] = useState(""); const [arah, setArah] = useState("MASUK");
  const [jumlah, setJumlah] = useState(""); const [keterangan, setKeterangan] = useState("");
  const [galat, setGalat] = useState<string | null>(null); const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setGalat(null); setMenyimpan(true);
    try {
      await api.post("/api/stok-pupuk", { produkPupukId, arah, jumlah: Number(jumlah), keterangan });
      onSelesai();
    } catch (err) { setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan."); }
    finally { setMenyimpan(false); }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div className="sm:col-span-2">
        <label className="label">Produk</label>
        <select className="field" value={produkPupukId} onChange={(e) => setProdukId(e.target.value)} required>
          <option value="">Pilih produk...</option>
          {produk.map((p) => <option key={p.id} value={p.id}>{p.nama} (stok {Number(p.stok).toLocaleString("id-ID")} {p.satuan.toLowerCase()})</option>)}
        </select>
      </div>
      <div>
        <label className="label">Arah</label>
        <select className="field" value={arah} onChange={(e) => setArah(e.target.value)}>
          <option value="MASUK">Masuk (tambah)</option><option value="KELUAR">Keluar (kurang)</option>
        </select>
      </div>
      <div><label className="label">Jumlah</label><input type="number" step="0.01" min="0.01" className="field" value={jumlah} onChange={(e) => setJumlah(e.target.value)} required /></div>
      <div className="sm:col-span-4">
        <label className="label">Keterangan (wajib, agar bisa ditelusuri)</label>
        <input className="field" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required />
      </div>
      {galat && <p className="sm:col-span-4 text-sm text-red-600">{galat}</p>}
      <div className="sm:col-span-4"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan penyesuaian"}</button></div>
    </form>
  );
}

"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Petani = { id: string; kode: string; warga: { nama: string; dusun: string | null } };
type Produk = { id: string; nama: string; satuan: string; stok: string };
type Detail = { id: string; jumlah: string; satuan: string; produkPupuk: { nama: string; satuan: string; stok: string } };
type Permintaan = {
  id: string; nomor: string; tanggal: string; status: string; keterangan: string | null; alasanTolak: string | null;
  petani: { kode: string; kelompokTani: string | null; warga: { nama: string; dusun: string | null } };
  detail: Detail[];
  distribusi: { id: string; nomor: string; status: string }[];
};

const WARNA: Record<string, string> = {
  DIAJUKAN: "bg-amber-100 text-amber-800",
  DIPROSES: "bg-sky-100 text-sky-800",
  DISETUJUI: "bg-emerald-100 text-emerald-800",
  DITOLAK: "bg-red-100 text-red-700",
  SELESAI: "bg-neutral-200 text-neutral-700",
};

export default function HalamanPermintaan() {
  const [rows, setRows] = useState<Permintaan[]>([]);
  const [petaniList, setPetaniList] = useState<Petani[]>([]);
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [dibuka, setDibuka] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [p, pt, pr] = await Promise.all([
      api.get<Permintaan[]>("/api/permintaan?perPage=30"),
      api.get<Petani[]>("/api/petani?perPage=100&status=AKTIF"),
      api.get<Produk[]>("/api/produk-pupuk?aktif=true"),
    ]);
    setRows(p); setPetaniList(pt); setProdukList(pr);
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  async function setujui(id: string) {
    try { await api.post(`/api/permintaan/${id}/setujui`); muat(); }
    catch (err) { alert(err instanceof ApiError ? err.message : "Gagal menyetujui."); }
  }
  async function tolak(id: string) {
    const alasan = window.prompt("Alasan penolakan?");
    if (!alasan) return;
    try { await api.post(`/api/permintaan/${id}/tolak`, { alasan }); muat(); }
    catch (err) { alert(err instanceof ApiError ? err.message : "Gagal menolak."); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Permintaan Pupuk</h1>
          <p className="text-sm text-neutral-500">Permintaan boleh melebihi stok - stok baru mengikat saat disalurkan.</p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Ajukan permintaan"}</button>
      </div>

      {formTerbuka && <FormPermintaan petaniList={petaniList} produkList={produkList} onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        {memuat ? <p className="text-sm text-neutral-500">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Nomor</th><th>Petani</th><th>Tanggal</th><th className="text-right">Item</th><th>Status</th><th></th><th></th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td className="font-mono text-xs">{p.nomor}</td>
                    <td>{p.petani.warga.nama}<br /><span className="text-xs text-neutral-400">{p.petani.kelompokTani ?? p.petani.kode}</span></td>
                    <td className="text-xs">{new Date(p.tanggal).toLocaleDateString("id-ID")}</td>
                    <td className="text-right tabular-nums">{p.detail.length}</td>
                    <td><span className={`pill ${WARNA[p.status] ?? ""}`}>{p.status}</span></td>
                    <td><button onClick={() => setDibuka(dibuka === p.id ? null : p.id)} className="text-xs text-neutral-500 hover:underline">{dibuka === p.id ? "Tutup" : "Rincian"}</button></td>
                    <td className="space-x-2">
                      {(p.status === "DIAJUKAN" || p.status === "DIPROSES") && (
                        <>
                          <button onClick={() => setujui(p.id)} className="text-xs text-emerald-700 hover:underline">Setujui</button>
                          <button onClick={() => tolak(p.id)} className="text-xs text-red-600 hover:underline">Tolak</button>
                        </>
                      )}
                    </td>
                  </tr>
                  {dibuka === p.id && (
                    <tr>
                      <td colSpan={7} className="bg-neutral-50 p-3">
                        <table className="tbl">
                          <thead><tr><th>Produk</th><th className="text-right">Diminta</th><th className="text-right">Stok tersedia</th></tr></thead>
                          <tbody>
                            {p.detail.map((d) => (
                              <tr key={d.id}>
                                <td>{d.produkPupuk.nama}</td>
                                <td className="text-right tabular-nums">{Number(d.jumlah).toLocaleString("id-ID")} {d.produkPupuk.satuan.toLowerCase()}</td>
                                <td className={`text-right tabular-nums ${Number(d.produkPupuk.stok) < Number(d.jumlah) ? "text-red-600" : ""}`}>
                                  {Number(d.produkPupuk.stok).toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {p.alasanTolak && <p className="mt-2 text-xs text-red-600">Alasan ditolak: {p.alasanTolak}</p>}
                        {p.distribusi.length > 0 && (
                          <p className="mt-2 text-xs text-neutral-600">
                            Distribusi: {p.distribusi.map((d) => `${d.nomor} (${d.status})`).join(", ")}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-neutral-400">Belum ada permintaan.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormPermintaan({
  petaniList, produkList, onSelesai,
}: { petaniList: Petani[]; produkList: Produk[]; onSelesai: () => void }) {
  const [petaniId, setPetaniId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [item, setItem] = useState<{ produkPupukId: string; jumlah: string }[]>([{ produkPupukId: "", jumlah: "" }]);
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  function ubahItem(i: number, patch: Partial<{ produkPupukId: string; jumlah: string }>) {
    setItem((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setGalat(null); setMenyimpan(true);
    try {
      const isi = item
        .filter((b) => b.produkPupukId && b.jumlah)
        .map((b) => {
          const p = produkList.find((x) => x.id === b.produkPupukId);
          return { produkPupukId: b.produkPupukId, jumlah: Number(b.jumlah), satuan: p?.satuan ?? "KG" };
        });
      await api.post("/api/permintaan", { petaniId, keterangan: keterangan || undefined, item: isi });
      onSelesai();
    } catch (err) { setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan."); }
    finally { setMenyimpan(false); }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Petani</label>
          <select className="field" value={petaniId} onChange={(e) => setPetaniId(e.target.value)} required>
            <option value="">Pilih petani...</option>
            {petaniList.map((p) => <option key={p.id} value={p.id}>{p.kode} - {p.warga.nama}</option>)}
          </select>
        </div>
        <div><label className="label">Keterangan</label><input className="field" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></div>
      </div>

      <div>
        <label className="label">Pupuk yang diminta</label>
        {item.map((b, i) => (
          <div key={i} className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_auto]">
            <select className="field" value={b.produkPupukId} onChange={(e) => ubahItem(i, { produkPupukId: e.target.value })}>
              <option value="">Pilih produk...</option>
              {produkList.map((p) => <option key={p.id} value={p.id}>{p.nama} (stok {Number(p.stok).toLocaleString("id-ID")} {p.satuan.toLowerCase()})</option>)}
            </select>
            <input type="number" step="0.01" min="0.01" placeholder="Jumlah" className="field" value={b.jumlah} onChange={(e) => ubahItem(i, { jumlah: e.target.value })} />
            {item.length > 1 && (
              <button type="button" onClick={() => setItem((prev) => prev.filter((_, idx) => idx !== i))} className="px-2 text-sm text-red-600">Hapus</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setItem((prev) => [...prev, { produkPupukId: "", jumlah: "" }])} className="text-xs text-emerald-700 hover:underline">+ Tambah baris</button>
      </div>

      {galat && <p className="text-sm text-red-600">{galat}</p>}
      <button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Ajukan permintaan"}</button>
    </form>
  );
}

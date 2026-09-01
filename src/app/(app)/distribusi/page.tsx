"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Permintaan = {
  id: string; nomor: string; status: string;
  petani: { kode: string; warga: { nama: string } };
  detail: { produkPupuk: { id: string; nama: string; satuan: string } }[];
};
type Sisa = { produkPupukId: string; diminta: string; terkirim: string; sisa: string };
type Distribusi = {
  id: string; nomor: string; tanggalDistribusi: string; status: string; keterangan: string | null;
  permintaan: { nomor: string; petani: { kode: string; warga: { nama: string; dusun: string | null } } };
  detail: { id: string; jumlah: string; produkPupuk: { nama: string; satuan: string } }[];
};

const WARNA: Record<string, string> = {
  DIPROSES: "bg-amber-100 text-amber-800",
  DIKIRIM: "bg-sky-100 text-sky-800",
  DITERIMA: "bg-emerald-100 text-emerald-800",
  DIBATALKAN: "bg-red-100 text-red-700",
};

export default function HalamanDistribusi() {
  const [rows, setRows] = useState<Distribusi[]>([]);
  const [siapSalur, setSiapSalur] = useState<Permintaan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [dibuka, setDibuka] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [d, p] = await Promise.all([
      api.get<Distribusi[]>("/api/distribusi?perPage=30"),
      api.get<Permintaan[]>("/api/permintaan?status=DISETUJUI&perPage=50"),
    ]);
    setRows(d); setSiapSalur(p);
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  async function ubahStatus(id: string, status: string) {
    try { await api.patch(`/api/distribusi/${id}`, { status }); muat(); }
    catch (err) { alert(err instanceof ApiError ? err.message : "Gagal mengubah status."); }
  }
  async function batalkan(id: string) {
    const alasan = window.prompt("Alasan pembatalan? Stok akan dikembalikan.");
    if (!alasan) return;
    try { await api.post(`/api/distribusi/${id}/batal`, { alasan }); muat(); }
    catch (err) { alert(err instanceof ApiError ? err.message : "Gagal membatalkan."); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Distribusi Pupuk</h1>
          <p className="text-sm text-muted-foreground">Hanya permintaan yang sudah disetujui yang bisa disalurkan, dan tidak boleh melebihi sisa yang disetujui.</p>
        </div>
        <button className="btn" disabled={siapSalur.length === 0} onClick={() => setFormTerbuka((v) => !v)}>
          {formTerbuka ? "Tutup formulir" : `+ Salurkan (${siapSalur.length} siap)`}
        </button>
      </div>

      {formTerbuka && <FormDistribusi siapSalur={siapSalur} onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        {memuat ? <p className="text-sm text-muted-foreground">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Nomor</th><th>Permintaan</th><th>Penerima</th><th>Tanggal</th><th>Status</th><th></th><th></th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <Fragment key={d.id}>
                  <tr>
                    <td className="font-mono text-xs">{d.nomor}</td>
                    <td className="font-mono text-xs text-muted-foreground">{d.permintaan.nomor}</td>
                    <td>{d.permintaan.petani.warga.nama}<br /><span className="text-xs text-muted-foreground">{d.permintaan.petani.warga.dusun ?? "-"}</span></td>
                    <td className="text-xs">{new Date(d.tanggalDistribusi).toLocaleDateString("id-ID")}</td>
                    <td><span className={`pill ${WARNA[d.status] ?? ""}`}>{d.status}</span></td>
                    <td><button onClick={() => setDibuka(dibuka === d.id ? null : d.id)} className="text-xs text-muted-foreground hover:underline">{dibuka === d.id ? "Tutup" : "Rincian"}</button></td>
                    <td className="space-x-2">
                      {d.status === "DIPROSES" && <button onClick={() => ubahStatus(d.id, "DIKIRIM")} className="text-xs text-sky-700 hover:underline">Kirim</button>}
                      {d.status === "DIKIRIM" && <button onClick={() => ubahStatus(d.id, "DITERIMA")} className="text-xs text-primary hover:underline">Diterima</button>}
                      {d.status !== "DIBATALKAN" && <button onClick={() => batalkan(d.id)} className="text-xs text-red-600 hover:underline">Batalkan</button>}
                    </td>
                  </tr>
                  {dibuka === d.id && (
                    <tr>
                      <td colSpan={7} className="bg-muted p-3">
                        <table className="tbl">
                          <thead><tr><th>Produk</th><th className="text-right">Jumlah</th></tr></thead>
                          <tbody>
                            {d.detail.map((x) => (
                              <tr key={x.id}><td>{x.produkPupuk.nama}</td><td className="text-right tabular-nums">{Number(x.jumlah).toLocaleString("id-ID")} {x.produkPupuk.satuan.toLowerCase()}</td></tr>
                            ))}
                          </tbody>
                        </table>
                        {d.keterangan && <p className="mt-2 text-xs text-muted-foreground">{d.keterangan}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Belum ada distribusi.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormDistribusi({ siapSalur, onSelesai }: { siapSalur: Permintaan[]; onSelesai: () => void }) {
  const [permintaanId, setPermintaanId] = useState("");
  const [sisa, setSisa] = useState<Sisa[]>([]);
  const [jumlah, setJumlah] = useState<Record<string, string>>({});
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const permintaan = siapSalur.find((p) => p.id === permintaanId);

  const muatSisa = useCallback(async () => {
    if (!permintaanId) { setSisa([]); return; }
    setSisa(await api.get<Sisa[]>(`/api/permintaan/${permintaanId}/sisa`));
  }, [permintaanId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat pilihan berubah; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muatSisa(); }, [muatSisa]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setGalat(null); setMenyimpan(true);
    try {
      const item = sisa
        .filter((s) => jumlah[s.produkPupukId] && Number(jumlah[s.produkPupukId]) > 0)
        .map((s) => {
          const p = permintaan?.detail.find((d) => d.produkPupuk.id === s.produkPupukId);
          return { produkPupukId: s.produkPupukId, jumlah: Number(jumlah[s.produkPupukId]), satuan: p?.produkPupuk.satuan ?? "KG" };
        });
      await api.post("/api/distribusi", { permintaanId, item });
      onSelesai();
    } catch (err) { setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan."); }
    finally { setMenyimpan(false); }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label">Permintaan yang disetujui</label>
        <select className="field" value={permintaanId} onChange={(e) => { setPermintaanId(e.target.value); setJumlah({}); }} required>
          <option value="">Pilih permintaan...</option>
          {siapSalur.map((p) => <option key={p.id} value={p.id}>{p.nomor} - {p.petani.warga.nama}</option>)}
        </select>
      </div>

      {sisa.length > 0 && permintaan && (
        <div>
          <label className="label">Jumlah yang disalurkan</label>
          <table className="tbl">
            <thead><tr><th>Produk</th><th className="text-right">Diminta</th><th className="text-right">Sudah</th><th className="text-right">Sisa</th><th className="w-40">Salurkan</th></tr></thead>
            <tbody>
              {sisa.map((s) => {
                const p = permintaan.detail.find((d) => d.produkPupuk.id === s.produkPupukId);
                return (
                  <tr key={s.produkPupukId}>
                    <td>{p?.produkPupuk.nama ?? s.produkPupukId}</td>
                    <td className="text-right tabular-nums">{Number(s.diminta).toLocaleString("id-ID")}</td>
                    <td className="text-right tabular-nums">{Number(s.terkirim).toLocaleString("id-ID")}</td>
                    <td className="text-right tabular-nums font-medium">{Number(s.sisa).toLocaleString("id-ID")}</td>
                    <td>
                      <input
                        type="number" step="0.01" min="0" max={Number(s.sisa)}
                        className="field" disabled={Number(s.sisa) === 0}
                        value={jumlah[s.produkPupukId] ?? ""}
                        onChange={(e) => setJumlah((prev) => ({ ...prev, [s.produkPupukId]: e.target.value }))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {galat && <p className="text-sm text-red-600">{galat}</p>}
      <button className="btn" disabled={menyimpan || sisa.length === 0}>{menyimpan ? "Menyimpan..." : "Salurkan pupuk"}</button>
    </form>
  );
}

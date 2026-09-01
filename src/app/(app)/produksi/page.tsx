"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Produk = { id: string; nama: string; jenis: string; satuan: string };
type Produksi = {
  id: string; kode: string; status: string;
  tanggalMulai: string; tanggalSelesai: string | null;
  beratSampahOrganik: string;
  estimasiPupukKasar: string; estimasiPupukCair: string;
  pupukKasarAktual: string | null; pupukCairAktual: string | null;
  rendemenPadatPersen: string | null; hasilCairPerKg: string | null;
  keterangan: string | null;
  produkPadat: { nama: string; satuan: string } | null;
  produkCair: { nama: string; satuan: string } | null;
};
type Estimasi = {
  estimasiPupukKasar: string; estimasiPupukCair: string;
  rendemenPersen: string; pocPerKg: string;
  aktual: { jumlahBatch: number; rendemenPersen: string; pocPerKg: string } | null;
};
type Ringkasan = {
  perStatus: { status: string; jumlah: number }[];
  totalBahanKg: string; totalPadatKg: string; totalCairLiter: string;
  rendemenPadatPersen: string | null; hasilCairPerKg: string | null;
};

const WARNA: Record<string, string> = {
  PROSES: "bg-amber-100 text-amber-800",
  SELESAI: "bg-emerald-100 text-emerald-800",
  GAGAL: "bg-red-100 text-red-700",
  DIBATALKAN: "bg-muted text-muted-foreground",
};

export default function HalamanProduksi() {
  const [rows, setRows] = useState<Produksi[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [stokOrganik, setStokOrganik] = useState<string>("0");
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [p, r, pr, o] = await Promise.all([
      api.get<Produksi[]>("/api/produksi?perPage=25"),
      api.get<Ringkasan>("/api/produksi/ringkasan"),
      api.get<Produk[]>("/api/produk-pupuk?aktif=true"),
      api.get<{ stokKg: string }>("/api/organik?perPage=1"),
    ]);
    setRows(p); setRingkasan(r); setProdukList(pr); setStokOrganik(o.stokKg);
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  async function panen(p: Produksi) {
    const kasar = window.prompt(`Hasil kompos padat (kg) untuk ${p.kode}?`, p.estimasiPupukKasar);
    if (kasar === null) return;
    const cair = window.prompt(`Hasil pupuk cair (liter) untuk ${p.kode}?`, p.estimasiPupukCair);
    if (cair === null) return;
    try {
      await api.post(`/api/produksi/${p.id}/panen`, { pupukKasarAktual: Number(kasar), pupukCairAktual: Number(cair) });
      muat();
    } catch (err) { alert(err instanceof ApiError ? err.message : "Gagal memanen."); }
  }
  async function batalkan(id: string) {
    const alasan = window.prompt("Alasan pembatalan? Bahan baku akan dikembalikan ke stok.");
    if (!alasan) return;
    try { await api.post(`/api/produksi/${id}/batal`, { alasan }); muat(); }
    catch (err) { alert(err instanceof ApiError ? err.message : "Gagal membatalkan."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Produksi Pupuk</h1>
          <p className="text-sm text-muted-foreground">Hasil panen langsung masuk ke stok pupuk yang disalurkan ke petani.</p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Mulai batch"}</button>
      </div>

      {ringkasan && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card"><p className="text-xs uppercase tracking-wide text-muted-foreground">Bahan baku diolah</p><p className="mt-1 text-xl font-semibold">{Number(ringkasan.totalBahanKg).toLocaleString("id-ID")} kg</p></div>
          <div className="card"><p className="text-xs uppercase tracking-wide text-muted-foreground">Kompos padat</p><p className="mt-1 text-xl font-semibold">{Number(ringkasan.totalPadatKg).toLocaleString("id-ID")} kg</p></div>
          <div className="card"><p className="text-xs uppercase tracking-wide text-muted-foreground">Pupuk cair</p><p className="mt-1 text-xl font-semibold">{Number(ringkasan.totalCairLiter).toLocaleString("id-ID")} liter</p></div>
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rendemen padat</p>
            <p className="mt-1 text-xl font-semibold">{ringkasan.rendemenPadatPersen ? `${Number(ringkasan.rendemenPadatPersen).toFixed(2)}%` : "—"}</p>
            <p className="text-xs text-muted-foreground">{ringkasan.hasilCairPerKg ? `${Number(ringkasan.hasilCairPerKg).toFixed(3)} L/kg bahan` : ""}</p>
          </div>
        </div>
      )}

      {formTerbuka && <FormProduksi produkList={produkList} stokOrganik={stokOrganik} onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Batch produksi</h2>
        {memuat ? <p className="text-sm text-muted-foreground">Memuat...</p> : (
          <table className="tbl">
            <thead>
              <tr><th>Kode</th><th>Mulai</th><th className="text-right">Bahan</th><th className="text-right">Hasil padat</th><th className="text-right">Hasil cair</th><th className="text-right">Rendemen</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.kode}</td>
                  <td className="text-xs">{new Date(p.tanggalMulai).toLocaleDateString("id-ID")}</td>
                  <td className="text-right tabular-nums">{Number(p.beratSampahOrganik).toLocaleString("id-ID")} kg</td>
                  <td className="text-right tabular-nums">{p.pupukKasarAktual !== null ? `${Number(p.pupukKasarAktual).toLocaleString("id-ID")} kg` : <span className="text-muted-foreground">est. {Number(p.estimasiPupukKasar).toLocaleString("id-ID")}</span>}</td>
                  <td className="text-right tabular-nums">{p.pupukCairAktual !== null ? `${Number(p.pupukCairAktual).toLocaleString("id-ID")} L` : <span className="text-muted-foreground">est. {Number(p.estimasiPupukCair).toLocaleString("id-ID")}</span>}</td>
                  <td className="text-right tabular-nums">{p.rendemenPadatPersen ? `${Number(p.rendemenPadatPersen).toFixed(1)}%` : "-"}</td>
                  <td><span className={`pill ${WARNA[p.status] ?? ""}`}>{p.status}</span></td>
                  <td className="space-x-2">
                    {p.status === "PROSES" && (
                      <>
                        <button onClick={() => panen(p)} className="text-xs text-primary hover:underline">Panen</button>
                        <button onClick={() => batalkan(p.id)} className="text-xs text-red-600 hover:underline">Batalkan</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Belum ada batch produksi.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormProduksi({
  produkList, stokOrganik, onSelesai,
}: { produkList: Produk[]; stokOrganik: string; onSelesai: () => void }) {
  const [berat, setBerat] = useState("");
  const [produkPadatId, setPadat] = useState(""); const [produkCairId, setCair] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [estimasi, setEstimasi] = useState<Estimasi | null>(null);
  const [galat, setGalat] = useState<string | null>(null); const [menyimpan, setMenyimpan] = useState(false);

  const padatList = produkList.filter((p) => p.jenis === "KOMPOS_PADAT");
  const cairList = produkList.filter((p) => p.jenis === "PUPUK_CAIR");

  const muatEstimasi = useCallback(async () => {
    if (!berat || Number(berat) <= 0) { setEstimasi(null); return; }
    try {
      setEstimasi(await api.get<Estimasi>(`/api/produksi/estimasi?berat=${Number(berat)}`));
    } catch {
      setEstimasi(null);
    }
  }, [berat]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- estimasi dimuat ulang setiap berat bahan baku berubah.
  useEffect(() => { muatEstimasi(); }, [muatEstimasi]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setGalat(null); setMenyimpan(true);
    try {
      await api.post("/api/produksi", {
        beratSampahOrganik: Number(berat),
        produkPadatId: produkPadatId || undefined,
        produkCairId: produkCairId || undefined,
        keterangan: keterangan || undefined,
      });
      onSelesai();
    } catch (err) { setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan."); }
    finally { setMenyimpan(false); }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <p className="text-sm text-muted-foreground">
        Stok bahan baku tersedia: <span className="font-medium">{Number(stokOrganik).toLocaleString("id-ID")} kg</span>
      </p>

      <div className="max-w-xs">
        <label className="label">Bahan baku (kg)</label>
        <input type="number" step="0.01" min="0.01" max={Number(stokOrganik)} className="field" value={berat} onChange={(e) => setBerat(e.target.value)} required />
        <p className="mt-1 text-xs text-muted-foreground">Estimasi hasil dihitung otomatis dari berat ini.</p>
      </div>

      {estimasi && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perkiraan hasil</p>
          <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <p className="text-xl font-bold text-primary">
                {Number(estimasi.estimasiPupukKasar).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg
              </p>
              <p className="text-xs text-muted-foreground">
                kompos padat · rendemen {Number(estimasi.rendemenPersen).toLocaleString("id-ID")}%
              </p>
            </div>
            <div>
              <p className="text-xl font-bold text-primary">
                {Number(estimasi.estimasiPupukCair).toLocaleString("id-ID", { maximumFractionDigits: 2 })} liter
              </p>
              <p className="text-xs text-muted-foreground">
                pupuk cair · {Number(estimasi.pocPerKg).toLocaleString("id-ID", { maximumFractionDigits: 4 })} L/kg
              </p>
            </div>
          </div>
          {estimasi.aktual ? (
            <p className="mt-3 border-t border-primary/20 pt-2 text-xs text-muted-foreground">
              Capaian nyata dari {estimasi.aktual.jumlahBatch} batch selesai:{" "}
              <span className="font-medium text-foreground">
                {Number(estimasi.aktual.rendemenPersen).toFixed(1)}% padat
              </span>{" "}
              ·{" "}
              <span className="font-medium text-foreground">
                {Number(estimasi.aktual.pocPerKg).toFixed(3)} L/kg cair
              </span>
              . Bila jauh berbeda dari anjuran, setel ulang rasionya di menu Pengaturan.
            </p>
          ) : (
            <p className="mt-3 border-t border-primary/20 pt-2 text-xs text-muted-foreground">
              Belum ada batch selesai sebagai pembanding — angka di atas masih memakai rasio anjuran.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Produk tujuan hasil padat</label>
          <select className="field" value={produkPadatId} onChange={(e) => setPadat(e.target.value)}>
            <option value="">Belum ditetapkan</option>
            {padatList.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Produk tujuan hasil cair</label>
          <select className="field" value={produkCairId} onChange={(e) => setCair(e.target.value)}>
            <option value="">Belum ditetapkan</option>
            {cairList.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </div>
      </div>

      <div><label className="label">Keterangan</label><input className="field" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></div>

      {galat && <p className="text-sm text-red-600">{galat}</p>}
      <button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Mulai batch produksi"}</button>
    </form>
  );
}

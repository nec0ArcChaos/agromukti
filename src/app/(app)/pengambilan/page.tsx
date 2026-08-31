"use client";

import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import { api, ApiError } from "@/lib/api";

type Pengepul = { id: string; kode: string; nama: string };
type SetoranMenunggu = {
  id: string;
  nomor: string;
  beratKg: string;
  tanggal: string;
  nasabah: { id: string; kode: string; warga: { nama: string } };
  kategoriSampah: { nama: string } | null;
};
type PengambilanDetail = { id: string; nomor: string; beratKg: string; nilaiAlokasi: number | null; nasabah: { kode: string; warga: { nama: string } } };
type Pengambilan = {
  id: string;
  nomor: string;
  tanggal: string;
  totalBeratKg: string;
  totalNilai: number;
  status: string;
  pengepul: { nama: string };
  setoran: PengambilanDetail[];
};

export default function HalamanPengambilan() {
  const [pengepulList, setPengepulList] = useState<Pengepul[]>([]);
  const [menunggu, setMenunggu] = useState<SetoranMenunggu[]>([]);
  const [riwayat, setRiwayat] = useState<Pengambilan[]>([]);
  const [memuat, setMemuat] = useState(true);

  const [pengepulId, setPengepulId] = useState("");
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());
  const [totalNilai, setTotalNilai] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [dibuka, setDibuka] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [p, m, r] = await Promise.all([
      api.get<Pengepul[]>("/api/pengepul?aktif=true"),
      api.get<SetoranMenunggu[]>("/api/setoran/menunggu"),
      api.get<Pengambilan[]>("/api/pengambilan?perPage=15"),
    ]);
    setPengepulList(p);
    setMenunggu(m);
    setRiwayat(r);
    setTerpilih(new Set());
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  const beratTerpilih = useMemo(
    () => menunggu.filter((s) => terpilih.has(s.id)).reduce((acc, s) => acc + parseFloat(s.beratKg), 0),
    [menunggu, terpilih],
  );
  const hargaPerKgEfektif = beratTerpilih > 0 && totalNilai ? Number(totalNilai) / beratTerpilih : 0;

  function toggle(id: string) {
    setTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function pilihSemua() {
    setTerpilih(new Set(menunggu.map((s) => s.id)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setPesan(null);
    setMenyimpan(true);
    try {
      const hasil = await api.post<Pengambilan>("/api/pengambilan", {
        pengepulId,
        setoranIds: [...terpilih],
        totalNilai: Number(totalNilai),
      });
      setPesan(`Tersimpan: ${hasil.nomor} - ${hasil.setoran.length} setoran diproses, total Rp ${hasil.totalNilai.toLocaleString("id-ID")}`);
      setPengepulId("");
      setTotalNilai("");
      muat();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan pengambilan.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function batalkan(id: string) {
    const alasan = window.prompt("Alasan pembatalan pengambilan ini? Seluruh setoran di dalamnya akan kembali ke status menunggu.");
    if (!alasan) return;
    try {
      await api.post(`/api/pengambilan/${id}/batal`, { alasan });
      muat();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal membatalkan.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Pengambilan Pengepul</h1>
        <p className="text-sm text-neutral-500">Pilih setoran yang diambil pengepul hari ini, masukkan total yang benar-benar dibayarkan - sistem membagi nilainya ke tiap nasabah sesuai berat setorannya.</p>
      </div>

      <form onSubmit={submit} className="card space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Pengepul</label>
            <select className="field" value={pengepulId} onChange={(e) => setPengepulId(e.target.value)} required>
              <option value="">Pilih pengepul...</option>
              {pengepulList.map((p) => <option key={p.id} value={p.id}>{p.kode} - {p.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Total dibayar pengepul (Rp)</label>
            <input type="number" min="1" className="field" value={totalNilai} onChange={(e) => setTotalNilai(e.target.value)} required />
            {beratTerpilih > 0 && totalNilai && (
              <p className="mt-1 text-xs text-neutral-500">≈ Rp {hargaPerKgEfektif.toLocaleString("id-ID", { maximumFractionDigits: 0 })}/kg untuk {beratTerpilih.toFixed(2)} kg terpilih</p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Setoran menunggu ({menunggu.length})</label>
            <button type="button" onClick={pilihSemua} className="text-xs text-emerald-700 hover:underline">Pilih semua</button>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-md border border-neutral-200">
            <table className="tbl">
              <thead><tr><th></th><th>Nomor</th><th>Nasabah</th><th>Kategori</th><th className="text-right">Berat</th></tr></thead>
              <tbody>
                {menunggu.map((s) => (
                  <tr key={s.id} className="cursor-pointer" onClick={() => toggle(s.id)}>
                    <td><input type="checkbox" checked={terpilih.has(s.id)} onChange={() => toggle(s.id)} onClick={(e) => e.stopPropagation()} /></td>
                    <td className="font-mono text-xs">{s.nomor}</td>
                    <td>{s.nasabah.kode} - {s.nasabah.warga.nama}</td>
                    <td className="text-xs text-neutral-500">{s.kategoriSampah?.nama ?? "-"}</td>
                    <td className="text-right tabular-nums">{s.beratKg} kg</td>
                  </tr>
                ))}
                {menunggu.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-neutral-400">Tidak ada setoran menunggu.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-neutral-500">{terpilih.size} setoran dipilih - total {beratTerpilih.toFixed(2)} kg</p>
        </div>

        {galat && <p className="text-sm text-red-600">{galat}</p>}
        {pesan && <p className="text-sm text-emerald-700">{pesan}</p>}

        <button className="btn" disabled={menyimpan || terpilih.size === 0}>{menyimpan ? "Menyimpan..." : "Catat pengambilan & bagikan ke nasabah"}</button>
      </form>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Riwayat pengambilan</h2>
        {memuat ? <p className="text-sm text-neutral-500">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Nomor</th><th>Pengepul</th><th className="text-right">Berat</th><th className="text-right">Total</th><th>Status</th><th></th><th></th></tr></thead>
            <tbody>
              {riwayat.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td className="font-mono text-xs">{p.nomor}</td>
                    <td>{p.pengepul.nama}</td>
                    <td className="text-right tabular-nums">{p.totalBeratKg} kg</td>
                    <td className="text-right tabular-nums">Rp {p.totalNilai.toLocaleString("id-ID")}</td>
                    <td><span className={`pill ${p.status === "POSTED" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>{p.status}</span></td>
                    <td><button onClick={() => setDibuka(dibuka === p.id ? null : p.id)} className="text-xs text-neutral-500 hover:underline">{dibuka === p.id ? "Tutup" : "Rincian"}</button></td>
                    <td>{p.status === "POSTED" && <button onClick={() => batalkan(p.id)} className="text-xs text-red-600 hover:underline">Batalkan</button>}</td>
                  </tr>
                  {dibuka === p.id && (
                    <tr>
                      <td colSpan={7} className="bg-neutral-50 p-3">
                        <table className="tbl">
                          <thead><tr><th>Nasabah</th><th className="text-right">Berat</th><th className="text-right">Nilai alokasi</th></tr></thead>
                          <tbody>
                            {p.setoran.map((s) => (
                              <tr key={s.id}><td>{s.nasabah.kode} - {s.nasabah.warga.nama}</td><td className="text-right tabular-nums">{s.beratKg} kg</td><td className="text-right tabular-nums">Rp {(s.nilaiAlokasi ?? 0).toLocaleString("id-ID")}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {riwayat.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-neutral-400">Belum ada pengambilan.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

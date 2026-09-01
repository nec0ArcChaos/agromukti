"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

type Kas = { id: string; tanggal: string; arah: string; kategori: string; jumlah: number; saldoSesudah: number; keterangan: string | null };

export default function HalamanKas() {
  const [rows, setRows] = useState<Kas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [formTerbuka, setFormTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setRows(await api.get<Kas[]>("/api/kas?perPage=30"));
    setMemuat(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- muat memanggil setState secara sengaja saat halaman dibuka; pola ini aman untuk halaman uji coba read-then-render.
  useEffect(() => { muat(); }, [muat]);

  const saldoSaatIni = rows[0]?.saldoSesudah ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Kas Lembaga</h1>
          <p className="text-sm text-muted-foreground">Saldo saat ini: <span className="font-semibold text-foreground">Rp {saldoSaatIni.toLocaleString("id-ID")}</span></p>
        </div>
        <button className="btn" onClick={() => setFormTerbuka((v) => !v)}>{formTerbuka ? "Tutup formulir" : "+ Entri manual"}</button>
      </div>

      {formTerbuka && <FormKas onSelesai={() => { setFormTerbuka(false); muat(); }} />}

      <div className="card">
        {memuat ? <p className="text-sm text-muted-foreground">Memuat...</p> : (
          <table className="tbl">
            <thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th className="text-right">Jumlah</th><th className="text-right">Saldo</th></tr></thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id}>
                  <td className="text-xs">{new Date(k.tanggal).toLocaleDateString("id-ID")}</td>
                  <td><span className="pill bg-muted text-muted-foreground">{k.kategori}</span></td>
                  <td className="text-xs text-muted-foreground">{k.keterangan ?? "-"}</td>
                  <td className={`text-right tabular-nums ${k.arah === "MASUK" ? "text-emerald-700" : "text-red-600"}`}>
                    {k.arah === "MASUK" ? "+" : "-"}Rp {k.jumlah.toLocaleString("id-ID")}
                  </td>
                  <td className="text-right tabular-nums font-medium">Rp {k.saldoSesudah.toLocaleString("id-ID")}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Belum ada mutasi kas. Catat modal awal lembaga terlebih dahulu.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormKas({ onSelesai }: { onSelesai: () => void }) {
  const [arah, setArah] = useState<"MASUK" | "KELUAR">("MASUK");
  const [kategori, setKategori] = useState("MODAL_AWAL");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.post("/api/kas", { arah, kategori, jumlah: Number(jumlah), keterangan });
      onSelesai();
    } catch (err) {
      setGalat(err instanceof ApiError ? err.message : "Gagal menyimpan. Pastikan Anda masuk sebagai admin.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div>
        <label className="label">Arah</label>
        <select className="field" value={arah} onChange={(e) => setArah(e.target.value as "MASUK" | "KELUAR")}>
          <option value="MASUK">Masuk</option><option value="KELUAR">Keluar</option>
        </select>
      </div>
      <div>
        <label className="label">Kategori</label>
        <select className="field" value={kategori} onChange={(e) => setKategori(e.target.value)}>
          <option value="MODAL_AWAL">Modal awal</option>
          <option value="OPERASIONAL">Operasional</option>
          <option value="HIBAH">Hibah</option>
          <option value="LAINNYA">Lainnya</option>
        </select>
      </div>
      <div><label className="label">Jumlah (Rp)</label><input type="number" min="1" className="field" value={jumlah} onChange={(e) => setJumlah(e.target.value)} required /></div>
      <div><label className="label">Keterangan</label><input className="field" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required /></div>
      {galat && <p className="col-span-4 text-sm text-red-600">{galat}</p>}
      <div className="col-span-4"><button className="btn" disabled={menyimpan}>{menyimpan ? "Menyimpan..." : "Simpan entri kas"}</button></div>
    </form>
  );
}

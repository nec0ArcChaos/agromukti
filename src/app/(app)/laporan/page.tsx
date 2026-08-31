import {
  laporanSetoran,
  laporanTabungan,
  laporanPartisipasi,
  laporanArusKas,
} from "@/server/modules/laporan/laporan.service";
import { formatRupiah, formatKg } from "@/server/lib/money";

export const dynamic = "force-dynamic";

export default async function HalamanLaporan() {
  const [setoran, tabungan, partisipasi, arusKas] = await Promise.all([
    laporanSetoran({ groupBy: "kategori" }),
    laporanTabungan(),
    laporanPartisipasi(),
    laporanArusKas({}),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900">Laporan</h1>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Rekap setoran per kategori sampah</h2>
        <p className="mb-2 text-xs text-neutral-500">Berat mencakup seluruh setoran (menunggu maupun sudah diproses). Nilai rupiah hanya dari yang sudah dibeli pengepul.</p>
        <table className="tbl">
          <thead><tr><th>Kategori</th><th className="text-right">Setoran</th><th className="text-right">Berat</th><th className="text-right">Nilai</th></tr></thead>
          <tbody>
            {setoran.rows.map((r) => (
              <tr key={r.key}><td>{r.label}</td><td className="text-right tabular-nums">{r.jumlahSetoran}</td><td className="text-right tabular-nums">{formatKg(r.beratKg)}</td><td className="text-right tabular-nums">{formatRupiah(r.nilai)}</td></tr>
            ))}
            {setoran.rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-neutral-400">Belum ada data.</td></tr>}
          </tbody>
          <tfoot><tr className="font-semibold"><td>Total</td><td></td><td className="text-right tabular-nums">{formatKg(setoran.total.beratKg)}</td><td className="text-right tabular-nums">{formatRupiah(setoran.total.nilai)}</td></tr></tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Posisi tabungan nasabah</h2>
          <p className="mb-2 text-sm text-neutral-600">
            {tabungan.jumlahNasabah} nasabah aktif · total kewajiban <span className="font-semibold text-neutral-900">{formatRupiah(tabungan.totalKewajiban)}</span>
          </p>
          <table className="tbl">
            <thead><tr><th>Nasabah</th><th>Dusun</th><th className="text-right">Saldo</th></tr></thead>
            <tbody>
              {tabungan.rows.slice(0, 10).map((n) => (
                <tr key={n.id}><td>{n.nama}</td><td className="text-xs text-neutral-500">{n.dusun ?? "-"}</td><td className="text-right tabular-nums">{formatRupiah(n.saldo)}</td></tr>
              ))}
              {tabungan.rows.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-neutral-400">Belum ada nasabah.</td></tr>}
            </tbody>
          </table>
          {tabungan.rows.length > 10 && <p className="mt-2 text-xs text-neutral-400">Menampilkan 10 dari {tabungan.rows.length} nasabah.</p>}
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Partisipasi per dusun</h2>
          <p className="mb-2 text-sm text-neutral-600">{partisipasi.totalAktif} dari {partisipasi.total} nasabah berstatus aktif.</p>
          <table className="tbl">
            <thead><tr><th>Dusun</th><th className="text-right">Aktif</th><th className="text-right">Total</th><th className="text-right">%</th></tr></thead>
            <tbody>
              {partisipasi.rows.map((r) => (
                <tr key={r.dusun}><td>{r.dusun}</td><td className="text-right tabular-nums">{r.aktif}</td><td className="text-right tabular-nums">{r.total}</td><td className="text-right tabular-nums">{r.persentase}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Arus kas</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-neutral-500">Masuk</p><p className="font-medium text-emerald-700">{formatRupiah(arusKas.totalMasuk)}</p></div>
            <div><p className="text-xs text-neutral-500">Keluar</p><p className="font-medium text-red-600">{formatRupiah(arusKas.totalKeluar)}</p></div>
            <div><p className="text-xs text-neutral-500">Saldo saat ini</p><p className="font-semibold text-neutral-900">{formatRupiah(arusKas.saldoKasSaatIni)}</p></div>
          </div>
          {arusKas.perKategori.length > 0 && (
            <table className="tbl mt-4">
              <thead><tr><th>Kategori</th><th className="text-right">Nilai bersih</th></tr></thead>
              <tbody>
                {arusKas.perKategori.map((k) => (
                  <tr key={k.kategori}><td>{k.kategori}</td><td className={`text-right tabular-nums ${k.nilai < 0 ? "text-red-600" : "text-emerald-700"}`}>{formatRupiah(k.nilai)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

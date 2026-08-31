import { ringkasanDashboard } from "@/server/modules/laporan/laporan.service";
import { posisiMenunggu } from "@/server/modules/stok/stok.service";
import { formatRupiah, formatKg } from "@/server/lib/money";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [ringkasan, menunggu] = await Promise.all([ringkasanDashboard(), posisiMenunggu()]);

  const kartu = [
    { label: "Setoran bulan ini", nilai: `${ringkasan.setoranBulanIni.jumlahTransaksi} transaksi`, sub: formatKg(ringkasan.setoranBulanIni.totalBeratKg) },
    { label: "Menunggu diproses", nilai: `${ringkasan.menungguDiproses.jumlahSetoran} setoran`, sub: formatKg(ringkasan.menungguDiproses.totalBeratKg) },
    { label: "Nasabah aktif", nilai: String(ringkasan.nasabahAktif), sub: "warga terdaftar" },
    { label: "Saldo kas", nilai: formatRupiah(ringkasan.saldoKasSaatIni), sub: "kas lembaga saat ini" },
    { label: "Kewajiban tabungan", nilai: formatRupiah(ringkasan.totalKewajibanTabungan), sub: "total saldo nasabah" },
    { label: "Penarikan menunggu", nilai: String(ringkasan.penarikanMenunggu), sub: "perlu persetujuan admin" },
  ];

  const selisihKas = ringkasan.saldoKasSaatIni - ringkasan.totalKewajibanTabungan;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900">Ringkasan</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kartu.map((k) => (
          <div key={k.label} className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{k.label}</p>
            <p className="mt-1 text-xl font-semibold text-neutral-900">{k.nilai}</p>
            <p className="text-xs text-neutral-500">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className={`card ${selisihKas < 0 ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"}`}>
        <p className="text-sm font-medium text-neutral-900">
          {selisihKas < 0 ? "Kas belum menutupi seluruh kewajiban tabungan - periksa pengeluaran operasional." : "Kas mencukupi seluruh kewajiban tabungan."}
        </p>
        <p className="text-xs text-neutral-600">
          Selisih kas dikurangi kewajiban: {formatRupiah(selisihKas)}. Karena nasabah hanya dikredit bersamaan dengan uang
          masuk dari pengepul, selisih negatif berarti kas sudah terpakai untuk hal lain (operasional/hibah) melebihi yang tersedia.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Sampah menunggu diproses per kategori</h2>
        <table className="tbl">
          <thead><tr><th>Kategori</th><th className="text-right">Jumlah setoran</th><th className="text-right">Berat</th></tr></thead>
          <tbody>
            {menunggu.map((m) => (
              <tr key={m.kategoriSampahId}>
                <td>{m.nama}</td>
                <td className="text-right tabular-nums">{m.jumlahSetoran}</td>
                <td className="text-right tabular-nums">{formatKg(m.beratKg)}</td>
              </tr>
            ))}
            {menunggu.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-neutral-400">Belum ada sampah menunggu.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

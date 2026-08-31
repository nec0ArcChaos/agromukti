# Cetak Biru Back End — Sistem Informasi Bank Sampah Anorganik Desa Argamukti

> Acuan pengerjaan back end sekaligus kontrak API untuk kolaborator front end.
> Stack: Next.js 16 (App Router) · Prisma 6 · MySQL · Zod
> Cakupan: **sampah anorganik saja**, dijual ke pengepul

---

## Keputusan yang sudah ditetapkan (31 Agustus 2026)

| Hal | Keputusan |
|---|---|
| Basis data | **MySQL + Prisma 6.** CLI Prisma 7/8 sengaja dihindari (lihat catatan versi di bawah) |
| Cakupan | **Sampah anorganik saja.** Tidak ada lagi pengomposan, produk olahan, atau integrasi ke aplikasi partner KKN lain |
| Waktu pencatatan nilai | Setoran **hanya mencatat berat**. Nilai rupiah baru muncul saat pengepul benar-benar membayar (lihat alur di bawah) |
| Kategori sampah | Label ringan (plastik/kertas/logam/kaca/campuran) untuk laporan, **tanpa harga per kategori** |
| Akses nasabah | Tidak ada login nasabah. Hanya ADMIN dan OPERATOR |

### Catatan versi Prisma

`npm install prisma` menarik **Prisma 8 (rilis kandidat)** dengan CLI yang berubah total
(`prisma orm`, bukan `prisma migrate dev`) — berisiko besar untuk proyek yang harus mudah
diikuti kolaborator dan dokumentasi umum. Proyek ini **dikunci ke Prisma 6.19.x**, yang masih
memakai `url = env("DATABASE_URL")` langsung di `schema.prisma` tanpa driver adapter.
Jangan jalankan `npm install prisma@latest` tanpa mengecek versi yang ditarik terlebih dahulu.

---

## Alur nilai — berbeda dari bank sampah pada umumnya

Kebanyakan bank sampah menetapkan harga sendiri per jenis sampah dan langsung mengkredit
nasabah saat setoran diterima. Sistem ini **tidak melakukan itu** — bank sampah desa tidak
punya kapasitas menanggung risiko harga pasar sampah yang fluktuatif. Sebagai gantinya:

```
[1] Setoran nasabah        ditimbang, dicatat status MENUNGGU — BELUM ada nilai rupiah
     ↓
[2] Menumpuk di bank sampah sampai pengepul datang (bisa dari banyak nasabah, banyak hari)
     ↓
[3] Pengepul datang, membeli borongan, membayar SATU total untuk SEMUA yang diambil
     ↓
[4] Operator mencatat "Pengambilan Pengepul": pilih setoran mana yang diambil + total
    yang dibayarkan → sistem membagi nilainya PROPORSIONAL menurut berat ke tiap setoran
     ↓
[5] Tiap nasabah dikredit sesuai porsinya, kas bertambah sebesar total pembayaran
```

**Konsekuensi penting**: nasabah *hanya* dikredit bersamaan dengan uang yang benar-benar
masuk dari pengepul — tidak pernah mendahuluinya. Ini menghilangkan risiko "kas belum
menutupi kewajiban tabungan" yang lazim dihadapi bank sampah yang mengkredit di muka.

### Pembagian proporsional yang presisi

Saat satu pembayaran pengepul dibagi ke banyak setoran, jumlah seluruh bagian **harus**
tepat sama dengan yang dibayarkan — tidak boleh meleset karena pembulatan. Ini dijamin oleh
`bagiProporsional()` di [`src/server/lib/money.ts`](../src/server/lib/money.ts) memakai
metode *largest remainder*: tiap bagian dibulatkan ke bawah dahulu, sisa rupiah dari
pembulatan dibagikan satu-satu ke penerima dengan sisa desimal terbesar.

Contoh teruji: total Rp 29.999 dibagi ke tiga setoran (10 kg, 5 kg, 15 kg dari total 30 kg)
menghasilkan Rp 10.000 + Rp 5.000 + Rp 14.999 — jumlahnya tepat Rp 29.999.

---

## Model data — 11 tabel

### Data induk

| Tabel | Peran |
|---|---|
| `User` | Operator & admin sistem |
| `Nasabah` | Warga penyetor sampah. `saldo` adalah **cache**, kebenaran ada di `MutasiTabungan` |
| `KategoriSampah` | Label ringan (plastik/kertas/dst), **tanpa harga** |
| `Pengepul` | Pembeli borongan sampah anorganik |
| `Pengaturan` | Konfigurasi tunggal sistem (minimal penarikan, dll) |

### Setoran, pengambilan & tabungan

| Tabel | Peran |
|---|---|
| `Setoran` | **Model datar** (tanpa tabel rincian terpisah): nasabah + kategori + berat. Status `MENUNGGU → DIPROSES → VOID`. `nilaiAlokasi` diisi hanya setelah DIPROSES |
| `PengambilanPengepul` | Satu kedatangan pengepul yang mengambil borongan dari banyak setoran sekaligus. `totalNilai` = yang benar-benar dibayarkan |
| `MutasiTabungan` | Buku besar saldo nasabah — sumber kebenaran tunggal, hanya bertambah |
| `Penarikan` | Pengajuan dan pencairan saldo, alur setuju/tolak oleh admin |

### Kas & sistem

| Tabel | Peran |
|---|---|
| `MutasiKas` | Buku besar kas lembaga. Kategori: `PENGEPUL`, `PENARIKAN_NASABAH`, `MODAL_AWAL`, `OPERASIONAL`, `HIBAH`, `LAINNYA`, `KOREKSI` |
| `AuditLog` | Jejak seluruh perubahan data |
| `Sequence` | Penomoran dokumen anti-tabrakan (`ST-`, `PP-`, `TR-`, `AGM-`) |

Skema lengkap dengan komentar: [`../prisma/schema.prisma`](../prisma/schema.prisma).

---

## Aturan bisnis kritis

| Aturan | Alasan |
|---|---|
| **Setoran tidak punya harga saat dibuat** | Harga hanya ada saat pengepul membayar. Jangan pernah menambahkan field harga ke `Setoran` |
| **Setoran DIPROSES tidak bisa dibatalkan sendiri** | Koreksi hanya lewat pembatalan **seluruh** `PengambilanPengepul` terkait — mengembalikan semua setoran di dalamnya ke MENUNGGU dan menarik balik kredit semua nasabah yang terlibat |
| **Saldo berjalan dihitung bertahap dalam transaksi** | Bila satu nasabah punya beberapa setoran dalam satu batch pengambilan yang sama, `saldoSesudah` tiap mutasi TIDAK BOLEH dibaca dari cache `Nasabah.saldo` yang sudah basi — harus dihitung berurutan dalam memori selama loop |
| **Pembagian proporsional wajib presisi** | Pakai `bagiProporsional()`, jangan hitung manual per baris — pembulatan naif akan membuat total meleset |
| **Uang disimpan sebagai integer rupiah** | `Int`, bukan `Float`. Berat pakai `Decimal(10,2)` |
| **Transaksi tidak dihapus, hanya dibatalkan** | Status `VOID` + mutasi pembalik. Buku besar hanya bertambah |
| **Penomoran lewat tabel `Sequence`** | Bukan `COUNT(*) + 1` — mencegah nomor kembar saat dua operator menyimpan bersamaan |
| **Stok dihitung dari status Setoran, bukan tabel mutasi terpisah** | Setoran `MENUNGGU` = masih fisik di bank sampah. Tidak ada `MutasiStokSampah` — status itu sendiri sudah mewakili keadaan stok |

---

## Kontrak API

### Data induk

| Metode | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/auth/login` `/logout` · GET `/me` | Autentikasi sesi cookie httpOnly |
| GET POST | `/api/nasabah` | Daftar & daftar baru. `GET /api/nasabah/[id]/mutasi` untuk buku tabungan |
| GET POST | `/api/kategori-sampah` | Label kategori, tanpa harga |
| GET POST | `/api/pengepul` | Data pembeli borongan |
| GET PATCH | `/api/pengaturan` | Identitas lembaga, minimal penarikan |

### Setoran & pengambilan (inti sistem)

| Metode | Endpoint | Keterangan |
|---|---|---|
| GET POST | `/api/setoran` | Catat setoran (berat saja) dan lihat riwayat |
| GET | `/api/setoran/menunggu` | Daftar setoran siap diikutsertakan pengambilan |
| POST | `/api/setoran/[id]/batal` | Hanya berhasil bila status MENUNGGU |
| GET POST | `/api/pengambilan` | Catat kedatangan pengepul: pilih `setoranIds[]` + `totalNilai` |
| POST | `/api/pengambilan/[id]/batal` | Batalkan seluruh batch, kembalikan semua ke MENUNGGU |
| GET POST | `/api/penarikan` | Ajukan penarikan · `/setujui` `/tolak` khusus admin |

### Stok, kas, laporan

| Metode | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/stok/sampah` | Berat menunggu diproses per kategori |
| GET POST | `/api/kas` | Mutasi kas + entri manual (modal awal, operasional) |
| GET | `/api/dashboard/ringkasan` | Kartu angka beranda |
| GET | `/api/laporan/setoran` | `groupBy=kategori\|dusun\|nasabah` |
| GET | `/api/laporan/tabungan` `/partisipasi` `/arus-kas` | |
| GET | `/api/backup` | Unduh cadangan JSON — khusus admin |
| GET | `/api/audit-log` | Khusus admin |

---

## Riwayat pivot

**31 Agustus 2026** — Sistem semula dirancang untuk sampah **organik** dengan pengomposan
(lihat riwayat git/percakapan untuk detail model lama). Diputuskan untuk pindah total ke
sampah **anorganik** yang dijual ke pengepul, dengan alasan: di lapangan hanya sampah
anorganik yang akan dikelola bank sampah ini (organik ditangani program kelompok terpisah).
Perubahan ini menghapus seluruh domain kompos (`BatchKompos`, `Produk`, integrasi API
partner) dan mengganti model "harga internal ditetapkan pengurus" menjadi "nilai ditentukan
pengepul saat pembelian, dibagi proporsional ke nasabah".

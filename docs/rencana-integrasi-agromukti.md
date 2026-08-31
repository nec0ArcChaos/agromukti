# Rencana Integrasi — AgroMukti (Sistem Terpadu Desa Argamukti)

> Menggabungkan tiga pilar KKM Kelompok 45 menjadi satu aplikasi Next.js.
> Disusun 31 Agustus 2026, setelah menelaah kode PHP kolaborator.

---

## 1. Peta tiga pilar

| Pilar | Penyusun | Status kode | Status database |
|---|---|---|---|
| **Bank Sampah** (anorganik → pengepul) | Hanif (kita) | ✅ Next.js, selesai & teruji | ✅ `bank_sampah_argamukti` (11 tabel) |
| **Pertanian & Distribusi Pupuk** | Ayu Rianti | ✅ PHP native, 26 berkas | ⚠️ `db_argamukti` — skema ada di `agromukti/database.sql`, tapi **belum pernah dibuat** di MySQL lokal |
| **Sampah Organik & Produksi Pupuk + UMKM** | Kolaborator kedua | ❌ Tidak ada di mesin ini | ❌ `db_prokerkkm` tidak ada |

### Koreksi penting

`agromukti/database.sql` adalah skema **milik AgroMukti sendiri** (`db_argamukti`, 13 tabel:
petani, komoditas, lahan, panen, produk_pupuk, stok_pupuk, mutasi_stok, permintaan_pupuk +
detail, distribusi_pupuk + detail, artikel, users). Berkas itu **tidak memuat** tabel pilar
kedua.

Tabel pilar kedua hidup di database terpisah `db_prokerkkm` dan hanya dirujuk dari kode
AgroMukti (`config.php:316`, `kkm_buat_pupuk.php`, `kkm_umkm.php`, `portal_warga.php:764`).
Kabar baiknya: **skemanya bisa direkonstruksi** dari cara AgroMukti meng-query-nya —

```
jumlahsampahorganik : id, jumlah                       (satu baris, stok sampah organik kg)
produksi_pupuk      : id, kode_pupuk, tanggal_mulai, berat_sampah_organik,
                      estimasi_pupuk_cair, estimasi_pupuk_kasar, estimasi_selesai,
                      tanggal_selesai, pupuk_cair_aktual, pupuk_kasar_aktual,
                      status ('proses'|'selesai'), keterangan
inventaris          : kategori ('pupuk_cair'|'pupuk_kasar'), stok
produk              : id, kode_produk, nama_produk, kategori, harga, stok, satuan,
                      status ('tersedia'|...)
```

Rekonstruksi ini **wajib dikonfirmasi** ke kolaborator kedua sebelum dipakai produksi —
kolom yang tidak pernah disentuh AgroMukti tidak akan terlihat dari sini.

---

## 2. Rantai ekonomi sirkular — narasi yang diperbarui

Dokumen kolaborator (`PERANCANGAN_SISTEM.md` §7) menggambarkan Bank Sampah memasok kompos
ke stok pupuk AgroMukti. **Itu sudah tidak berlaku** sejak Bank Sampah difokuskan ke
anorganik saja. Rantai yang benar sekarang:

```
  Warga
    ├── sampah ANORGANIK ──► Bank Sampah ──► Pengepul ──► tabungan warga (uang)
    │                          (pilar 1)
    └── sampah ORGANIK ─────► Produksi Pupuk ──► kompos & POC ──► Stok Pupuk
                               (pilar 2)                            (pilar 3)
                                                                      │
                                                          Distribusi ke petani
                                                                      │
                                                            Panen ──► UMKM (pilar 2)
```

Bank Sampah tetap bagian ekonomi sirkular, hanya lewat jalur nilai ekonomi (uang kembali ke
warga), bukan jalur material pupuk. **Dokumen `PERANCANGAN_SISTEM.md` §7 milik kolaborator
perlu direvisi** agar tidak bertentangan dengan sistem yang diserahkan.

---

## 3. Model data terpadu

Satu database, satu skema Prisma. Keputusan: **satu login + satu master data warga.**

### Identitas

```
Warga            identitas tunggal warga desa
                 id, nik?, nama, alamat, dusun, rt, rw, noHp, aktif
   │
   ├── Nasabah   profil bank sampah  → wargaId, kode (AGM-0001), saldo, status
   └── Petani    profil pertanian    → wargaId, kelompokTani?, status
```

Satu orang bisa sekaligus nasabah **dan** petani tanpa data ganda. Ini juga membuka laporan
"kontribusi warga" lintas pilar yang sebelumnya mustahil.

**Catatan privasi**: `nik` dijadikan **opsional**. Skema lama menjadikannya `NOT NULL UNIQUE`,
dan `api.php` mengekspos seluruh NIK petani tanpa autentikasi. Itu tidak boleh terbawa —
lihat §6.

### Peran pengguna

| Peran | Akses |
|---|---|
| `ADMIN` | Seluruh modul + pengaturan + manajemen pengguna |
| `OPERATOR_SAMPAH` | Modul bank sampah |
| `OPERATOR_TANI` | Modul pertanian & distribusi pupuk |
| `KEPALA_DESA` | Baca-saja seluruh modul + cetak laporan resmi |

Peran "Kelompok Tani" yang dijanjikan README kolaborator tidak pernah ada di skemanya
(`ENUM('admin','petugas')` saja). Layanan mandiri petani tetap lewat **portal publik tanpa
login** (cek status pengajuan + form pengajuan pupuk), persis seperti yang benar-benar mereka
bangun di `index.php` dan `portal_warga.php`.

### Tabel yang dimigrasikan

| Asal | Menjadi | Catatan |
|---|---|---|
| `petani` | `Petani` + `Warga` | Identitas dipisah ke Warga |
| `komoditas` | `Komoditas` | + `dosisPupukPerHa` |
| `lahan` | `Lahan` | |
| `panen` | `Panen` | |
| `produk_pupuk` | `ProdukPupuk` | |
| `stok_pupuk` + `mutasi_stok` | `MutasiStokPupuk` | Stok dihitung dari mutasi, tabel `stok_pupuk` jadi cache — pola yang sama dengan bank sampah |
| `permintaan_pupuk` + detail | `PermintaanPupuk` + `PermintaanPupukDetail` | |
| `distribusi_pupuk` + detail | `DistribusiPupuk` + `DistribusiPupukDetail` | |
| `artikel` | `Artikel` | |
| `users` | dilebur ke `User` kita | Peran dipetakan ulang |
| `jumlahsampahorganik` | `StokSampahOrganik` | Pilar 2 — skema rekonstruksi |
| `produksi_pupuk` | `ProduksiPupuk` | Pilar 2 — skema rekonstruksi |
| `inventaris` | dilebur ke `MutasiStokPupuk` | Duplikasi dengan stok_pupuk, disatukan |
| `produk` | `ProdukUmkm` | Pilar 2 — skema rekonstruksi |

---

## 4. Peta desain

Design system mereka rapi dan langsung bisa dipetakan ke Tailwind + shadcn:

| Token asal (`style.css`) | Padanan |
|---|---|
| `--primary: #0f766e` | `primary` shadcn (teal-700) |
| `--sidebar-bg: #0b131e` | Sidebar gelap, `slate-950` |
| `--radius: 12px` | `--radius: 0.75rem` |
| Plus Jakarta Sans | `next/font/google` |
| `.card`, `.badge`, `.data-table`, `.modal-*` | `Card`, `Badge`, `Table`, `Dialog` shadcn |

Halaman bank sampah kita yang sekarang polos ikut diseragamkan ke design system ini —
itulah "polish" yang Anda maksud.

---

## 5. Struktur rute

```
/                        Landing publik (dari index.php) + cuaca Open-Meteo
/portal                  Portal warga: cek status & ajukan pupuk (tanpa login)
/login

/(app)/
  dashboard              Ringkasan lintas pilar
  warga                  Master data warga
  bank-sampah/           setoran · pengambilan · penarikan · nasabah ·
                         kategori-sampah · pengepul · kas
  pertanian/             petani · lahan · komoditas · panen
  pupuk/                 produk · stok · mutasi · permintaan · distribusi
  organik/               stok sampah organik · produksi pupuk      (pilar 2)
  umkm/                  produk UMKM                                (pilar 2)
  laporan                Laporan resmi berkop + tanda tangan
  pengaturan · users
```

---

## 6. Utang keamanan yang TIDAK boleh ikut bermigrasi

| Temuan | Lokasi | Penanganan |
|---|---|---|
| API publik tanpa autentikasi mengekspos NIK seluruh petani | `api.php` (`Access-Control-Allow-Origin: *`, `SELECT * FROM petani`) | Tidak diporting. Endpoint publik dibatasi hanya data non-pribadi |
| 19 query merangkai variabel langsung ke SQL, hanya 3 pemakaian `bind_param` | seluruh `*.php` | Hilang sendiri: Prisma selalu memakai query terparameter |
| Hash kata sandi seed tidak valid (pola berulang `w3w3w3w3`) | `database.sql:162` | Seed ulang dengan bcrypt yang benar |
| Kredensial demo bertiga-beda | README (`password`) vs `config.php` (`password123`) vs `database.sql` | Satu sumber kebenaran di `.env` |
| `nik NOT NULL UNIQUE` | `petani` | Jadi opsional di `Warga` (UU PDP) |

---

## 7. Tahapan kerja

| Fase | Isi | Perkiraan |
|---|---|---|
| **1** | Skema Prisma terpadu + migrasi `Nasabah` → `Warga` + auth & peran baru | 2 hari |
| **2** | Design system shadcn + kerangka layout (sidebar, topbar, tema) | 1,5 hari |
| **3** | Modul pertanian: petani, lahan, komoditas, panen | 2 hari |
| **4** | Modul pupuk: produk, stok/mutasi, permintaan, distribusi | 2,5 hari |
| **5** | Pilar 2: stok organik, produksi pupuk, UMKM *(butuh konfirmasi skema)* | 1,5 hari |
| **6** | Portal publik + landing + cuaca Open-Meteo | 1,5 hari |
| **7** | Laporan lintas pilar + cetak berkop desa | 1,5 hari |
| **8** | Migrasi data nyata, pengujian menyeluruh, serah terima | 1,5 hari |

**Total ± 14 hari kerja.** Jauh di atas target "2 hari" sebelumnya — wajar, karena ini
menggabungkan tiga sistem, bukan menyelesaikan satu. Bila tenggat mendesak, fase 5 dan 6
adalah yang paling aman ditunda.

---

## 8. Yang masih perlu dari Anda

1. **Kode & database asli pilar kedua** — skema yang saya susun di §1 adalah rekonstruksi
   dari cara AgroMukti memakainya, bukan definisi aslinya.
2. **Proposal PDF kedua kolaborator** — berguna untuk menyamakan istilah dan indikator
   evaluasi di laporan KKM, seperti yang sudah kita lakukan untuk proposal Anda.
3. **Konfirmasi ke Ayu** bahwa `PERANCANGAN_SISTEM.md` §7 akan direvisi (rantai kompos tidak
   lagi lewat Bank Sampah).

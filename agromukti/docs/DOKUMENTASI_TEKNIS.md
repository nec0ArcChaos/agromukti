# DOKUMENTASI TEKNIS (TECHNICAL DOCUMENTATION)
## Sistem Informasi Pertanian & Distribusi Pupuk Organik (AgroMukti)
**Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka**

---

### 🛠️ 1. Spesifikasi Arsitektur Sistem

- **Platform Server**: Local Server / Intranet (XAMPP Server)
- **Web Server Engine**: Apache 2.4 / Nginx
- **Database Management System (DBMS)**: MySQL 8.0 / MariaDB (utf8mb4)
- **Programming Language (Backend)**: PHP 8.x (Native Procedural & Prepared Statements)
- **Frontend Framework**: Bootstrap 5.3 + Custom Vanilla CSS (Design System Agro-Modern)
- **Interaktivitas UI**: JavaScript ES6, Chart.js (Data Visualization), FontAwesome 6.5
- **Weather API**: Open-Meteo REST API (Geolocation Lat: -6.9205, Lon: 108.3375 Argamukti)

---

### 📊 2. Entity Relationship Diagram (ERD) & Struktur Database

Database name: `agromukti_db`

#### Relasi Antar Tabel:
```
[users] ──(Authentication Role: Admin, Kades, Petani)

[petani] 1 ──── N [lahan]
   │
   ├────── 1 ──── N [panen] N ──── 1 [komoditas]
   │
   └────── 1 ──── N [distribusi_pupuk] N ──── 1 [pupuk]
```

#### Struktur Detail Tabel:

1. **`users`** (Akun Pengguna Sistem)
   - `id` (INT, Primary Key, Auto Increment)
   - `username` (VARCHAR 50, Unique, Not Null)
   - `password` (VARCHAR 255, Not Null)
   - `nama_lengkap` (VARCHAR 100, Not Null)
   - `role` (ENUM: 'admin', 'kades', 'petani', Default: 'admin')
   - `created_at` (TIMESTAMP)

2. **`petani`** (Master Data Petani)
   - `id` (INT, Primary Key, Auto Increment)
   - `nik` (VARCHAR 16, Unique)
   - `nama` (VARCHAR 100, Not Null)
   - `kelompok_tani` (VARCHAR 100)
   - `dusun` (VARCHAR 50)
   - `no_hp` (VARCHAR 20)
   - `created_at` (TIMESTAMP)

3. **`lahan`** (Data Luas & Lokasi Lahan)
   - `id` (INT, Primary Key, Auto Increment)
   - `petani_id` (INT, Foreign Key -> `petani.id`, On Delete Cascade)
   - `luas_lahan` (DECIMAL 10,2, Unit: Hektar)
   - `lokasi_blok` (VARCHAR 100)
   - `status_kepemilikan` (ENUM: 'Milik Sendiri', 'Sewa', 'Bagi Hasil')

4. **`komoditas`** (Master Komoditas Hortikultura)
   - `id` (INT, Primary Key, Auto Increment)
   - `nama_komoditas` (VARCHAR 50, Not Null)
   - `jenis` (ENUM: 'Sayuran Daun', 'Sayuran Buah', 'Umbi', 'Lainnya')

5. **`panen`** (Transaksi Rekap Hasil Panen)
   - `id` (INT, Primary Key, Auto Increment)
   - `petani_id` (INT, Foreign Key -> `petani.id`)
   - `komoditas_id` (INT, Foreign Key -> `komoditas.id`)
   - `jumlah_panen` (DECIMAL 10,2, Unit: Kg)
   - `tanggal_panen` (DATE, Not Null)
   - `keterangan` (TEXT)

6. **`pupuk`** (Master Stok Pupuk Kompos)
   - `id` (INT, Primary Key, Auto Increment)
   - `jenis_pupuk` (VARCHAR 100, Not Null)
   - `stok` (DECIMAL 10,2, Unit: Kg)
   - `keterangan` (TEXT)

7. **`distribusi_pupuk`** (Transaksi Pengajuan & Penyaluran Pupuk Kompos)
   - `id` (INT, Primary Key, Auto Increment)
   - `petani_id` (INT, Foreign Key -> `petani.id`)
   - `pupuk_id` (INT, Foreign Key -> `pupuk.id`)
   - `jumlah_diminta` (DECIMAL 10,2, Unit: Kg)
   - `jumlah_disetujui` (DECIMAL 10,2, Unit: Kg)
   - `tanggal_pengajuan` (DATE)
   - `tanggal_penyaluran` (DATE, Nullable)
   - `status` (ENUM: 'Menunggu', 'Disetujui', 'Disalurkan', 'Ditolak')

---

### 🌐 3. Arsitektur Jaringan Intranet Tri-Portal Desa

```
[ Warga / HP Petani ] ─── (WiFi Desa Argamukti) ───┐
                                                  │
[ Laptop Anggota 1 ] ──── (WiFi Desa Argamukti) ───┼───► [ Laptop Server XAMPP ]
 (Portal Utama Desa)                              │     (Host IP: 192.168.1.x)
                                                  │     - MySQL DB: agromukti_db
[ Laptop Anggota 2 ] ──── (WiFi Desa Argamukti) ───┤     - Apache Web Server
 (SI Bank Sampah)                                 │     - Core Application
                                                  │
[ Laptop Anggota 3 ] ──── (WiFi Desa Argamukti) ───┘
 (SI Pertanian & Pupuk)
```

---

### 🔒 4. Pemeliharaan & Prosedur Backup Database

1. **Backup Otomatis SQL**:
   Dapat dijalankan melalui phpMyAdmin atau skrip mysqldump:
   ```bash
   mysqldump -u root agromukti_db > backup_agromukti_db.sql
   ```

2. **Auto Database Migration**:
   File `config.php` telah diprogram dengan fitur *Auto-Table Creation & Default Data Seeding*, sehingga jika dipindahkan ke laptop baru, sistem secara otomatis akan membuat database dan semua tabel secara mandiri saat halaman diakses.

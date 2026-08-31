# PANDUAN PENGGUNA (USER MANUAL)
## Sistem Informasi Pertanian & Distribusi Pupuk Organik (AgroMukti)
**Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka**

---

### 📚 DAFTAR ISI
1. [Petunjuk Akses Sistem](#1-petunjuk-akses-sistem)
2. [Panduan untuk Perangkat Desa (Admin / Operator)](#2-panduan-untuk-perangkat-desa-admin--operator)
3. [Panduan untuk Kepala Desa (Kuewu)](#3-panduan-untuk-kepala-desa-kuewu)
4. [Panduan untuk Kelompok Tani & Masyarakat](#4-panduan-untuk-kelompok-tani--masyarakat)
5. [Tanya Jawab & Penanganan Kendala (Troubleshooting)](#5-tanya-jawab--penanganan-kendala-troubleshooting)

---

### 1. Petunjuk Akses Sistem

#### A. Akses dari Laptop Server (Offline / Intranet)
1. Buka **XAMPP Control Panel**, lalu pastikan modul **Apache** dan **MySQL** telah di-**Start** (berwarna hijau).
2. Buka browser (Google Chrome, Edge, atau Firefox).
3. Ketik alamat URL: **`http://localhost/agromukti`**
4. Halaman Utama Publik (*Landing Page*) akan terbuka.

#### B. Akses dari HP / Laptop Lain via WiFi Desa
1. Pastikan HP/Laptop warga/perangkat desa sudah terhubung ke jaringan **WiFi Balai Desa yang sama**.
2. Ketik IP Address Laptop Server (contoh: `http://192.168.1.15/agromukti`).

---

### 2. Panduan untuk Perangkat Desa (Admin / Operator)

Perangkat Desa bertindak sebagai Pengelola Data Utama (CRUD: Create, Read, Update, Delete).

#### A. Cara Login
1. Klik tombol **"Login Admin / Petani"** di pojok kanan atas Halaman Utama.
2. Pada halaman pilih peran, klik kartu **"Perangkat Desa"**.
3. Masukkan **Username**: `admin` dan **Password**: `password`.
4. Klik **LOG IN SEBAGAI PERANGKAT DESA**.

#### B. Mengelola Data Petani (`petani.php`)
1. Pilih menu **Data Petani** di baris navigasi kiri (sidebar).
2. **Menambah Petani**: Klik tombol **+ Tambah Petani**, isi NIK, Nama Lengkap, Kelompok Tani, Dusun, dan No HP/WA, lalu klik **Simpan Data**.
3. **Mengedit / Menghapus**: Klik ikon pensil (edit) atau ikon tempat sampah (hapus) pada baris data petani yang bersangkutan.

#### C. Mengelola Lahan Pertanian (`lahan.php`)
1. Pilih menu **Data Lahan**.
2. Klik **+ Tambah Lahan**, pilih nama petani pemilik/penggarap, masukkan luas lahan (dalam Hektar), lokasi blok/petak, dan status kepemilikan (Milik Sendiri / Sewa / Bagi Hasil).

#### D. Pencatatan Hasil Panen (`panen.php`)
1. Pilih menu **Hasil Panen**.
2. Klik **+ Catat Panen**, pilih tanggal panen, nama petani, jenis komoditas (Bawang Daun, Tomat, Kubis, Kentang, dll), serta total jumlah panen dalam Kg.

#### E. Mengelola Stok & Distribusi Pupuk Kompos (`pupuk.php` & `permintaan_pupuk.php`)
1. **Menambah Stok Kompos**: Masuk ke menu **Stok Pupuk** -> Klik **+ Tambah Stok** -> Masukkan jumlah pupuk kompos baru hasil produksi drum komposter (dalam Kg).
2. **Persetujuan Pengajuan**: Masuk ke menu **Permintaan Pupuk** -> Pada pengajuan yang berstatus *Menunggu*, klik tombol **Setujui & Salurkan**. Stok kompos akan otomatis berkurang sesuai jumlah yang disetujui.

---

### 3. Panduan untuk Kepala Desa (Kuewu)

Kepala Desa bertindak sebagai Pengawas Eksekutif & Penanggung Jawab Kebijakan Ketahanan Pangan Desa.

#### A. Cara Login Kades
1. Buka `http://localhost/agromukti/login.php`.
2. Klik kartu **"Kepala Desa"**.
3. Masukkan **Username**: `kades` dan **Password**: `password`.
4. Klik **LOG IN SEBAGAI KEPALA DESA**.

#### B. Memantau Ringkasan Ketahanan Pangan
1. Pada **Dashboard Eksekutif**, Kepala Desa dapat melihat:
   - Total Luas Lahan Aktif & Jumlah Petani Terdaftar.
   - Total Ton Hasil Panen Bulan Ini & Tren 6 Bulan Terakhir.
   - Sisa Stok Pupuk Kompos Organik Desa.
   - Grafik Sebaran Komoditas Utama (Bawang Daun, Kubis, Tomat, dll).

#### C. Mengunduh & Mencetak Laporan Resmi (`laporan.php`)
1. Pilih menu **Laporan Resmi**.
2. Pilih Periode Bulan yang ingin direkap (misal: Agustus 2026).
3. Klik tombol **Cetak Laporan**. Format laporan siap dicetak ke printer atau disimpan sebagai **PDF** untuk arsip kantor desa.

---

### 4. Panduan untuk Kelompok Tani & Masyarakat

Masyarakat dan Petani dapat memanfaatkan fitur portal publik tanpa harus menghafal kredensial rumit.

#### A. Cek Status Pengajuan Pupuk Kompos Mandiri
1. Buka Halaman Utama: `http://localhost/agromukti`.
2. Gulir ke bawah sampai pada bagian **"Cek Status Pengajuan Pupuk Kompos"**.
3. Ketik Nama Petani atau Nama Kelompok Tani (misal: *KWT Harapan Maju* atau *Emo*).
4. Klik **Cari Data**. Status pengajuan (Menunggu / Disalurkan) akan langsung muncul di layar.

#### B. Melihat Informasi Cuaca & Rekomendasi Tanam
1. Di halaman utama, perhatikan widget **Cuaca Real-time Desa Argamukti**.
2. Ikuti rekomendasi dosis pupuk kompos susulan sesuai fase tanam yang disarankan.

---

### 5. Tanya Jawab & Penanganan Kendala (Troubleshooting)

* **Q: Bagaimana jika koneksi terputus saat demo?**
  * *Jawab*: Pastikan modul Apache dan MySQL di XAMPP tetap aktif (berwarna hijau). Aplikasi dirancang memiliki *offline fallback* sehingga tidak akan *crash*.
* **Q: Lupa password admin?**
  * *Jawab*: Password default untuk semua akun demo adalah `password`.

# 🌾 AgroMukti - Sistem Informasi Pertanian & Distribusi Pupuk Organik
### Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka
**Program Kuliah Kerja Mahasiswa (KKM) Kelompok 45 - Universitas Muhammadiyah Cirebon 2026**

---

## 📌 Deskripsi Singkat
**AgroMukti** adalah aplikasi web Sistem Informasi Pertanian dan Alokasi Pupuk Organik Kompos yang dikembangkan untuk mendukung ketahanan pangan dan ekonomi sirkular di Desa Argamukti. Berada di lereng Gunung Ciremai dengan 98% penduduk bermata pencaharian sebagai petani hortikultura, sistem ini mengintegrasikan pendataan 750+ petani, 3.398 Ha lahan, pencatatan hasil panen real-time, serta alokasi pupuk kompos ramah lingkungan secara transparan.

Aplikasi ini merupakan bagian dari **Tri-Portal Digital Desa Argamukti (SPBE)** yang saling terhubung melalui jaringan intranet lokal (WiFi Balai Desa).

---

## ✨ Fitur Unggulan

1. **Halaman Publik / Landing Page (`index.php`)**:
   - Visualisasi profil pertanian & komoditas hortikultura unggulan desa.
   - Integrasi **Live Weather API (Open-Meteo)** koordinat Desa Argamukti (-6.9205, 108.3375).
   - Layanan Mandiri **Cek Status Pengajuan Pupuk** & **Form Pengajuan Pupuk Kompos Publik**.
   - Banner Integrasi Tri-Portal SPBE Desa Argamukti.

2. **Sistem Login Berbasis Peran (Role-Based Access / `login.php`)**:
   - **👨‍💼 Perangkat Desa (Admin Operator)**: Akses penuh kelola data petani, lahan, panen, & pupuk.
   - **🏛️ Kepala Desa (Kuewu)**: Dashboard Eksekutif, monitoring tren panen, & cetak laporan resmi Kades.
   - **🌾 Kelompok Tani / Petani**: Layanan pengajuan alokasi pupuk kompos & rekap panen mandiri.

3. **Manajemen Data & Transaksi Complete**:
   - **Data Petani & Lahan**: Pendataan NIK, dusun, kelompok tani, luas lahan (Ha), & status kepemilikan.
   - **Pencatatan Panen**: Rekapitulasi hasil panen per komoditas (Bawang Daun, Tomat, Kubis, Kentang, dll).
   - **Distribusi Pupuk Kompos**: Visualisasi progres stok pupuk & alokasi satu-klik persetujuan.
   - **Laporan Resmi**: Fitur cetak dengan Kop Surat Resmi Desa Argamukti & blok tanda tangan Kades & DPL.

4. **Auto Database Migration**:
   - File `config.php` diprogram untuk otomatis membuat database `agromukti_db`, 7 tabel pendukung, dan mengisi data awal (seeding) secara mandiri saat pertama diakses.

---

## 🛠️ Persyaratan & Instalasi

### Persyaratan System:
- **XAMPP Server** (Apache + MySQL / MariaDB, PHP 8.x)
- Web Browser modern (Google Chrome, Microsoft Edge, Firefox)

### Langkah Jalankan:
1. Pastikan folder aplikasi tersimpan di: `C:\xampp\htdocs\agromukti\`
2. Buka **XAMPP Control Panel**, lalu klik **Start** pada **Apache** dan **MySQL**.
3. Buka browser, lalu ketik alamat:
   > **`http://localhost/agromukti`**
4. Database `agromukti_db` & seluruh tabel akan dibuat secara otomatis saat pertama kali dibuka!

---

## 🔑 Kredensial Demo Login

| Peran (Role) | Username | Password | Deskripsi Akses |
|---|---|---|---|
| **Perangkat Desa** | `admin` | `password` | Operator SI (Full Access CRUD Data) |
| **Kepala Desa** | `kades` | `password` | Monitoring Eksekutif & Cetak Laporan |
| **Kelompok Tani** | `petani` | `password` | Layanan Pengajuan Pupuk & Rekap Panen |

---

## 📁 Struktur Folder Proyek

```
C:\xampp\htdocs\agromukti\
├── assets/
│   ├── css/style.css         # Custom Design System Agro-Modern
│   └── js/                   # Script Pendukung
├── docs/
│   ├── USER_MANUAL.md        # Buku Panduan Pengguna (Admin, Kades, Petani)
│   ├── DOKUMENTASI_TEKNIS.md # Spesifikasi Teknis, ERD, Schema DB, Arsitektur
│   └── DRAFT_ARTIKEL_JURNAL.md # Draft Artikel Ilmiah Pengabdian KKM UMC 2026
├── includes/
│   ├── header.php            # Header Layout Topbar & Responsive Clock
│   ├── sidebar.php           # Sidebar Navigation & Dynamic Role Badge
│   └── footer.php            # Footer Scripts, Toast & Modal Engine
├── config.php                # Koneksi DB & Auto Migration/Seeding
├── index.php                 # Landing Page Portal Publik & Form Pengajuan
├── login.php                 # Halaman Login 3 Peran Interaktif
├── proses_login.php          # Auth Processor Session Peran
├── dashboard.php             # Dashboard Multi-Role (Stats & Chart.js)
├── petani.php                # Master Data Petani (CRUD)
├── lahan.php                 # Data Lahan Pertanian (CRUD)
├── komoditas.php             # Master Data Komoditas (Card Grid)
├── panen.php                 # Pencatatan Panen Real-time
├── pupuk.php                 # Stok Pupuk Kompos & Manajemen Stok
├── permintaan_pupuk.php      # Persetujuan Pengajuan Pupuk
├── laporan.php               # Laporan Resmi + Kop Surat & Tanda Tangan
└── database.sql              # Skema Cadangan SQL
```

---

## 👨‍💻 Tim Pengembang KKM 45 UMC
- **Penyusun**: Ayu Rianti (NIM: 230511037) – Teknik Informatika
- **DPL**: Assoc. Prof. Dr. Munawaroh, S.E., Ak., M.M., CA.
- **Mitra Pengabdian**: Pemerintah Desa Argamukti, Kecamatan Argapura, Kabupaten Majalengka (2026).

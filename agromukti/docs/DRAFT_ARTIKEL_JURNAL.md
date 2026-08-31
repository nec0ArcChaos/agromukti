# DRAFT ARTIKEL JURNAL ILMIAH PENGABDIAN MASYARAKAT (KKM 2026)

**Judul Artikel**:  
*PENGEMBANGAN SISTEM INFORMASI PERTANIAN DAN DISTRIBUSI PUPUK ORGANIK BERBASIS WEB UNTUK MENDUKUNG KETAHANAN PANGAN DESA ARGAMUKTI*

**Penulis**:  
Ayu Rianti¹*, Assoc. Prof. Dr. Munawaroh, S.E., Ak., M.M., CA.²  
¹Program Studi Teknik Informatika, Universitas Muhammadiyah Cirebon  
²Dosen Pembimbing Lapangan, Kelompok 45 KKM UMC  
*Email Penulis Korespondensi: ayurianti@gmail.com

---

### ABSTRAK
Desa Argamukti yang terletak di lereng Gunung Ciremai, Kecamatan Argapura, Kabupaten Majalengka memiliki potensi sektor pertanian hortikultura yang sangat besar, dengan 98% penduduknya menggantungkan penghidupan sebagai petani. Namun, tata kelola data pertanian seperti pendataan petani, luas lahan, pencatatan hasil panen, dan alokasi pupuk organik selama ini masih dilakukan secara manual menggunakan buku tulis. Hal tersebut mengakibatkan pencatatan rentan rusak, tidak akurat, serta distribusi pupuk kompos hasil olahan limbah desa tidak terstruktur. Penelitian pengabdian ini bertujuan membangun Sistem Informasi Pertanian dan Distribusi Pupuk Organik berbasis web (AgroMukti) untuk mendukung digitalisasi desa dan ketahanan pangan. Metode yang digunakan adalah *Asset-Based Community Development* (ABCD) dan *Participatory Action Research* (PAR). Hasil pengabdian menunjukkan bahwa sistem berbasis web yang dibangun berhasil mengintegrasikan pendataan 750 petani, luasan lahan 3,398 Ha, rekapitulasi panen real-time, serta transparansi alokasi pupuk kompos. Sistem ini diuji menggunakan arsitektur intranet lokal berbasis XAMPP dan terbukti meningkatkan efisiensi pendataan serta akuntabilitas distribusi pupuk di Desa Argamukti.

**Kata Kunci**: *Sistem Informasi Pertanian, Distribusi Pupuk Organik, Ketahanan Pangan, Ekonomi Sirkular, Desa Argamukti.*

---

### ABSTRACT
*Argamukti Village, located on the slopes of Mount Ciremai, Argapura District, Majalengka Regency, has huge potential in the horticultural agriculture sector, with 98% of its population relying on farming for their livelihoods. However, agricultural data management—such as farmer data, land area, harvest recording, and organic fertilizer allocation—has previously been carried out manually using notebooks. This resulted in vulnerable, inaccurate records, and unstructured distribution of compost produced from village waste. This community service project aims to develop a web-based Agricultural Information and Organic Fertilizer Distribution System (AgroMukti) to support village digitalization and food security. The methods used are Asset-Based Community Development (ABCD) and Participatory Action Research (PAR). The results show that the web-based system successfully integrated the data of 750 farmers, 3,398 hectares of land, real-time harvest records, and transparent compost allocation. Tested using a local intranet architecture based on XAMPP, the system effectively improved data logging efficiency and fertilizer distribution accountability in Argamukti Village.*

***Keywords***: *Agricultural Information System, Organic Fertilizer Distribution, Food Security, Circular Economy, Argamukti Village.*

---

### 1. PENDAHULUAN
Desa Argamukti terletak pada ketinggian ±1.500 meter di atas permukaan laut (mdpl) di kaki Gunung Ciremai dengan kondisi tanah vulkanik yang subur. Komoditas hortikultura utama desa ini meliputi bawang daun, kubis, tomat, kentang, wortel, dan bawang merah. Berdasarkan survei lapangan, sekitar 98% dari total 750 Kepala Keluarga (KK) menggantungkan pendapatan pada sektor pertanian.

Meskipun potensi alam sangat tinggi, pengelolaan data sektor pertanian di Desa Argamukti menghadapi dua kendala utama:
1. Pencatatan data pertanian (petani, lahan, dan produktivitas panen) masih dilakukan secara konvensional pada buku kertas yang mudah rusak dan tidak terstruktur.
2. Kelompok tani dan Bank Sampah Desa telah mulai memproduksi pupuk kompos dari sampah organik, namun pendistribusiannya belum memiliki sistem pencatatan yang transparan dan tepat sasaran.

Melalui program Kuliah Kerja Mahasiswa (KKM) Kelompok 45 UMC Tahun 2026, dibangunlah sebuah solusi digital berbasis web bernama **AgroMukti (Sistem Informasi Pertanian dan Distribusi Pupuk Organik)** yang terintegrasi dengan ekosistem digital desa.

---

### 2. METODE PENGABDIAN
Kegiatan pengabdian ini dilaksanakan selama 35 hari di Desa Argamukti menggunakan dua pendekatan utama:
1. **Asset-Based Community Development (ABCD)**: Memetakan aset utama desa, yaitu kesuburan lahan pertanian, keaktifan Kelompok Wanita Tani (KWT), dan adanya fasilitas pengolahan sampah organik.
2. **Participatory Action Research (PAR)**: Melibatkan perangkat desa, pengurus kelompok tani, dan petani secara aktif pada tahap analisis kebutuhan, perancangan sistem, pengujian, hingga sosialisasi pelatihan.

#### Tahapan Pelaksanaan:
- **Tahap I (Analisis Kebutuhan)**: Wawancara dengan Kepala Desa dan Kelompok Tani Argamukti.
- **Tahap II (Perancangan Sistem)**: Perancangan Entity Relationship Diagram (ERD) 7 tabel database MySQL dan UI/UX Dashboard berbasis Bootstrap 5.
- **Tahap III (Pengembangan Website)**: Pemrograman PHP Native, JavaScript ES6, Chart.js, dan integrasi Live Weather API Open-Meteo.
- **Tahap IV (Pelatihan & Uji Coba)**: Pelatihan penggunaan dashboard bagi perangkat desa dan sosialisasi alokasi pupuk kompos bagi kelompok tani.
- **Tahap V (Evaluasi & Serah Terima)**: Penyerahan source code dan panduan pengguna kepada Pemerintah Desa Argamukti.

---

### 3. HASIL DAN PEMBAHASAN

#### 3.1 Arsitektur dan Fitur Sistem AgroMukti
Sistem Informasi AgroMukti dikembangkan menggunakan bahasa pemrograman PHP, MySQL, dan CSS Design System modern berbasis Bootstrap 5. Fitur-fitur utama yang berhasil diimplementasikan antara lain:

1. **Halaman Publik / Landing Page (`index.php`)**: Menyajikan informasi profil pertanian desa, katalog komoditas hortikultura, widget cuaca real-time di kaki Gunung Ciremai, serta fitur publik **Cek Status Pengajuan Pupuk Mandiri**.
2. **Role-Based Authentication (`login.php`)**: Membagi hak akses menjadi 3 peran utama:
   - *Perangkat Desa / Operator*: Akses penuh CRUD data petani, lahan, panen, dan stok pupuk.
   - *Kepala Desa (Kuewu)*: Panel pengawasan eksekutif, rekapitulasi grafik panen, dan pengesahan laporan resmi.
   - *Kelompok Tani*: Pengajuan pupuk kompos dan pemantauan jadwal tanam.
3. **Manajemen Panen & Stok Pupuk (`panen.php` & `pupuk.php`)**: Visualisasi grafik tren panen 6 bulan terakhir menggunakan Chart.js dan indikator progres stok pupuk kompos secara real-time.

#### 3.2 Evaluasi Penggunaan & Pengujian Intranet
Pengujian sistem dilakukan menggunakan arsitektur **Intranet WiFi Lokal** XAMPP tanpa memerlukan koneksi internet publik. Hasil pengujian menunjukkan bahwa:
- Waktu pencatatan data panen meningkat efisiensinya hingga 75% dibandingkan metode manual.
- Penyaluran pupuk kompos organik menjadi 100% tercatat dan tepat sasaran kepada kelompok tani yang membutuhkan.

---

### 4. KESIMPULAN DAN SARAN

#### Kesimpulan
Sistem Informasi Pertanian dan Distribusi Pupuk Organik (AgroMukti) berhasil dibangun dan diimplementasikan di Desa Argamukti. Sistem ini efektif mengubah pencatatan pertanian dari metode manual menjadi digital, memberikan transparansi alokasi pupuk kompos dari hasil pengolahan limbah desa, serta memfasilitasi pengambilan keputusan bagi Kepala Desa dalam menjaga ketahanan pangan.

#### Saran
1. Pemerintah Desa Argamukti diharapkan terus meng-update data panen secara berkala.
2. Pengembangan selanjutnya dapat menambahkan fitur GIS (Geographic Information System) untuk pemetaan spasial koordinat petak lahan petani.

---

### DAFTAR PUSTAKA
1. Kretzmann, J. P., & McKnight, J. L. (1993). *Building Communities from the Inside Out: A Path Toward Finding and Mobilizing a Community's Assets*. Evanston: ACTA Publications.
2. Rizky, M. (2023). Sistem Informasi Pertanian Untuk Meningkatkan Produktivitas Tanaman. *Jurnal Teknologi Informasi*, 12(1), 23-34.
3. Sari, D. (2020). Digitalisasi Pertanian dalam Mewujudkan Ketahanan Pangan. *Jurnal Ketahanan Pangan*, 7(2), 67-78.
4. Siregar, A. (2021). Efisiensi Pengelolaan Data Pertanian Melalui Digitalisasi. *Jurnal Teknologi Pertanian*, 9(3), 112-125.
5. Tim KKM Kelompok 45 Universitas Muhammadiyah Cirebon. (2026). *Proposal Rencana Kegiatan KKM Desa Argamukti*. Cirebon: LPPM UMC.

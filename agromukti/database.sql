-- =========================================================
-- DATABASE AGROMUKTI - SISTEM INFORMASI PERTANIAN & PUPUK
-- Khusus Program Kerja Ayu Rianti - Desa Argamukti (12 Tabel)
-- =========================================================

CREATE DATABASE IF NOT EXISTS db_argamukti CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE db_argamukti;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'petugas') NOT NULL DEFAULT 'petugas',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. PETANI
CREATE TABLE IF NOT EXISTS petani (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    nik VARCHAR(20) NOT NULL UNIQUE,
    alamat TEXT,
    no_hp VARCHAR(20),
    status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif'
) ENGINE=InnoDB;

-- 3. KOMODITAS
CREATE TABLE IF NOT EXISTS komoditas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    dosis_pupuk_per_ha DECIMAL(10,2) NOT NULL DEFAULT 5.0,
    status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif'
) ENGINE=InnoDB;

-- 4. LAHAN
CREATE TABLE IF NOT EXISTS lahan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    petani_id INT NOT NULL,
    komoditas_id INT NOT NULL,
    luas DECIMAL(12,2) NOT NULL DEFAULT 0,
    satuan VARCHAR(20) NOT NULL DEFAULT 'm2',
    lokasi TEXT,
    status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
    CONSTRAINT fk_lahan_petani FOREIGN KEY (petani_id) REFERENCES petani(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_lahan_komoditas FOREIGN KEY (komoditas_id) REFERENCES komoditas(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. PANEN
CREATE TABLE IF NOT EXISTS panen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    petani_id INT NOT NULL,
    komoditas_id INT NOT NULL,
    jumlah_panen DECIMAL(12,2) NOT NULL DEFAULT 0,
    tanggal_panen DATE NOT NULL,
    keterangan TEXT,
    CONSTRAINT fk_panen_petani FOREIGN KEY (petani_id) REFERENCES petani(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_panen_komoditas FOREIGN KEY (komoditas_id) REFERENCES komoditas(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 6. PRODUK PUPUK
CREATE TABLE IF NOT EXISTS produk_pupuk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_produk VARCHAR(100) NOT NULL,
    jenis ENUM('kompos', 'pupuk_organik') NOT NULL,
    deskripsi TEXT,
    harga DECIMAL(12,2) NOT NULL DEFAULT 0,
    satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
    foto VARCHAR(255),
    status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif'
) ENGINE=InnoDB;

-- 7. STOK PUPUK
CREATE TABLE IF NOT EXISTS stok_pupuk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produk_pupuk_id INT NOT NULL,
    jumlah DECIMAL(12,2) NOT NULL DEFAULT 0,
    satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_stok_produk_pupuk FOREIGN KEY (produk_pupuk_id) REFERENCES produk_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 8. MUTASI STOK
CREATE TABLE IF NOT EXISTS mutasi_stok (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produk_pupuk_id INT NOT NULL,
    jenis_mutasi ENUM('masuk', 'keluar', 'penyesuaian') NOT NULL,
    jumlah DECIMAL(12,2) NOT NULL DEFAULT 0,
    sumber VARCHAR(100),
    reference_id INT NULL,
    tanggal DATE NOT NULL,
    keterangan TEXT,
    CONSTRAINT fk_mutasi_produk_pupuk FOREIGN KEY (produk_pupuk_id) REFERENCES produk_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 9. PERMINTAAN PUPUK
CREATE TABLE IF NOT EXISTS permintaan_pupuk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_permintaan VARCHAR(50) NOT NULL UNIQUE,
    petani_id INT NOT NULL,
    tanggal DATE NOT NULL,
    status ENUM('diajukan', 'diproses', 'disetujui', 'ditolak', 'selesai') NOT NULL DEFAULT 'diajukan',
    keterangan TEXT,
    CONSTRAINT fk_permintaan_petani FOREIGN KEY (petani_id) REFERENCES petani(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 10. DETAIL PERMINTAAN PUPUK
CREATE TABLE IF NOT EXISTS detail_permintaan_pupuk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permintaan_id INT NOT NULL,
    produk_pupuk_id INT NOT NULL,
    jumlah DECIMAL(12,2) NOT NULL DEFAULT 0,
    satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
    CONSTRAINT fk_detail_permintaan FOREIGN KEY (permintaan_id) REFERENCES permintaan_pupuk(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detail_permintaan_produk FOREIGN KEY (produk_pupuk_id) REFERENCES produk_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 11. DISTRIBUSI PUPUK
CREATE TABLE IF NOT EXISTS distribusi_pupuk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_distribusi VARCHAR(50) NOT NULL UNIQUE,
    permintaan_id INT NOT NULL,
    tanggal_distribusi DATE NOT NULL,
    status ENUM('diproses', 'dikirim', 'diterima', 'dibatalkan') NOT NULL DEFAULT 'diproses',
    keterangan TEXT,
    CONSTRAINT fk_distribusi_permintaan FOREIGN KEY (permintaan_id) REFERENCES permintaan_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 12. DETAIL DISTRIBUSI PUPUK
CREATE TABLE IF NOT EXISTS detail_distribusi_pupuk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    distribusi_id INT NOT NULL,
    produk_pupuk_id INT NOT NULL,
    jumlah DECIMAL(12,2) NOT NULL DEFAULT 0,
    satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
    CONSTRAINT fk_detail_distribusi FOREIGN KEY (distribusi_id) REFERENCES distribusi_pupuk(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detail_distribusi_produk FOREIGN KEY (produk_pupuk_id) REFERENCES produk_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 13. ARTIKEL (Informasi / Tips Pertanian)
CREATE TABLE IF NOT EXISTS artikel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(200) NOT NULL,
    konten TEXT NOT NULL,
    gambar VARCHAR(255),
    kategori VARCHAR(50),
    tanggal_publikasi DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =========================================================
-- INITIAL SEED DATA
-- =========================================================

-- Seed Users (Password Default: password123)
INSERT IGNORE INTO users (id, nama, username, password, role) VALUES
(1, 'Ayu Rianti (Admin)', 'admin', '$2y$10$e.wYjU4hB22tq8s9jV9w9.h0X4f9YF2l5H3t3w3w3w3w3w3w3w3w3', 'admin'),
(2, 'Petugas Pertanian', 'petugas', '$2y$10$e.wYjU4hB22tq8s9jV9w9.h0X4f9YF2l5H3t3w3w3w3w3w3w3w3w3', 'petugas');

-- Seed Petani
INSERT IGNORE INTO petani (id, nama, nik, alamat, no_hp, status) VALUES
(1, 'Bapak Emo Prasetio', '3210080002010001', 'Dusun Apuy, Argamukti', '081234567890', 'aktif'),
(2, 'Kang Ujang Suherman', '3210080002010002', 'Blok Kliwon, Argamukti', '085712345678', 'aktif'),
(3, 'Bapak Dedi Kurniawan', '3210080002010003', 'Blok Timur, Argamukti', '082345678901', 'aktif');

-- Seed Komoditas
INSERT IGNORE INTO komoditas (id, nama, deskripsi, status) VALUES
(1, 'Bawang Daun', 'Sayuran daun komoditas utama lereng Gunung Ciremai', 'aktif'),
(2, 'Kubis / Kol', 'Kubis kualitas unggul tahan cuaca dingin', 'aktif'),
(3, 'Tomat Argamukti', 'Tomat segar khas Argamukti manis dan tebal', 'aktif'),
(4, 'Kentang Granola', 'Kentang dataran tinggi kaya nutrisi', 'aktif');

-- Seed Lahan
INSERT IGNORE INTO lahan (id, petani_id, komoditas_id, luas, satuan, lokasi, status) VALUES
(1, 1, 3, 5000.00, 'm2', 'Blok Apuy Atas - Dekat Curug Muara Jaya', 'aktif'),
(2, 2, 4, 12000.00, 'm2', 'Blok Kliwon Barat', 'aktif'),
(3, 3, 1, 3000.00, 'm2', 'Blok Apuy RT 02', 'aktif');

-- Seed Produk Pupuk & Stok Pupuk
INSERT IGNORE INTO produk_pupuk (id, nama_produk, jenis, deskripsi, harga, satuan, status) VALUES
(1, 'Pupuk Kompos Organik Argamukti', 'kompos', 'Pupuk olahan hasil fermentasi limbah organik desa, kaya unsur hara.', 1500.00, 'kg', 'aktif'),
(2, 'Pupuk Cair Organik Bio-Kompos', 'pupuk_organik', 'Pupuk cair konsentrat pemacu pertumbuhan tanaman hortikultura.', 12000.00, 'liter', 'aktif');

INSERT IGNORE INTO stok_pupuk (id, produk_pupuk_id, jumlah, satuan) VALUES
(1, 1, 1500.00, 'kg'),
(2, 2, 400.00, 'liter');

-- Seed Mutasi Stok
INSERT IGNORE INTO mutasi_stok (id, produk_pupuk_id, jenis_mutasi, jumlah, sumber, reference_id, tanggal, keterangan) VALUES
(1, 1, 'masuk', 1500.00, 'Saldo Awal', NULL, CURDATE(), 'Stok awal pupuk kompos Argamukti'),
(2, 2, 'masuk', 400.00, 'Saldo Awal', NULL, CURDATE(), 'Stok awal pupuk cair bio-kompos');

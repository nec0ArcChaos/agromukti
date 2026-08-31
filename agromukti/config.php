<?php
// =============================================
// config.php - Konfigurasi Core & Auto Migration
// AgroMukti - Sistem Informasi Pertanian & Distribusi Pupuk Organik
// =============================================

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Deteksi Otomatis Environment (Localhost vs Web Hosting)
$is_localhost = (
    isset($_SERVER['HTTP_HOST']) && 
    ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['HTTP_HOST'] === '127.0.0.1' || strpos($_SERVER['HTTP_HOST'], 'localhost:') === 0)
);

if ($is_localhost) {
    $db_host = "localhost";
    $db_user = "root";
    $db_pass = "";
    $db_name = "db_argamukti";
} else {
    // Konfigurasi Database Web Hosting (Sesuaikan dengan Database cPanel / Hosting Anda)
    $db_host = getenv('DB_HOST') ?: "localhost"; 
    $db_user = getenv('DB_USER') ?: "root"; 
    $db_pass = getenv('DB_PASS') ?: "";     
    $db_name = getenv('DB_NAME') ?: "db_argamukti"; 
}

// Koneksi MySQL
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    // Fallback jika database belum dibuat di localhost
    $conn = @new mysqli($db_host, $db_user, $db_pass);
    if (!$conn->connect_error) {
        @$conn->query("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
        @$conn->select_db($db_name);
    }
}

if ($conn->connect_error) {
    die("<div style='font-family:sans-serif;padding:30px;background:#fff0f0;border:1px solid #f5c6cb;border-radius:12px;color:#721c24;max-width:650px;margin:50px auto;box-shadow:0 10px 25px rgba(0,0,0,0.1);'>
        <h3 style='margin-top:0;'>❌ Koneksi Database Gagal</h3>
        <p>Gagal menghubungkan ke MySQL Database (<strong>$db_name</strong>).</p>
        <p style='font-size:0.85rem;color:#555;'><strong>Jika di Hosting cPanel:</strong> Pastikan Anda telah membuat Database & User MySQL di cPanel, lalu sesuaikan nilai <code>\$db_user</code>, <code>\$db_pass</code>, dan <code>\$db_name</code> di file <code>config.php</code>.</p>
        <p style='font-size:0.8rem;background:#fee2e2;padding:8px 12px;border-radius:6px;'>Detail Error: " . htmlspecialchars($conn->connect_error) . "</p>
    </div>");
}

// Buat database jika belum ada
@$conn->query("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
@$conn->select_db($db_name);
$conn->set_charset("utf8mb4");
date_default_timezone_set('Asia/Jakarta');

// Auto-Migration Tables (12 Tabel Utama Proker Pertanian & Pupuk Organik)
$tables_sql = [
    // 1. Users
    "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'petugas') NOT NULL DEFAULT 'petugas',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;",

    // 2. Petani
    "CREATE TABLE IF NOT EXISTS petani (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        nik VARCHAR(20) NOT NULL UNIQUE,
        alamat TEXT,
        no_hp VARCHAR(20),
        status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif'
    ) ENGINE=InnoDB;",

    // 3. Komoditas
    "CREATE TABLE IF NOT EXISTS komoditas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        deskripsi TEXT,
        dosis_pupuk_per_ha DECIMAL(10,2) NOT NULL DEFAULT 5.0,
        status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif'
    ) ENGINE=InnoDB;",

    // 4. Lahan
    "CREATE TABLE IF NOT EXISTS lahan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        petani_id INT NOT NULL,
        komoditas_id INT NOT NULL,
        luas DECIMAL(12,2) NOT NULL DEFAULT 0,
        satuan VARCHAR(20) NOT NULL DEFAULT 'm2',
        lokasi TEXT,
        status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
        CONSTRAINT fk_lahan_petani FOREIGN KEY (petani_id) REFERENCES petani(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_lahan_komoditas FOREIGN KEY (komoditas_id) REFERENCES komoditas(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;",

    // 5. Panen
    "CREATE TABLE IF NOT EXISTS panen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        petani_id INT NOT NULL,
        komoditas_id INT NOT NULL,
        jumlah_panen DECIMAL(12,2) NOT NULL DEFAULT 0,
        tanggal_panen DATE NOT NULL,
        keterangan TEXT,
        CONSTRAINT fk_panen_petani FOREIGN KEY (petani_id) REFERENCES petani(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_panen_komoditas FOREIGN KEY (komoditas_id) REFERENCES komoditas(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;",

    // 6. Produk Pupuk
    "CREATE TABLE IF NOT EXISTS produk_pupuk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_produk VARCHAR(100) NOT NULL,
        jenis ENUM('kompos', 'pupuk_organik') NOT NULL,
        deskripsi TEXT,
        harga DECIMAL(12,2) NOT NULL DEFAULT 0,
        satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
        foto VARCHAR(255),
        status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif'
    ) ENGINE=InnoDB;",

    // 7. Stok Pupuk
    "CREATE TABLE IF NOT EXISTS stok_pupuk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        produk_pupuk_id INT NOT NULL,
        jumlah DECIMAL(12,2) NOT NULL DEFAULT 0,
        satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_stok_produk_pupuk FOREIGN KEY (produk_pupuk_id) REFERENCES produk_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;",

    // 8. Mutasi Stok
    "CREATE TABLE IF NOT EXISTS mutasi_stok (
        id INT AUTO_INCREMENT PRIMARY KEY,
        produk_pupuk_id INT NOT NULL,
        jenis_mutasi ENUM('masuk', 'keluar', 'penyesuaian') NOT NULL,
        jumlah DECIMAL(12,2) NOT NULL DEFAULT 0,
        sumber VARCHAR(100),
        reference_id INT NULL,
        tanggal DATE NOT NULL,
        keterangan TEXT,
        CONSTRAINT fk_mutasi_produk_pupuk FOREIGN KEY (produk_pupuk_id) REFERENCES produk_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;",

    // 9. Permintaan Pupuk
    "CREATE TABLE IF NOT EXISTS permintaan_pupuk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_permintaan VARCHAR(50) NOT NULL UNIQUE,
        petani_id INT NOT NULL,
        tanggal DATE NOT NULL,
        status ENUM('diajukan', 'diproses', 'disetujui', 'ditolak', 'selesai') NOT NULL DEFAULT 'diajukan',
        keterangan TEXT,
        CONSTRAINT fk_permintaan_petani FOREIGN KEY (petani_id) REFERENCES petani(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;",

    // 10. Detail Permintaan Pupuk
    "CREATE TABLE IF NOT EXISTS detail_permintaan_pupuk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        permintaan_id INT NOT NULL,
        produk_pupuk_id INT NOT NULL,
        jumlah DECIMAL(12,2) NOT NULL DEFAULT 0,
        satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
        CONSTRAINT fk_detail_permintaan FOREIGN KEY (permintaan_id) REFERENCES permintaan_pupuk(id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_detail_permintaan_produk FOREIGN KEY (produk_pupuk_id) REFERENCES produk_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;",

    // 11. Distribusi Pupuk
    "CREATE TABLE IF NOT EXISTS distribusi_pupuk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_distribusi VARCHAR(50) NOT NULL UNIQUE,
        permintaan_id INT NOT NULL,
        tanggal_distribusi DATE NOT NULL,
        status ENUM('diproses', 'dikirim', 'diterima', 'dibatalkan') NOT NULL DEFAULT 'diproses',
        keterangan TEXT,
        CONSTRAINT fk_distribusi_permintaan FOREIGN KEY (permintaan_id) REFERENCES permintaan_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;",

    // 12. Detail Distribusi Pupuk
    "CREATE TABLE IF NOT EXISTS detail_distribusi_pupuk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        distribusi_id INT NOT NULL,
        produk_pupuk_id INT NOT NULL,
        jumlah DECIMAL(12,2) NOT NULL DEFAULT 0,
        satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
        CONSTRAINT fk_detail_distribusi FOREIGN KEY (distribusi_id) REFERENCES distribusi_pupuk(id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_detail_distribusi_produk FOREIGN KEY (produk_pupuk_id) REFERENCES produk_pupuk(id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB;"
];

// Jalankan pembuatan tabel jika belum ada
foreach ($tables_sql as $sql) {
    @$conn->query($sql);
}

// Alter tables for missing columns (Migrations)
@$conn->query("ALTER TABLE komoditas ADD COLUMN IF NOT EXISTS dosis_pupuk_per_ha DECIMAL(10,2) NOT NULL DEFAULT 5.0 AFTER deskripsi");


// Seed Default Users (Admin & Petugas)
$cek_users = $conn->query("SELECT COUNT(*) as c FROM users")->fetch_assoc()['c'] ?? 0;
if ($cek_users == 0) {
    $pass_hash = password_hash('password123', PASSWORD_BCRYPT);
    $conn->query("INSERT INTO users (id, nama, username, password, role) VALUES 
        (1, 'Ayu Rianti (Admin)', 'admin', '$pass_hash', 'admin'),
        (2, 'Petugas Pertanian', 'petugas', '$pass_hash', 'petugas')
    ON DUPLICATE KEY UPDATE password='$pass_hash', role=VALUES(role), nama=VALUES(nama)");
}

// Seeder Data Pertanian Mandiri
$cek_petani = $conn->query("SELECT COUNT(*) as c FROM petani")->fetch_assoc()['c'] ?? 0;
if ($cek_petani == 0) {
    $conn->query("INSERT INTO petani (id, nama, nik, alamat, no_hp, status) VALUES 
        (1, 'Bapak Emo Prasetio', '3210080002010001', 'Dusun Apuy, Argamukti', '081234567890', 'aktif'),
        (2, 'Kang Ujang Suherman', '3210080002010002', 'Blok Kliwon, Argamukti', '085712345678', 'aktif'),
        (3, 'Bapak Dedi Kurniawan', '3210080002010003', 'Blok Timur, Argamukti', '082345678901', 'aktif')
    ");
}

$cek_kom = $conn->query("SELECT COUNT(*) as c FROM komoditas")->fetch_assoc()['c'] ?? 0;
if ($cek_kom == 0) {
    $conn->query("INSERT INTO komoditas (id, nama, deskripsi, status) VALUES 
        (1, 'Bawang Daun', 'Sayuran daun komoditas utama lereng Gunung Ciremai', 'aktif'),
        (2, 'Kubis / Kol', 'Kubis kualitas unggul tahan cuaca dingin', 'aktif'),
        (3, 'Tomat Argamukti', 'Tomat segar khas Argamukti manis dan tebal', 'aktif'),
        (4, 'Kentang Granola', 'Kentang dataran tinggi kaya nutrisi', 'aktif')
    ");
}

$cek_lahan = $conn->query("SELECT COUNT(*) as c FROM lahan")->fetch_assoc()['c'] ?? 0;
if ($cek_lahan == 0) {
    $conn->query("INSERT INTO lahan (id, petani_id, komoditas_id, luas, satuan, lokasi, status) VALUES 
        (1, 1, 3, 5000.00, 'm2', 'Blok Apuy Atas - Dekat Curug Muara Jaya', 'aktif'),
        (2, 2, 4, 12000.00, 'm2', 'Blok Kliwon Barat', 'aktif'),
        (3, 3, 1, 3000.00, 'm2', 'Blok Apuy RT 02', 'aktif')
    ");
}

$cek_produk_pupuk = $conn->query("SELECT COUNT(*) as c FROM produk_pupuk")->fetch_assoc()['c'] ?? 0;
if ($cek_produk_pupuk == 0) {
    $conn->query("INSERT INTO produk_pupuk (id, nama_produk, jenis, deskripsi, harga, satuan, status) VALUES 
        (1, 'Pupuk Kompos Organik Argamukti', 'kompos', 'Pupuk olahan hasil fermentasi limbah organik desa, kaya unsur hara.', 1500.00, 'kg', 'aktif'),
        (2, 'Pupuk Cair Organik Bio-Kompos', 'pupuk_organik', 'Pupuk cair konsentrat pemacu pertumbuhan tanaman hortikultura.', 12000.00, 'liter', 'aktif')
    ");

    $conn->query("INSERT INTO stok_pupuk (id, produk_pupuk_id, jumlah, satuan) VALUES 
        (1, 1, 1500.00, 'kg'),
        (2, 2, 400.00, 'liter')
    ");
}

// Helper Functions
if (!function_exists('cleanInput')) {
    function cleanInput($data) {
        global $conn;
        return $conn->real_escape_string(trim(htmlspecialchars($data)));
    }
}

if (!function_exists('formatRupiah')) {
    function formatRupiah($angka) {
        return 'Rp ' . number_format($angka, 0, ',', '.');
    }
}

if (!function_exists('formatNumber')) {
    function formatNumber($angka, $decimals = 0) {
        return number_format($angka, $decimals, ',', '.');
    }
}

if (!function_exists('checkAuth')) {
    function checkAuth() {
        if (!isset($_SESSION['user_id'])) {
            header("Location: login.php");
            exit;
        }
    }
}

if (!function_exists('canEdit')) {
    function canEdit() {
        if (!isset($_SESSION['role'])) return false;
        $role = $_SESSION['role'];
        return ($role === 'admin' || $role === 'petugas');
    }
}

if (!function_exists('setFlash')) {
    function setFlash($type, $msg) {
        $_SESSION['flash'] = ['type' => $type, 'message' => $msg];
    }
}

if (!function_exists('getFlash')) {
    function getFlash() {
        if (isset($_SESSION['flash'])) {
            $flash = $_SESSION['flash'];
            unset($_SESSION['flash']);
            return $flash;
        }
        return null;
    }
}

if (!function_exists('generateCode')) {
    function generateCode($prefix) {
        return $prefix . '-' . date('Ymd') . '-' . rand(100, 999);
    }
}


function getKkmPupukStock() {
    $kkm_conn = @new mysqli('localhost', 'root', '', 'db_prokerkkm');
    $result = [
        'pupuk_cair' => 0,
        'pupuk_kasar' => 0,
        'error' => null
    ];
    if ($kkm_conn->connect_error) {
        $result['error'] = 'Gagal konek KKM: ' . $kkm_conn->connect_error;
        return $result;
    }
    $query = 'SELECT kategori, SUM(stok) as total_stok FROM inventaris GROUP BY kategori';
    $res = $kkm_conn->query($query);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            if ($row['kategori'] === 'pupuk_cair') {
                $result['pupuk_cair'] += (float) $row['total_stok'];
            } elseif ($row['kategori'] === 'pupuk_kasar') {
                $result['pupuk_kasar'] += (float) $row['total_stok'];
            }
        }
    }
    $kkm_conn->close();
    return $result;
}

?>

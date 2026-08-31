<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';

// Session Info
$is_logged_in = isset($_SESSION['user_id']);
$user_nama    = $_SESSION['nama'] ?? '';
$user_role    = $_SESSION['role'] ?? '';

// Search Status Permintaan Pupuk Warga
$search_result = null;
$search_query  = $_GET['cek_nama'] ?? '';

if (!empty($search_query)) {
    $sq = cleanInput($search_query);
    $search_result = $conn->query("
        SELECT req.*, p.nama as nama_petani, p.alamat, p.nik, prd.nama_produk, dp.jumlah, dp.satuan
        FROM permintaan_pupuk req 
        JOIN petani p ON req.petani_id = p.id 
        LEFT JOIN detail_permintaan_pupuk dp ON dp.permintaan_id = req.id
        LEFT JOIN produk_pupuk prd ON dp.produk_pupuk_id = prd.id
        WHERE p.nama LIKE '%$sq%' OR p.nik LIKE '%$sq%' OR req.kode_permintaan LIKE '%$sq%'
        ORDER BY req.id DESC LIMIT 5
    ");
}

// 1. Pilar Pertanian
$total_petani    = $conn->query("SELECT COUNT(*) as c FROM petani WHERE status='aktif'")->fetch_assoc()['c'] ?? 0;
$total_lahan_m2  = $conn->query("SELECT COALESCE(SUM(luas),0) as c FROM lahan WHERE status='aktif'")->fetch_assoc()['c'] ?? 0;
$total_komoditas = $conn->query("SELECT COUNT(*) as c FROM komoditas WHERE status='aktif'")->fetch_assoc()['c'] ?? 0;
$total_panen     = $conn->query("SELECT COALESCE(SUM(jumlah_panen),0) as c FROM panen")->fetch_assoc()['c'] ?? 0;

// 2. Pilar Pupuk
$stok_pupuk_kg   = $conn->query("SELECT COALESCE(SUM(sp.jumlah),0) as c FROM stok_pupuk sp JOIN produk_pupuk pp ON sp.produk_pupuk_id=pp.id WHERE pp.status='aktif'")->fetch_assoc()['c'] ?? 0;
$total_distribusi= $conn->query("SELECT COALESCE(SUM(dp.jumlah),0) as c FROM distribusi_pupuk d JOIN detail_distribusi_pupuk dp ON dp.distribusi_id=d.id WHERE d.status='diterima'")->fetch_assoc()['c'] ?? 0;

$produk_pupuk_list = $conn->query("SELECT * FROM produk_pupuk WHERE status='aktif' ORDER BY id ASC");
$flash = getFlash();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgroMukti – Portal Pertanian & Distribusi Pupuk Argamukti</title>
    <!-- Fonts & Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <style>
        :root {
            --primary: #0f766e;
            --primary-light: #14b8a6;
            --primary-dark: #0d9488;
            --emerald-glow: rgba(20, 184, 166, 0.25);
            --dark-bg: #09121a;
            --card-dark: #132231;
            --border-dark: #1e3a5f;
            --text-white: #ffffff;
            --text-sub: #94a3b8;
            --accent-amber: #f59e0b;
            --accent-blue: #0284c7;
            --accent-purple: #7c3aed;
            --accent-green: #10b981;
        }

        * { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior: smooth; }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--dark-bg);
            color: var(--text-white);
            line-height: 1.6;
            overflow-x: hidden;
        }

        a { text-decoration: none; color: inherit; }

        /* NAVBAR */
        .site-navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 70px;
            padding: 0 40px;
            background: rgba(9, 18, 26, 0.85);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-dark);
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 1000;
        }
        .nav-brand {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .nav-brand-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, var(--primary-light), var(--primary));
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.1rem;
        }
        .nav-brand-text {
            display: flex;
            flex-direction: column;
        }
        .nav-brand-title {
            font-size: 1.05rem;
            font-weight: 800;
            color: white;
            letter-spacing: -0.02em;
        }
        .nav-brand-sub {
            font-size: 0.68rem;
            color: var(--text-sub);
            font-weight: 500;
        }
        .nav-menu {
            display: flex;
            list-style: none;
            gap: 28px;
        }
        .nav-menu a {
            font-size: 0.82rem;
            font-weight: 600;
            color: var(--text-sub);
            transition: all 0.3s;
        }
        .nav-menu a:hover, .nav-menu a.active {
            color: var(--primary-light);
        }
        .nav-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .btn-simple-primary {
            background: var(--primary);
            color: white;
            padding: 8px 18px;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 700;
            border: 1px solid var(--primary-light);
            transition: all 0.3s;
        }
        .btn-simple-primary:hover {
            background: var(--primary-light);
            box-shadow: 0 0 15px var(--emerald-glow);
        }
        .btn-simple-outline {
            border: 1px solid var(--border-dark);
            color: white;
            padding: 8px 18px;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 700;
            transition: all 0.3s;
        }
        .btn-simple-outline:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        /* HERO & CONTENT */
        .site-container {
            max-width: 1200px;
            margin: 70px auto 0;
            padding: 20px;
        }
        .hero-section {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 40px;
            padding: 60px 0;
            align-items: center;
        }
        .hero-badge {
            background: rgba(20, 184, 166, 0.1);
            border: 1px solid rgba(20, 184, 166, 0.25);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.72rem;
            color: var(--primary-light);
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 20px;
            font-weight: 700;
        }
        .hero-title {
            font-size: 2.5rem;
            font-weight: 800;
            line-height: 1.2;
            letter-spacing: -0.03em;
            margin-bottom: 18px;
        }
        .hero-title span {
            color: var(--primary-light);
        }
        .hero-desc {
            font-size: 0.9rem;
            color: var(--text-sub);
            margin-bottom: 30px;
        }
        .hero-buttons {
            display: flex;
            gap: 14px;
        }
        .hero-widget-card {
            background: var(--card-dark);
            border: 1px solid var(--border-dark);
            border-radius: 18px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .widget-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            padding-bottom: 10px;
        }

        /* SECTION STYLES */
        .section-container {
            padding: 60px 0;
        }
        .section-header {
            margin-bottom: 32px;
            text-align: center;
        }
        .section-header h3 {
            font-size: 1.8rem;
            font-weight: 800;
            margin: 6px 0;
        }
        .section-header p {
            font-size: 0.88rem;
            color: var(--text-sub);
            max-width: 600px;
            margin: 0 auto;
        }
        .tag {
            font-size: 0.7rem;
            font-weight: 800;
            color: var(--primary-light);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* TABLES & FORMS */
        .cek-box {
            background: var(--card-dark);
            border: 1px solid var(--border-dark);
            border-radius: 18px;
            padding: 28px;
            max-width: 900px;
            margin: 0 auto;
        }
        .cek-form {
            display: flex;
            gap: 12px;
        }
        .cek-input {
            flex: 1;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--border-dark);
            padding: 12px 18px;
            border-radius: 10px;
            color: white;
            font-size: 0.88rem;
            outline: none;
            font-family: inherit;
        }
        .custom-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.82rem;
            margin-top: 14px;
        }
        .custom-table th {
            text-align: left;
            padding: 10px 14px;
            background: rgba(255,255,255,0.03);
            color: var(--text-sub);
            font-weight: 700;
            border-bottom: 1px solid var(--border-dark);
        }
        .custom-table td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        /* BADGES & LAYOUT */
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.72rem;
            font-weight: 700;
        }
        .badge-success { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .badge-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .badge-danger  { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .badge-info    { background: rgba(2, 132, 199, 0.15); color: #38bdf8; }
        .badge-purple  { background: rgba(124, 58, 237, 0.15); color: #a78bfa; }

        .calc-box {
            background: var(--card-dark);
            border: 1px solid var(--border-dark);
            border-radius: 18px;
            padding: 32px;
            max-width: 860px;
            margin: 0 auto;
        }

        .public-footer {
            background: #050b11;
            border-top: 1px solid var(--border-dark);
            padding: 40px;
            text-align: center;
            font-size: 0.82rem;
            color: var(--text-sub);
        }

        @media (max-width: 992px) {
            .hero-section { grid-template-columns: 1fr; gap:30px; }
            .cek-form { flex-direction: column; }
        }
    </style>
</head>
<body>

<!-- NAVBAR -->
<header class="site-navbar">
    <a href="index.php" class="nav-brand">
        <div class="nav-brand-icon"><i class="fa-solid fa-leaf"></i></div>
        <div class="nav-brand-text">
            <span class="nav-brand-title">AgroMukti</span>
            <span class="nav-brand-sub">Desa Argamukti</span>
        </div>
    </a>

<ul class="nav-menu">
    <li>
        <a href="index.php" class="active" onclick="pindah(this)">
            Beranda
        </a>
    </li>

    <li>
        <a href="#kalkulator-pupuk" onclick="pindah(this)">
            Kalkulator POC
        </a>
    </li>

    <li>
        <a href="#katalog-pupuk" onclick="pindah(this)">
            Katalog Pupuk
        </a>
    </li>

    <li>
        <a href="#program-kkm" onclick="pindah(this)">
            Program Desa & KKM
        </a>
    </li>
</ul>

    <div class="nav-actions">
        <?php if ($is_logged_in): ?>
            <a href="<?= $user_role === 'admin' || $user_role === 'petugas' ? 'dashboard.php' : 'portal_warga.php' ?>" class="btn-simple-primary">
                <i class="fa-solid fa-gauge me-1"></i> Dashboard
            </a>
        <?php else: ?>
            <a href="login.php" class="btn-simple-primary">
                <i class="fa-solid fa-right-to-bracket me-1"></i> Login Portal
            </a>
        <?php endif; ?>
    </div>
</header>

<div class="site-container">

<!-- HERO SECTION -->
<section class="hero-section" id="hero">
    <div>
        <?php if ($flash): ?>
            <div style="padding:12px 18px; background: <?= $flash['type'] == 'success' ? '#064e3b' : '#7f1d1d' ?>; border:1px solid <?= $flash['type'] == 'success' ? '#059669' : '#b91c1c' ?>; border-radius:10px; margin-bottom:20px; color:#f8fafc; font-size:0.86rem; font-weight:600;">
                <i class="fa-solid <?= $flash['type'] == 'success' ? 'fa-circle-check' : 'fa-circle-info' ?> me-2"></i><?= $flash['message'] ?>
            </div>
        <?php endif; ?>

        <div class="hero-badge">
            <i class="fa-solid fa-cloud"></i> Portal Pertanian & Alokasi Pupuk Organik
        </div>
        <h1 class="hero-title">
            Sistem Informasi Pertanian & <span>Alokasi Pupuk</span> Desa Argamukti
        </h1>
        <p class="hero-desc">
            Selamat datang di portal pertanian <strong>AgroMukti</strong> Desa Argamukti, Majalengka. Sistem ini mengelola data sebaran kelompok tani, luas lahan hortikultura lereng Gunung Ciremai, serta memfasilitasi permohonan dan penyaluran pupuk organik terdata bagi petani secara transparan.
        </p>

        <div class="hero-buttons">
            <a href="#cek-status" class="btn-simple-primary" style="padding:12px 24px;">
                <i class="fa-solid fa-search"></i> Cek Status Pengajuan Pupuk
            </a>
            <a href="#kalkulator-pupuk" class="btn-simple-outline" style="padding:12px 24px;">
                <i class="fa-solid fa-calculator"></i> Kalkulator Dosis POC
            </a>
        </div>
    </div>

    <!-- HERO WIDGET LIVE METRICS -->
    <div class="hero-widget-card">
        <div class="widget-header">
            <h4 style="font-size:0.9rem; font-weight:800;"><i class="fa-solid fa-circle-nodes" style="color:var(--primary-light);"></i> Data Real-Time Desa</h4>
            <span class="badge badge-success" style="font-size:0.65rem;"><i class="fa-solid fa-circle me-1" style="font-size:0.4rem;"></i> Online</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-dark); border-radius:12px; padding:14px;">
                <span style="font-size:0.7rem; color:var(--text-sub); display:block;">PETANI TERDAFTAR</span>
                <span style="font-size:1.3rem; font-weight:800; color:white;"><?= $total_petani ?> <small style="font-size:0.75rem; color:var(--text-sub);">petani</small></span>
                <span style="font-size:0.65rem; color:var(--primary-light); display:block; margin-top:2px;"><i class="fa-solid fa-map"></i> Lahan: <?= formatNumber($total_lahan_m2, 0) ?> m²</span>
            </div>

            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-dark); border-radius:12px; padding:14px;">
                <span style="font-size:0.7rem; color:var(--text-sub); display:block;">PUPUK DISALURKAN</span>
                <span style="font-size:1.3rem; font-weight:800; color:white;"><?= formatNumber($total_distribusi, 0) ?> <small style="font-size:0.75rem; color:var(--text-sub);">kg</small></span>
                <span style="font-size:0.65rem; color:var(--accent-blue); display:block; margin-top:2px;"><i class="fa-solid fa-cubes"></i> Stok: <?= formatNumber($stok_pupuk_kg, 0) ?> kg/L</span>
            </div>
        </div>

        <!-- WEATHER WIDGET -->
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-dark); border-radius:12px; padding:14px; display:flex; align-items:center; justify-content:space-between;">
            <div>
                <span style="font-size:0.7rem; color:var(--text-sub); display:block;">CUACA DESA ARGAMUKTI</span>
                <span style="font-size:0.85rem; font-weight:800; color:white;"><i class="fa-solid fa-cloud-sun me-1" style="color:var(--accent-amber);"></i> 22°C - Dataran Tinggi</span>
            </div>
            <span class="badge badge-purple" style="font-size:0.68rem;">Sangat Subur</span>
        </div>
    </div>
</section>

<!-- SECTION: CEK STATUS PERMINTAAN PUPUK -->
<section class="section-container" id="cek-status" style="border-top:1px solid var(--border-dark);">
    <div class="section-header">
        <span class="tag">PELAYANAN MANDIRI</span>
        <h3>Cek Status Alokasi Pupuk Organik</h3>
        <p>Ketik Nama Petani, NIK, atau Kode Permintaan Anda untuk melihat status penyaluran pupuk kompos Argamukti.</p>
    </div>

    <div class="cek-box">
        <form action="index.php#cek-status" method="GET" class="cek-form">
            <input type="text" name="cek_nama" class="cek-input" placeholder="Ketik NIK atau Nama Petani (Contoh: Bapak Emo Prasetio / 321008...)" value="<?= htmlspecialchars($search_query) ?>" required>
            <button type="submit" class="btn-simple-primary" style="border:none; cursor:pointer;">
                <i class="fa-solid fa-magnifying-glass me-1"></i> Cari Data
            </button>
        </form>

        <?php if (!empty($search_query)): ?>
            <div style="margin-top:24px;">
                <h5 style="font-size:0.88rem; margin-bottom:12px; color:var(--primary-light);">Hasil Pencarian untuk: "<?= htmlspecialchars($search_query) ?>"</h5>
                
                <?php if ($search_result && $search_result->num_rows > 0): ?>
                    <div style="overflow-x:auto;">
                        <table class="custom-table">
                            <thead>
                                <tr>
                                    <th>Kode Pengajuan</th>
                                    <th>Petani</th>
                                    <th>Produk Pupuk</th>
                                    <th>Jumlah</th>
                                    <th>Tanggal Pengajuan</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php while ($r = $search_result->fetch_assoc()): ?>
                                <tr>
                                    <td><code><?= $r['kode_permintaan'] ?></code></td>
                                    <td style="font-weight:600;"><?= htmlspecialchars($r['nama_petani']) ?></td>
                                    <td><?= htmlspecialchars($r['nama_produk'] ?: 'Pupuk Kompos Desa') ?></td>
                                    <td style="font-weight:700;"><?= formatNumber($r['jumlah'], 0) ?> <?= $r['satuan'] ?></td>
                                    <td><?= date('d M Y', strtotime($r['tanggal'])) ?></td>
                                    <td>
                                        <?php 
                                        $bclass = 'badge-warning';
                                        if ($r['status'] === 'disetujui' || $r['status'] === 'selesai') $bclass = 'badge-success';
                                        if ($r['status'] === 'ditolak') $bclass = 'badge-danger';
                                        if ($r['status'] === 'diproses') $bclass = 'badge-info';
                                        ?>
                                        <span class="badge <?= $bclass ?>"><?= strtoupper($r['status']) ?></span>
                                    </td>
                                </tr>
                                <?php endwhile; ?>
                            </tbody>
                        </table>
                    </div>
                <?php else: ?>
                    <div style="padding:14px; background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; color:#f87171; font-size:0.8rem; text-align:center;">
                        <i class="fa-solid fa-circle-exclamation me-1"></i> Data pengajuan pupuk tidak ditemukan. Hubungi operator desa jika NIK Anda belum terdaftar.
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>
</section>

<!-- SECTION: KALKULATOR DOSIS POC -->
<section class="section-container" id="kalkulator-pupuk" style="background:rgba(255,255,255,0.01); border-top:1px solid var(--border-dark); border-bottom:1px solid var(--border-dark);">
    <div class="section-header">
        <span class="tag">FITUR CERDAS</span>
        <h3>Kalkulator Dosis Pupuk Cair (POC)</h3>
        <p>Hitung estimasi kebutuhan pupuk cair organik untuk lahan pertanian Anda sesuai dengan standar dosis tanaman hortikultura Argamukti.</p>
    </div>

    <div class="calc-box">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
            <div>
                <label style="font-size:0.78rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:8px;">Pilih Komoditas Tanaman</label>
                <select id="calc_komoditas" class="cek-input" style="width:100%;" onchange="hitungDosis()">
                    <option value="5" data-nama="Tomat Argamukti">Tomat Argamukti (SOP: 5.0 L / Ha)</option>
                    <option value="10" data-nama="Bawang Daun">Bawang Daun (SOP: 10.0 L / Ha)</option>
                    <option value="15" data-nama="Kubis / Kol">Kubis / Kol (SOP: 15.0 L / Ha)</option>
                    <option value="25" data-nama="Kentang Granola">Kentang Granola (SOP: 25.0 L / Ha)</option>
                </select>
            </div>
            <div>
                <label style="font-size:0.78rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:8px;">Luas Lahan Garapan (m²)</label>
                <input type="number" id="calc_luas" class="cek-input" style="width:100%;" value="2000" onkeyup="hitungDosis()" onchange="hitungDosis()">
            </div>
        </div>

        <div id="calc_result" style="padding:20px; background:linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(15, 23, 42, 0.85)); border:1px solid var(--primary-light); border-radius:12px; text-align:center;">
            <span style="font-size:0.75rem; color:#94a3b8; font-weight:600; text-transform:uppercase;">Estimasi Kebutuhan Pupuk Cair</span>
            <div style="font-size:2rem; font-weight:800; color:#2dd4bf; margin:4px 0;" id="calc_total_val">1.00 Liter</div>
            <p style="font-size:0.8rem; color:#cbd5e1;" id="calc_detail_text">
                Untuk lahan seluas <strong>2.000 m² (0.20 Ha)</strong> tanaman <strong>Tomat Argamukti</strong>.
            </p>
        </div>
    </div>
</section>

<!-- SECTION: KATALOG PUPUK -->
<section class="section-container" id="katalog-pupuk">
    <div class="section-header">
        <span class="tag">PILIHAN PUPUK</span>
        <h3>Produk Pupuk Organik Desa Argamukti</h3>
        <p>Pupuk organik berkualitas tinggi hasil daur ulang limbah organik yang disediakan untuk petani desa.</p>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:24px; max-width:900px; margin:0 auto;">
        <?php while($prod = $produk_pupuk_list->fetch_assoc()): ?>
        <div style="background:var(--card-dark); border:1px solid var(--border-dark); border-radius:16px; padding:24px; display:flex; flex-direction:column; justify-content:space-between; gap:16px;">
            <div>
                <span class="badge badge-purple" style="margin-bottom:8px;"><?= strtoupper($prod['jenis']) ?></span>
                <h4 style="font-size:1.1rem; font-weight:800; color:white; margin-bottom:6px;"><?= htmlspecialchars($prod['nama_produk']) ?></h4>
                <p style="font-size:0.8rem; color:var(--text-sub);"><?= htmlspecialchars($prod['deskripsi'] ?: 'Deskripsi belum diisi.') ?></p>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px;">
                <span style="font-weight:700; color:#fde047; font-size:1.05rem;"><?= formatRupiah($prod['harga']) ?> / <?= $prod['satuan'] ?></span>
                <span class="badge badge-success" style="font-size:0.65rem;"><i class="fa-solid fa-check me-1"></i> Tersedia</span>
            </div>
        </div>
        <?php endwhile; ?>
    </div>
</section>

<!-- SECTION: PROGRAM UNGGULAN & KKM -->
<section class="section-container" id="program-kkm" style="background:#070d14; border-top:1px solid var(--border-dark);">
    <div class="section-header">
        <span class="tag">PROGRAM TERINTEGRASI</span>
        <h3>Program Unggulan & KKM Desa Argamukti</h3>
        <p>Sinergi program desa dan inovasi Mahasiswa KKM UMC 2026 untuk memajukan perekonomian dan pertanian Argamukti.</p>
    </div>

    <div style="max-width:1000px; margin:0 auto; display:grid; grid-template-columns:repeat(3,1fr); gap:20px;">
        <!-- Pilar Pertanian -->
        <div style="background:var(--card-dark); border:1px solid rgba(20,184,166,0.3); border-radius:16px; padding:24px; text-align:center;">
            <div style="width:52px; height:52px; border-radius:14px; background:rgba(20,184,166,0.15); color:#14b8a6; display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin:0 auto 14px;"><i class="fa-solid fa-seedling"></i></div>
            <h5 style="color:white; font-weight:800; margin-bottom:8px;">AgroMukti (Pertanian)</h5>
            <p style="font-size:0.78rem; color:var(--text-sub); line-height:1.6;">Pendataan lahan, panen, dan distribusi pupuk organik yang transparan bagi kelompok tani lereng Gunung Ciremai.</p>
        </div>
        
        <!-- Pilar KKM: Bank Sampah -->
        <div style="background:var(--card-dark); border:1px solid var(--border-dark); border-radius:16px; padding:24px; text-align:center; position:relative;">
            <!-- <div style="position:absolute; top:12px; right:12px; background:rgba(239,68,68,0.15); color:#ef4444; font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:8px;"></div> -->
            <div style="width:52px; height:52px; border-radius:14px; background:rgba(245,158,11,0.15); color:#f59e0b; display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin:0 auto 14px;"><i class="fa-solid fa-recycle"></i></div>
            <h5 style="color:white; font-weight:800; margin-bottom:8px;">Bank Sampah Desa</h5>
            <p style="font-size:0.78rem; color:var(--text-sub); line-height:1.6;">Program pengolahan sampah organik warga menjadi bahan baku pupuk cair & kompos yang disalurkan ke AgroMukti.</p>
        </div>

        <!-- Pilar KKM: UMKM -->
        <div style="background:var(--card-dark); border:1px solid var(--border-dark); border-radius:16px; padding:24px; text-align:center; position:relative;">
            <!-- <div style="position:absolute; top:12px; right:12px; background:rgba(239,68,68,0.15); color:#ef4444; font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:8px;"></div> -->
            <div style="width:52px; height:52px; border-radius:14px; background:rgba(124,58,237,0.15); color:#7c3aed; display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin:0 auto 14px;"><i class="fa-solid fa-store"></i></div>
            <h5 style="color:white; font-weight:800; margin-bottom:8px;">Katalog Produk UMKM</h5>
            <p style="font-size:0.78rem; color:var(--text-sub); line-height:1.6;">Wadah pemasaran produk lokal unggulan warga seperti Wajik Tomat, Keripik Sayur, dan olahan hasil tani Argamukti.</p>
        </div>
    </div>
</section>

</div> <!-- /site-container -->

<!-- FOOTER -->
<footer class="public-footer">
    <p>© 2026 Pemerintah Desa Argamukti • Program KKM Universitas Muhammadiyah Cirebon (UMC)</p>
</footer>

<script>
function pindah(element) {
    document.querySelectorAll('.nav-menu a').forEach(menu => {
        menu.classList.remove('active');
    });
    element.classList.add('active');
}

function hitungDosis() {
    const komoditasSelect = document.getElementById('calc_komoditas');
    const dosisPerHa = parseFloat(komoditasSelect.value) || 5;
    const namaKomoditas = komoditasSelect.options[komoditasSelect.selectedIndex].dataset.nama;
    const luasM2 = parseFloat(document.getElementById('calc_luas').value) || 0;
    
    const luasHa = luasM2 / 10000;
    const totalDosis = (luasHa * dosisPerHa).toFixed(2);
    
    document.getElementById('calc_total_val').innerText = `${totalDosis} Liter`;
    document.getElementById('calc_detail_text').innerHTML = `
        Untuk lahan seluas <strong>${luasM2.toLocaleString('id-ID')} m² (${luasHa.toFixed(2)} Ha)</strong> tanaman <strong>${namaKomoditas}</strong>.
    `;
}

// Initial calculation
hitungDosis();
</script>

</body>
</html>

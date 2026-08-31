<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';

// Pastikan user login
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php?error=unauthorized");
    exit;
}

$user_id   = $_SESSION['user_id'];
$user_nama = $_SESSION['nama'] ?? 'Warga Argamukti';
$user_role = $_SESSION['role'] ?? 'warga';
$user_nik  = $_SESSION['username'] ?? '';

// Jika admin / operator mengakses portal warga, tetap diperbolehkan atau diarahkan ke dashboard
$is_warga = ($user_role === 'warga');

// 1. Ambil data warga & petani terkait
$warga_data = $conn->query("SELECT * FROM warga WHERE nama LIKE '%$user_nama%' OR nik='$user_nik' LIMIT 1")->fetch_assoc();
$petani_data= $conn->query("SELECT * FROM petani WHERE nama LIKE '%$user_nama%' OR nik='$user_nik' LIMIT 1")->fetch_assoc();
$petani_id  = $petani_data['id'] ?? ($warga_data['id'] ?? 0);

// 2. Handle Permohonan Pupuk Mandiri oleh Warga
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['ajukan_pupuk_warga'])) {
    $p_id            = (int)($_POST['petani_id'] ?: $petani_id);
    $lahan_id        = (int)$_POST['lahan_id'];
    $produk_pupuk_id = (int)$_POST['produk_pupuk_id'];
    $jumlah          = (float)$_POST['jumlah'];
    $keterangan      = cleanInput($_POST['keterangan']);
    $tanggal         = date('Y-m-d');
    $kode_permintaan = generateCode('REQ');

    if ($p_id > 0 && $jumlah > 0) {
        $conn->query("INSERT INTO permintaan_pupuk (kode_permintaan, petani_id, lahan_id, tanggal, status, keterangan) VALUES ('$kode_permintaan', $p_id, $lahan_id, '$tanggal', 'diajukan', '$keterangan')");
        $req_id = $conn->insert_id;
        $conn->query("INSERT INTO detail_permintaan_pupuk (permintaan_id, produk_pupuk_id, jumlah, satuan) VALUES ($req_id, $produk_pupuk_id, $jumlah, 'liter')");
        
        setFlash('success', "Permohonan pupuk Anda ($kode_permintaan) berhasil dikirim! Silakan tunggu verifikasi tim pengelola desa.");
    } else {
        setFlash('error', "Gagal mengajukan: Pastikan data lahan dan jumlah pupuk telah diisi dengan benar.");
    }
    header("Location: portal_warga.php#pupuk-saya");
    exit;
}

// 3. Ambil data lahan milik warga / petani
$lahan_warga = [];
if ($petani_id > 0) {
    $res_lahan = $conn->query("SELECT l.*, k.nama as nama_komoditas, k.dosis_pupuk_per_ha FROM lahan l JOIN komoditas k ON l.komoditas_id = k.id WHERE l.petani_id = $petani_id AND l.status='aktif'");
    while ($l = $res_lahan->fetch_assoc()) {
        $lahan_warga[] = $l;
    }
}
// Fallback jika belum punya lahan terdaftar, ambil semua lahan desa untuk simulasi
if (empty($lahan_warga)) {
    $res_lahan_all = $conn->query("SELECT l.*, k.nama as nama_komoditas, k.dosis_pupuk_per_ha FROM lahan l JOIN komoditas k ON l.komoditas_id = k.id WHERE l.status='aktif' LIMIT 3");
    while ($l = $res_lahan_all->fetch_assoc()) {
        $lahan_warga[] = $l;
    }
}

// 4. Riwayat Permohonan Pupuk Warga
$riwayat_pupuk = $conn->query("
    SELECT req.*, prd.nama_produk, dp.jumlah, dp.satuan, l.lokasi as lokasi_lahan, l.luas as luas_lahan
    FROM permintaan_pupuk req
    LEFT JOIN detail_permintaan_pupuk dp ON dp.permintaan_id = req.id
    LEFT JOIN produk_pupuk prd ON dp.produk_pupuk_id = prd.id
    LEFT JOIN lahan l ON req.lahan_id = l.id
    WHERE req.petani_id = $petani_id OR '$petani_id' = '0'
    ORDER BY req.id DESC LIMIT 8
");

// 5. Riwayat panen petani
$riwayat_panen = $conn->query("SELECT pn.*, k.nama as nama_komoditas FROM panen pn JOIN komoditas k ON pn.komoditas_id=k.id WHERE pn.petani_id=$petani_id ORDER BY pn.tanggal_panen DESC LIMIT 5");

// 6. Produk Pupuk
$produk_pupuk_opts = $conn->query("SELECT * FROM produk_pupuk WHERE status='aktif'");

$flash = getFlash();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portal Layanan Mandiri Warga | AgroMukti Desa Argamukti</title>
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
            --card-dark: #122131;
            --card-inner: #0b1724;
            --border-dark: #1e3a5f;
            --text-white: #ffffff;
            --text-sub: #94a3b8;
            --accent-amber: #f59e0b;
            --accent-blue: #0284c7;
            --accent-green: #10b981;
        }

        * { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior: smooth; }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--dark-bg);
            color: var(--text-white);
            line-height: 1.6;
            min-height: 100vh;
        }

                /* ========================================================
           SIMPLE & ELEGANT TOP NAVBAR (MATCHING HOME PAGE)
           ======================================================== */
        :root {
            --nav-height: 64px;
        }

        .site-navbar {
            position: sticky;
            top: 0; left: 0; right: 0;
            height: var(--nav-height);
            background: rgba(8, 17, 26, 0.94);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
            z-index: 1000;
            transition: all 0.3s ease;
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
        }
        .nav-brand-icon {
            width: 36px; height: 36px;
            background: linear-gradient(135deg, #14b8a6, #0d9488);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 1.1rem;
            box-shadow: 0 3px 12px rgba(20, 184, 166, 0.3);
        }
        .nav-brand-text {
            display: flex;
            flex-direction: column;
        }
        .nav-brand-title {
            font-size: 1.15rem;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.1;
            letter-spacing: -0.02em;
        }
        .nav-brand-sub {
            font-size: 0.68rem;
            color: #2dd4bf;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        /* CENTER MENU LINKS - SIMPLE & CLEAN */
        .nav-menu {
            display: flex;
            align-items: center;
            gap: 28px;
            list-style: none;
            margin: 0; padding: 0;
        }
        .nav-menu a {
            color: #94a3b8;
            font-size: 0.84rem;
            font-weight: 600;
            text-decoration: none;
            transition: color 0.2s ease;
            position: relative;
            padding: 6px 0;
        }
        .nav-menu a:hover {
            color: #2dd4bf;
        }
        .nav-menu a.active {
            color: #ffffff;
            font-weight: 700;
        }
        .nav-menu a.active::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 2px;
            background: #14b8a6;
            border-radius: 2px;
        }

        /* RIGHT ACTIONS */
        .nav-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .nav-user-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 4px 12px;
            background: rgba(20, 184, 166, 0.1);
            border: 1px solid rgba(20, 184, 166, 0.3);
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 600;
            color: #2dd4bf;
        }
        .citizen-avatar-mini {
            width: 22px; height: 22px;
            background: #14b8a6;
            color: #042f2e;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: 0.7rem;
        }

        .btn-logout-simple {
            color: #f87171;
            font-size: 0.78rem;
            font-weight: 600;
            text-decoration: none;
            padding: 6px 10px;
            border-radius: 6px;
            transition: all 0.2s;
        }
        .btn-logout-simple:hover {
            background: rgba(239, 68, 68, 0.12);
        }

        /* MOBILE TOGGLE */
        .nav-mobile-btn {
            display: none;
            background: transparent;
            border: none;
            color: white;
            font-size: 1.25rem;
            cursor: pointer;
            padding: 6px;
        }

        /* MAIN CONTAINER */
        .portal-layout {
            max-width: 1280px;
            margin: 0 auto;
            padding: 24px 24px 60px;
        }
            max-width: 1280px;
            margin: 0 auto;
            padding: 36px 24px 60px;
        }

        /* WELCOME HERO BANNER */
        .citizen-hero {
            background: linear-gradient(135deg, #09332e 0%, #061d24 60%, #0d2836 100%);
            border: 1px solid rgba(45, 212, 191, 0.3);
            border-radius: 20px;
            padding: 32px 36px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 28px;
            align-items: center;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
            position: relative;
            overflow: hidden;
        }
        .citizen-hero::after {
            content: '';
            position: absolute;
            top: -40px; right: -40px;
            width: 180px; height: 180px;
            background: radial-gradient(circle, rgba(45, 212, 191, 0.2) 0%, transparent 70%);
            border-radius: 50%;
        }

        .hero-info h2 { font-size: 1.8rem; font-weight: 800; color: white; margin-bottom: 6px; }
        .hero-info h2 span { color: #2dd4bf; }
        .hero-info p { font-size: 0.88rem; color: #cbd5e1; line-height: 1.6; max-width: 580px; margin-bottom: 20px; }
        
        .hero-quick-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-act-primary {
            padding: 10px 20px;
            background: linear-gradient(135deg, var(--primary-light), var(--primary-dark));
            border-radius: 10px;
            color: white;
            font-size: 0.84rem;
            font-weight: 700;
            display: inline-flex; align-items: center; gap: 8px;
            box-shadow: 0 4px 15px var(--emerald-glow);
            transition: all 0.2s;
        }
        .btn-act-primary:hover { transform: translateY(-2px); }

        .btn-act-outline {
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            color: white;
            font-size: 0.84rem;
            font-weight: 700;
            display: inline-flex; align-items: center; gap: 8px;
            transition: all 0.2s;
        }
        .btn-act-outline:hover { background: rgba(255, 255, 255, 0.12); border-color: #2dd4bf; }

        /* QUICK STATS CARDS */
        .citizen-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
            margin-bottom: 32px;
        }
        .c-stat-card {
            background: var(--card-dark);
            border: 1px solid var(--border-dark);
            border-radius: 16px;
            padding: 22px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.25s;
        }
        .c-stat-card:hover { transform: translateY(-3px); border-color: var(--primary-light); }
        .c-stat-icon {
            width: 48px; height: 48px;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.3rem;
        }
        .c-stat-icon.green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .c-stat-icon.blue  { background: rgba(2, 132, 199, 0.15); color: #38bdf8; }
        .c-stat-icon.amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }

        .c-stat-val { font-size: 1.4rem; font-weight: 800; color: white; line-height: 1.1; }
        .c-stat-lbl { font-size: 0.75rem; color: var(--text-sub); font-weight: 600; margin-top: 2px; }

        /* SECTION CARD */
        .portal-card {
            background: var(--card-dark);
            border: 1px solid var(--border-dark);
            border-radius: 18px;
            padding: 28px;
            margin-bottom: 28px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .portal-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 22px;
            padding-bottom: 14px;
            border-bottom: 1px solid var(--border-dark);
        }
        .portal-card-header h4 {
            font-size: 1.15rem;
            font-weight: 800;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .portal-card-header span { font-size: 0.78rem; color: var(--text-sub); }

        /* FORM STYLES */
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px; }
        .form-input, .form-select {
            width: 100%;
            padding: 11px 14px;
            background: var(--card-inner);
            border: 1px solid var(--border-dark);
            border-radius: 10px;
            color: white;
            font-size: 0.85rem;
            outline: none;
            font-family: inherit;
        }
        .form-input:focus, .form-select:focus { border-color: var(--primary-light); }

        /* TABLE */
        .portal-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.84rem;
        }
        .portal-table th {
            text-align: left;
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.03);
            color: var(--text-sub);
            font-weight: 700;
            border-bottom: 1px solid var(--border-dark);
        }
        .portal-table td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            color: #cbd5e1;
        }

        /* BADGES */
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 0.72rem;
            font-weight: 700;
        }
        .badge-success { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .badge-warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .badge-danger  { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .badge-info    { background: rgba(2, 132, 199, 0.15); color: #38bdf8; }

        /* PRODUCT CARDS */
        .product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 18px;
        }
        .p-card {
            background: var(--card-inner);
            border: 1px solid var(--border-dark);
            border-radius: 14px;
            padding: 20px;
            transition: all 0.25s;
        }
        .p-card:hover { border-color: var(--primary-light); transform: translateY(-2px); }
        .p-card h5 { font-size: 1rem; font-weight: 800; color: white; margin-bottom: 4px; }
        .p-card .p-price { font-size: 1.15rem; font-weight: 800; color: #2dd4bf; margin: 8px 0 12px; }
        .p-card .p-desc { font-size: 0.78rem; color: var(--text-sub); min-height: 40px; margin-bottom: 12px; }

        /* CALCULATOR HIGHLIGHT BOX */
        .calc-preview {
            background: linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(11, 23, 36, 0.8));
            border: 1px solid #14b8a6;
            border-radius: 12px;
            padding: 16px;
            margin-top: 14px;
            display: none;
        }

        @media (max-width: 992px) {
            .site-navbar { padding: 0 20px; }
            .nav-menu {
                display: none;
                position: absolute;
                top: var(--nav-height);
                left: 0; right: 0;
                background: #08111a;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                flex-direction: column;
                padding: 18px 24px;
                gap: 16px;
            }
            .nav-menu.show { display: flex; }
            .nav-mobile-btn { display: block; }
            .citizen-hero { grid-template-columns: 1fr; }
            .citizen-stats-grid { grid-template-columns: 1fr; }
            .form-grid-2 { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>

<!-- SIMPLE & ELEGANT TOP NAVBAR (MATCHING HOME PAGE) -->
<header class="site-navbar">
    <a href="index.php" class="nav-brand">
        <div class="nav-brand-icon"><i class="fa-solid fa-leaf"></i></div>
        <div class="nav-brand-text">
            <span class="nav-brand-title">AgroMukti</span>
            <span class="nav-brand-sub">Portal Layanan Warga</span>
        </div>
    </a>

    <!-- CENTER NAVIGATION LINKS -->
    <ul class="nav-menu" id="navMenu">
        <li><a href="#ringkasan" class="active" onclick="closeNavMenu()">Ringkasan</a></li>
        <li><a href="#pupuk-saya" onclick="closeNavMenu()">Ajukan Pupuk</a></li>
        <li><a href="#riwayat" onclick="closeNavMenu()">Riwayat</a></li>
        <li><a href="#kalkulator-poc" onclick="closeNavMenu()">Kalkulator POC</a></li>
        <li><a href="index.php" onclick="closeNavMenu()"><i class="fa-solid fa-globe me-1"></i> Beranda</a></li>
    </ul>

    <!-- RIGHT ACTIONS -->
    <div class="nav-actions">
        <div class="nav-user-badge">
            <div class="citizen-avatar-mini"><?= strtoupper(substr($user_nama, 0, 1)) ?></div>
            <span><?= htmlspecialchars($user_nama) ?></span>
        </div>
        <a href="logout.php" class="btn-logout-simple" title="Keluar">
            <i class="fa-solid fa-right-from-bracket me-1"></i> Logout
        </a>
        <button class="nav-mobile-btn" onclick="toggleNavMenu()" title="Menu">
            <i class="fa-solid fa-bars"></i>
        </button>
    </div>
</header>

<div class="portal-layout">

    <?php if ($flash): ?>
        <div style="padding:14px 20px; background: <?= $flash['type'] == 'success' ? '#064e3b' : '#7f1d1d' ?>; border:1px solid <?= $flash['type'] == 'success' ? '#059669' : '#b91c1c' ?>; border-radius:12px; margin-bottom:24px; color:white; font-weight:600; font-size:0.86rem;">
            <i class="fa-solid <?= $flash['type'] == 'success' ? 'fa-circle-check' : 'fa-circle-exclamation' ?> me-2"></i><?= $flash['message'] ?>
        </div>
    <?php endif; ?>

    <!-- CITIZEN HERO WELCOME -->
    <div class="citizen-hero" id="ringkasan">
        <div class="hero-info">
            <h2>Selamat Datang, <span><?= htmlspecialchars($user_nama) ?></span>!</h2>
            <p>
                Ini adalah portal layanan mandiri digital Anda. Anda dapat mengajukan permohonan pupuk organik subsidi, menghitung takaran POC untuk lahan kebun, mengecek tabungan bank sampah, serta memesan produk UMKM khas desa.
            </p>
            <div class="hero-quick-actions">
                <a href="#form-ajukan-pupuk" class="btn-act-primary">
                    <i class="fa-solid fa-file-signature"></i> Ajukan Permohonan Pupuk
                </a>
                <a href="#kalkulator-poc" class="btn-act-outline">
                    <i class="fa-solid fa-calculator"></i> Hitung Dosis Lahan
                </a>
            </div>
        </div>

        <!-- IDENTITY CARD -->
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                <i class="fa-solid fa-id-card" style="font-size:1.8rem; color:#2dd4bf;"></i>
                <div>
                    <h5 style="font-size:0.95rem; font-weight:800; color:white;">Data Terverifikasi Warga</h5>
                    <span style="font-size:0.72rem; color:#94a3b8;">Desa Argamukti, Kec. Argapura</span>
                </div>
            </div>
            <div style="font-size:0.8rem; color:#cbd5e1; display:flex; flex-direction:column; gap:6px;">
                <div><span style="color:#94a3b8;">NIK:</span> <code><?= htmlspecialchars($warga_data['nik'] ?? $user_nik ?: '321008xxxxxx') ?></code></div>
                <div><span style="color:#94a3b8;">Alamat:</span> <?= htmlspecialchars($warga_data['alamat'] ?? 'Dusun Apuy, Argamukti') ?></div>
                <div><span style="color:#94a3b8;">No. HP:</span> <?= htmlspecialchars($warga_data['no_hp'] ?? '08xxxxxxxxxx') ?></div>
                <div><span style="color:#94a3b8;">Status Kependudukan:</span> <span class="badge badge-success">AKTIF</span></div>
            </div>
        </div>
    </div>

    <!-- STATS SUMMARY CARDS -->
    <div class="citizen-stats-grid">
        <div class="c-stat-card">
            <div class="c-stat-icon green"><i class="fa-solid fa-flask-vial"></i></div>
            <div>
                <div class="c-stat-val"><?= $riwayat_pupuk->num_rows ?> Pengajuan</div>
                <div class="c-stat-lbl">Permohonan Pupuk Anda</div>
            </div>
        </div>
        <div class="c-stat-card">
            <div class="c-stat-icon blue"><i class="fa-solid fa-map-location-dot"></i></div>
            <div>
                <div class="c-stat-val"><?= count($lahan_warga) ?> Bidang</div>
                <div class="c-stat-lbl">Lahan Pertanian Terdaftar</div>
            </div>
        </div>
        <div class="c-stat-card">
            <div class="c-stat-icon amber"><i class="fa-solid fa-wheat-awn"></i></div>
            <div>
                <div class="c-stat-val"><?= $riwayat_pupuk ? $riwayat_pupuk->num_rows : 0 ?> Catatan</div>
                <div class="c-stat-lbl">Riwayat Panen Saya</div>
            </div>
        </div>
    </div>

    <!-- SECTION: PERMOHONAN PUPUK SUBSIDI SAYA -->
    <div class="portal-card" id="pupuk-saya">
        <div class="portal-card-header">
            <h4><i class="fa-solid fa-hand-holding-hand" style="color:#2dd4bf;"></i> Layanan Permohonan Pupuk Organik</h4>
            <span>Ajukan kebutuhan pupuk organik desa untuk lahan pertanian Anda</span>
        </div>

        <!-- FORM AJUKAN PUPUK -->
        <div id="form-ajukan-pupuk" style="background:var(--card-inner); border:1px solid var(--border-dark); border-radius:14px; padding:22px; margin-bottom:24px;">
            <h5 style="font-size:0.95rem; font-weight:800; color:white; margin-bottom:14px; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-plus-circle" style="color:var(--primary-light);"></i> Buat Permohonan Pupuk Baru
            </h5>

            <form action="portal_warga.php" method="POST">
                <input type="hidden" name="ajukan_pupuk_warga" value="1">
                <input type="hidden" name="petani_id" value="<?= $petani_id ?>">

                <div class="form-grid-2">
                    <div class="form-group">
                        <label class="form-label">Pilih Lahan Kebun & Komoditas</label>
                        <select name="lahan_id" id="portal_lahan_select" class="form-select" onchange="hitungKebutuhanPortal()" required>
                            <option value="">-- Pilih Lahan Pertanian Anda --</option>
                            <?php foreach ($lahan_warga as $l): ?>
                            <option value="<?= $l['id'] ?>" data-luas="<?= $l['luas'] ?>" data-komoditas="<?= $l['nama_komoditas'] ?>" data-dosis="<?= $l['dosis_pupuk_per_ha'] ?>">
                                <?= htmlspecialchars($l['lokasi']) ?> - <?= htmlspecialchars($l['nama_komoditas']) ?> (<?= formatNumber($l['luas']) ?> m²)
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Jenis Produk Pupuk</label>
                        <select name="produk_pupuk_id" class="form-select" required>
                            <?php while ($pr = $produk_pupuk_opts->fetch_assoc()): ?>
                            <option value="<?= $pr['id'] ?>"><?= htmlspecialchars($pr['nama_produk']) ?> (<?= $pr['jenis'] ?>)</option>
                            <?php endwhile; ?>
                        </select>
                    </div>
                </div>

                <!-- PREVIEW PERHITUNGAN OTOMATIS -->
                <div class="calc-preview" id="portal_calc_preview">
                    <div style="font-size:0.8rem; color:#94a3b8; font-weight:700; text-transform:uppercase;"><i class="fa-solid fa-calculator me-1"></i> Rekomendasi Takaran SOP Desa:</div>
                    <div style="font-size:1.4rem; font-weight:800; color:#2dd4bf; margin:4px 0;" id="portal_calc_val">0.00 Liter</div>
                    <p style="font-size:0.78rem; color:#cbd5e1;" id="portal_calc_desc"></p>
                </div>

                <div class="form-grid-2" style="margin-top:14px;">
                    <div class="form-group">
                        <label class="form-label">Jumlah Liter / Kg yang Diminta</label>
                        <input type="number" step="0.1" name="jumlah" id="portal_jumlah_input" class="form-input" placeholder="Contoh: 2.5" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Catatan Penggunaan</label>
                        <input type="text" name="keterangan" class="form-input" placeholder="Contoh: Persiapan pemupukan musim tanam baru">
                    </div>
                </div>

                <button type="submit" class="btn-act-primary" style="border:none; cursor:pointer; width:100%; justify-content:center; padding:12px;">
                    <i class="fa-solid fa-paper-plane me-1"></i> Kirim Permohonan Pupuk ke Pengelola Desa
                </button>
            </form>
        </div>

        <!-- RIWAYAT PENGAJUAN PUPUK SAYA -->
        <h5 style="font-size:0.95rem; font-weight:800; color:white; margin-bottom:12px;" id="riwayat">
            <i class="fa-solid fa-clock-rotate-left me-1" style="color:#38bdf8;"></i> Riwayat & Status Pengajuan Saya
        </h5>

        <?php if ($riwayat_pupuk && $riwayat_pupuk->num_rows > 0): ?>
            <div style="overflow-x:auto;" id="riwayat-permohonan">
                <table class="portal-table">
                    <thead>
                        <tr>
                            <th>Kode Permohonan</th>
                            <th>Tanggal</th>
                            <th>Produk & Jumlah</th>
                            <th>Lahan Pertanian</th>
                            <th>Status Permohonan</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($rp = $riwayat_pupuk->fetch_assoc()): ?>
                        <tr>
                            <td><code><?= $rp['kode_permintaan'] ?></code></td>
                            <td><?= date('d/m/Y', strtotime($rp['tanggal'])) ?></td>
                            <td><strong><?= formatNumber($rp['jumlah'], 1) ?> <?= $rp['satuan'] ?></strong> <br><small class="text-muted"><?= htmlspecialchars($rp['nama_produk'] ?? 'Pupuk Organik') ?></small></td>
                            <td><small><?= htmlspecialchars($rp['lokasi_lahan'] ?? 'Lahan Petani') ?></small></td>
                            <td>
                                <?php 
                                $bclass = 'badge-warning';
                                if ($rp['status'] === 'disetujui') $bclass = 'badge-success';
                                if ($rp['status'] === 'ditolak') $bclass = 'badge-danger';
                                if ($rp['status'] === 'selesai' || $rp['status'] === 'dikirim') $bclass = 'badge-info';
                                ?>
                                <span class="badge <?= $bclass ?>"><?= strtoupper($rp['status']) ?></span>
                            </td>
                        </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p style="font-size:0.82rem; color:#94a3b8; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px;">
                Belum ada riwayat permohonan pupuk. Gunakan form di atas untuk membuat pengajuan baru.
            </p>
        <?php endif; ?>
    </div>

    <!-- SECTION: KALKULATOR CERDAS POC -->
    <div class="portal-card" id="kalkulator-poc">
        <div class="portal-card-header">
            <h4><i class="fa-solid fa-calculator" style="color:#f59e0b;"></i> Kalkulator Dosis Pupuk Cair (POC) Interaktif</h4>
            <span>Standar Takaran Dosis Efektif Tanaman Desa Argamukti</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div>
                <label class="form-label">Pilih Jenis Komoditas</label>
                <select id="warga_calc_komoditas" class="form-select" onchange="hitungWargaDosis()">
                    <option value="5" data-nama="Tomat Argamukti">Tomat Argamukti (SOP: 5.0 L / Ha)</option>
                    <option value="10" data-nama="Bawang Daun">Bawang Daun (SOP: 10.0 L / Ha)</option>
                    <option value="15" data-nama="Kubis / Kol">Kubis / Kol (SOP: 15.0 L / Ha)</option>
                    <option value="25" data-nama="Kentang Granola">Kentang Granola (SOP: 25.0 L / Ha)</option>
                    <option value="12" data-nama="Cabai Merah">Cabai Merah (SOP: 12.0 L / Ha)</option>
                </select>
            </div>

            <div>
                <label class="form-label">Masukkan Luas Lahan (m²)</label>
                <input type="number" id="warga_calc_luas" class="form-input" value="3000" placeholder="Contoh: 3000" onkeyup="hitungWargaDosis()" onchange="hitungWargaDosis()">
            </div>
        </div>

        <div style="margin-top:20px; padding:20px; background:linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(11, 23, 36, 0.9)); border:1px solid #f59e0b; border-radius:14px; text-align:center;">
            <span style="font-size:0.75rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">Kebutuhan Pupuk Organik Cair (POC) Optimal</span>
            <div style="font-size:2.2rem; font-weight:800; color:#fbbf24; margin:4px 0;" id="warga_calc_total">1.50 Liter</div>
            <p style="font-size:0.82rem; color:#cbd5e1;" id="warga_calc_info">
                Untuk lahan seluas <strong>3.000 m² (0.30 Ha)</strong> komoditas <strong>Tomat Argamukti</strong>.
            </p>
        </div>
    </div>

    <!-- SECTION: INFO PERTANIAN -->
    <div class="portal-card" id="info-pertanian">
        <div class="portal-card-header">
            <h4><i class="fa-solid fa-circle-info" style="color:#38bdf8;"></i> Informasi Kegiatan Pertanian Desa</h4>
            <span>Jadwal & panduan musim tanam komoditas hortikultura lereng Gunung Ciremai</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div style="background:var(--card-inner); border:1px solid var(--border-dark); border-radius:14px; padding:20px;">
                <h5 style="font-size:0.9rem; font-weight:700; color:white; margin-bottom:10px;"><i class="fa-solid fa-calendar-days me-1" style="color:#14b8a6;"></i> Panduan Musim Tanam</h5>
                <ul style="list-style:none; font-size:0.8rem; color:#cbd5e1; display:flex; flex-direction:column; gap:10px;">
                    <li style="display:flex; gap:10px;"><i class="fa-solid fa-check-circle" style="color:#34d399; margin-top:2px;"></i><span>Persiapkan lahan 2 minggu sebelum musim tanam dimulai.</span></li>
                    <li style="display:flex; gap:10px;"><i class="fa-solid fa-check-circle" style="color:#34d399; margin-top:2px;"></i><span>Ajukan pupuk organik minimal 1 minggu sebelum pemupukan melalui portal ini.</span></li>
                    <li style="display:flex; gap:10px;"><i class="fa-solid fa-check-circle" style="color:#34d399; margin-top:2px;"></i><span>Laporkan hasil panen ke petugas desa untuk dicatat dalam sistem.</span></li>
                </ul>
            </div>
            <div style="background:var(--card-inner); border:1px solid var(--border-dark); border-radius:14px; padding:20px;">
                <h5 style="font-size:0.9rem; font-weight:700; color:white; margin-bottom:10px;"><i class="fa-solid fa-seedling me-1" style="color:#a78bfa;"></i> Komoditas Unggulan Argamukti</h5>
                <ul style="list-style:none; font-size:0.8rem; color:#cbd5e1; display:flex; flex-direction:column; gap:10px;">
                    <li style="display:flex; gap:10px;"><i class="fa-solid fa-circle" style="color:#14b8a6; margin-top:5px; font-size:0.4rem;"></i><span><strong>Tomat Argamukti</strong> — Manis, tebal, khas lereng Ciremai (SOP: 5.0 L/Ha)</span></li>
                    <li style="display:flex; gap:10px;"><i class="fa-solid fa-circle" style="color:#14b8a6; margin-top:5px; font-size:0.4rem;"></i><span><strong>Bawang Daun</strong> — Komoditas utama dataran tinggi (SOP: 10.0 L/Ha)</span></li>
                    <li style="display:flex; gap:10px;"><i class="fa-solid fa-circle" style="color:#14b8a6; margin-top:5px; font-size:0.4rem;"></i><span><strong>Kentang Granola</strong> — Kaya nutrisi, permintaan tinggi (SOP: 25.0 L/Ha)</span></li>
                </ul>
            </div>
        </div>
</div>
        </div>
    </div>

    <!-- SECTION: LAYANAN KKM TERINTEGRASI -->
    <?php
    $kkm_conn_portal = @new mysqli('localhost', 'root', '', 'db_prokerkkm');
    $kkm_produk = [];
    if (!$kkm_conn_portal->connect_error) {
        $res = $kkm_conn_portal->query("SELECT * FROM produk WHERE status='tersedia' ORDER BY id DESC LIMIT 4");
        if ($res) {
            while ($p = $res->fetch_assoc()) {
                $kkm_produk[] = $p;
            }
        }
        $kkm_conn_portal->close();
    }
    ?>
    <div class="portal-card" id="program-kkm" style="margin-top:24px; border:1px solid var(--primary); background:rgba(15,118,110,0.05);">
        <div class="portal-card-header">
            <h4><i class="fa-solid fa-satellite-dish" style="color:var(--primary-light);"></i> Program Desa & Inovasi KKM UMC</h4>
            <span>Jelajahi program sinergi desa lainnya yang terintegrasi</span>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 2fr; gap:20px;">
            <!-- Bank Sampah -->
            <div style="background:var(--card-inner); padding:20px; border-radius:12px; border:1px solid rgba(239,68,68,0.2); text-align:center;">
                <div style="width:50px; height:50px; border-radius:50%; background:rgba(239,68,68,0.1); color:#ef4444; display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin:0 auto 15px;"><i class="fa-solid fa-recycle"></i></div>
                <h5 style="color:white; font-size:1.1rem; margin-bottom:8px;">Bank Sampah Argamukti</h5>
                <p style="font-size:0.85rem; color:var(--text-sub); margin-bottom:15px;">Tukarkan sampah organik rumah tangga Anda menjadi poin atau subsidi pupuk.</p>
                <button onclick="alert('Silakan bawa sampah organik Anda ke Balai Desa setiap hari Minggu pagi untuk disetorkan.')" class="btn" style="background:rgba(239,68,68,0.2); color:#ef4444; width:100%; border:1px solid rgba(239,68,68,0.3);">Lihat Jadwal Setor</button>
            </div>

            <!-- UMKM -->
            <div style="background:var(--card-inner); padding:20px; border-radius:12px; border:1px solid rgba(124,58,237,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h5 style="color:white; font-size:1.1rem; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-store" style="color:#7c3aed;"></i> Katalog UMKM Warga</h5>
                    <span class="badge badge-purple" style="font-size:0.7rem;">Produk Unggulan</span>
                </div>
                
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px;">
                    <?php foreach($kkm_produk as $prod): ?>
                    <div style="background:var(--dark-bg); border:1px solid var(--border-dark); padding:15px; border-radius:8px;">
                        <h6 style="color:white; font-size:0.95rem; margin-bottom:5px;"><?= htmlspecialchars($prod['nama_produk']) ?></h6>
                        <div style="font-size:0.75rem; color:var(--text-sub); margin-bottom:10px;"><?= htmlspecialchars($prod['kategori']) ?></div>
                        <div style="font-weight:700; color:#fde047; font-size:1rem;">Rp <?= number_format($prod['harga'], 0, ',', '.') ?></div>
                    </div>
                    <?php endforeach; ?>
                    <?php if (empty($kkm_produk)): ?>
                        <div style="color:var(--text-sub); font-size:0.85rem;">Belum ada produk UMKM terdaftar.</div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

</div>

<!-- FOOTER -->
<footer style="background:#050b11; border-top:1px solid var(--border-dark); padding:30px; text-align:center; font-size:0.8rem; color:var(--text-sub);">
    <p>© 2026 Pemerintah Desa Argamukti • Portal Layanan Terpadu KKM UMC 2026</p>
</footer>

<script>
function hitungKebutuhanPortal() {
    const sel = document.getElementById('portal_lahan_select');
    const preview = document.getElementById('portal_calc_preview');
    const valText = document.getElementById('portal_calc_val');
    const descText = document.getElementById('portal_calc_desc');
    const inputJumlah = document.getElementById('portal_jumlah_input');

    if (sel.selectedIndex <= 0) {
        preview.style.display = 'none';
        return;
    }

    const opt = sel.options[sel.selectedIndex];
    const luasM2 = parseFloat(opt.dataset.luas) || 0;
    const luasHa = luasM2 / 10000;
    const dosisHa = parseFloat(opt.dataset.dosis) || 5;
    const komoditas = opt.dataset.komoditas;

    const total = (luasHa * dosisHa).toFixed(2);

    preview.style.display = 'block';
    valText.innerText = `${total} Liter`;
    descText.innerHTML = `Lahan seluas <strong>${luasM2.toLocaleString('id-ID')} m² (${luasHa.toFixed(2)} Ha)</strong> komoditas <strong>${komoditas}</strong> (SOP Dosis: ${dosisHa} L/Ha).`;
    inputJumlah.value = total;
}

function hitungWargaDosis() {
    const komSelect = document.getElementById('warga_calc_komoditas');
    const dosisHa = parseFloat(komSelect.value) || 5;
    const namaKomoditas = komSelect.options[komSelect.selectedIndex].dataset.nama;
    const luasM2 = parseFloat(document.getElementById('warga_calc_luas').value) || 0;

    const luasHa = luasM2 / 10000;
    const total = (luasHa * dosisHa).toFixed(2);

    document.getElementById('warga_calc_total').innerText = `${total} Liter`;
    document.getElementById('warga_calc_info').innerHTML = `
        Untuk lahan seluas <strong>${luasM2.toLocaleString('id-ID')} m² (${luasHa.toFixed(2)} Ha)</strong> komoditas <strong>${namaKomoditas}</strong>.
    `;
}

function toggleNavMenu() {
    const menu = document.getElementById('navMenu');
    if (menu) menu.classList.toggle('show');
}

function closeNavMenu() {
    if (window.innerWidth <= 992) {
        const menu = document.getElementById('navMenu');
        if (menu) menu.classList.remove('show');
    }
}

// Highlight active top navbar link on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id], div[id]');
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
        const sectionHeight = current.offsetHeight;
        const sectionTop = current.offsetTop - 100;
        const sectionId = current.getAttribute('id');
        const link = document.querySelector(`.nav-menu a[href*='${sectionId}']`);

        if (link && scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-menu a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        }
    });
});
</script>

</body>
</html>

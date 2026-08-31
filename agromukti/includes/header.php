<?php
$is_readonly = isset($_SESSION['role']) && !canEdit();
$user_role   = $_SESSION['role'] ?? 'admin';
$user_nama   = $_SESSION['nama'] ?? 'Pengguna';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?? 'AgroMukti' ?> | Sistem Integrasi Desa Argamukti</title>
    <!-- Google Fonts & Font Awesome Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
    <?php if ($is_readonly): ?>
    <style>
        /* Sembunyikan elemen tambah/ubah/hapus untuk role Read-Only (Kepala Desa) */
        .page-header button.btn-primary,
        .page-header a.btn-primary,
        .page-header .btn-success,
        .modal-overlay,
        table.data-table td:last-child a.btn-danger,
        table.data-table td:last-child button.btn-danger,
        table.data-table td:last-child button.btn-primary,
        table.data-table td:last-child form {
            display: none !important;
        }
    </style>
    <?php endif; ?>
</head>
<body>
<?php include 'includes/sidebar.php'; ?>
<div class="main-wrapper" id="main-wrapper">
    <!-- TOPBAR -->
    <header class="topbar">
        <button class="hamburger" id="hamburger" onclick="toggleSidebar()">
            <i class="fa-solid fa-bars"></i>
        </button>
        <div class="topbar-breadcrumb">
            <h5><?= $page_title ?? 'Dashboard Integrasi' ?></h5>
            <span class="sub"><i class="fa-solid fa-location-dot me-1" style="color:var(--primary);"></i> Desa Argamukti, Kec. Argapura, Kab. Majalengka</span>
        </div>
        <div class="topbar-right">
            <div style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:20px; font-size:0.72rem; font-weight:700; color:#047857;">
                <i class="fa-solid fa-circle-dot" style="font-size:0.6rem; color:#10b981;"></i> Online
            </div>
            <div class="topbar-clock">
                <i class="fa-regular fa-clock"></i>
                <span id="live-clock">--:--:--</span>
            </div>
            <a href="index.php" target="_blank" class="topbar-btn" title="Lihat Halaman Publik Beranda">
                <i class="fa-solid fa-globe"></i>
            </a>
            <button class="topbar-btn" onclick="window.print()" title="Cetak Dokumen">
                <i class="fa-solid fa-print"></i>
            </button>
        </div>
    </header>
    <!-- MAIN CONTENT -->
    <main class="content">
    <?php if ($is_readonly && ($user_role === 'kepala_desa')): ?>
        <div style="padding:12px 18px; background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; border-radius:12px; margin-bottom:20px; font-size:0.84rem; font-weight:600; display:flex; align-items:center; gap:10px; box-shadow:0 2px 8px rgba(30,64,175,0.06);">
            <i class="fa-solid fa-crown" style="font-size:1.1rem; color:#2563eb;"></i>
            <div>
                <strong>Mode Peninjauan Eksekutif (Kepala Desa):</strong>
                <span style="font-weight:400; color:#3b82f6; display:block; font-size:0.78rem;">Anda sedang melihat data seluruh sektor desa dalam mode pembacaan (Read-Only) yang bersih & teratur.</span>
            </div>
        </div>
    <?php endif; ?>

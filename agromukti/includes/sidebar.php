<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$user_nama = $_SESSION['nama'] ?? $_SESSION['admin'] ?? 'Pengguna Desa';
$user_role = $_SESSION['role'] ?? 'petugas';
$current_page = basename($_SERVER['PHP_SELF']);

// Label badge & avatar sesuai role
$role_labels = [
    'admin'   => ['Administrator',  'AD', 'badge-purple', 'fa-shield-halved'],
    'petugas' => ['Petugas Lapangan', 'PL', 'badge-success', 'fa-user-tie']
];
$role_badge = $role_labels[$user_role] ?? ['Pengguna', 'PN', 'badge-secondary', 'fa-user'];
$is_admin = ($user_role === 'admin');
?>
<aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
        <div class="logo-icon"><i class="fa-solid fa-leaf"></i></div>
        <div class="logo-text">
            <h2>AgroMukti</h2>
            <small>Sistem Informasi Pertanian</small>
        </div>
    </div>

    <div class="sidebar-admin">
        <div class="admin-avatar"><?= $role_badge[1] ?></div>
        <div class="admin-info">
            <h6><?= htmlspecialchars($user_nama) ?></h6>
            <span class="badge <?= $role_badge[2] ?>"><i class="fa-solid <?= $role_badge[3] ?>"></i> <?= $role_badge[0] ?></span>
        </div>
    </div>

    <nav class="sidebar-nav">

        <div class="nav-label">Navigasi Utama</div>
        
        <a href="dashboard.php" class="nav-item <?= ($current_page == 'dashboard.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-chart-pie nav-icon"></i> Dashboard Utama
        </a>

        <div class="nav-label">Modul Pertanian</div>

        <!-- Master Data Pertanian -->
        <?php $pertanian_active = in_array($current_page, ['petani.php', 'lahan.php', 'komoditas.php', 'panen.php']); ?>
        <div class="nav-item has-submenu <?= $pertanian_active ? 'active open' : '' ?>" onclick="toggleSubmenu('sub-pertanian', this)">
            <i class="fa-solid fa-wheat-awn nav-icon" style="color:#84cc16;"></i> Data Pertanian
            <i class="fa-solid fa-chevron-right submenu-caret"></i>
        </div>
        <div class="sidebar-submenu <?= $pertanian_active ? 'show' : '' ?>" id="sub-pertanian">
            <a href="petani.php" class="submenu-item <?= ($current_page == 'petani.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-users"></i> Data Petani
            </a>
            <a href="lahan.php" class="submenu-item <?= ($current_page == 'lahan.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-map-location-dot"></i> Lahan Pertanian
            </a>
            <?php if ($is_admin): ?>
            <a href="komoditas.php" class="submenu-item <?= ($current_page == 'komoditas.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-seedling"></i> Komoditas Tanam
            </a>
            <?php endif; ?>
            <a href="panen.php" class="submenu-item <?= ($current_page == 'panen.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-wheat-harvest"></i> Catatan Panen
            </a>
        </div>

        <div class="nav-label">Penyaluran Pupuk</div>

        <!-- Modul Pupuk & Distribusi -->
        <?php $pupuk_active = in_array($current_page, ['produk_pupuk.php', 'stok_pupuk.php', 'mutasi_stok.php', 'permintaan_pupuk.php', 'distribusi_pupuk.php']); ?>
        <div class="nav-item has-submenu <?= $pupuk_active ? 'active open' : '' ?>" onclick="toggleSubmenu('sub-pupuk', this)">
            <i class="fa-solid fa-truck-fast nav-icon" style="color:#38bdf8;"></i> Alokasi & Stok Pupuk
            <i class="fa-solid fa-chevron-right submenu-caret"></i>
        </div>
        <div class="sidebar-submenu <?= $pupuk_active ? 'show' : '' ?>" id="sub-pupuk">
            <?php if ($is_admin): ?>
            <a href="produk_pupuk.php" class="submenu-item <?= ($current_page == 'produk_pupuk.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-box-open"></i> Katalog Produk
            </a>
            <?php endif; ?>
            <a href="stok_pupuk.php" class="submenu-item <?= ($current_page == 'stok_pupuk.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-cubes-stacked"></i> Stok & Inventaris
            </a>
            <?php if ($is_admin): ?>
            <a href="mutasi_stok.php" class="submenu-item <?= ($current_page == 'mutasi_stok.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-list-check"></i> Mutasi Stok
            </a>
            <?php endif; ?>
            <a href="permintaan_pupuk.php" class="submenu-item <?= ($current_page == 'permintaan_pupuk.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-file-signature"></i> Pengajuan Petani
            </a>
            <a href="distribusi_pupuk.php" class="submenu-item <?= ($current_page == 'distribusi_pupuk.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-truck-ramp-box"></i> Penyaluran Pupuk
            </a>
        </div>

        <div class="nav-label">Produksi Pupuk</div>
        <?php if ($is_admin): ?>
            <a href="kkm_buat_pupuk.php" class="nav-item <?= ($current_page == 'kkm_buat_pupuk.php') ? 'active' : '' ?>">
                <i class="fa-solid fa-flask nav-icon"></i> Bank Sampah (Pupuk)
            </a>
            <div class="nav-label">Penjualan</div>
            <a href="kkm_umkm.php" class="nav-item <?= (in_array($current_page, ['kkm_umkm.php', 'kkm_tambah_umkm.php'])) ? 'active' : '' ?>">
            <i class="fa-solid fa-store nav-icon"></i> Katalog UMKM
        </a>
        <?php endif; ?>

        <div class="nav-label">Laporan & Publik</div>

        <?php if ($is_admin): ?>
        <a href="laporan.php" class="nav-item <?= ($current_page == 'laporan.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-file-chart-pie nav-icon"></i> Cetak Laporan Resmi
        </a>
        <?php endif; ?>

        <a href="index.php" target="_blank" class="nav-item">
            <i class="fa-solid fa-globe nav-icon"></i> Portal Publik (Beranda)
        </a>

        <?php if ($is_admin): ?>
        <a href="users.php" class="nav-item <?= ($current_page == 'users.php') ? 'active' : '' ?>">
            <i class="fa-solid fa-user-gear nav-icon"></i> Pengguna & Hak Akses
        </a>
        <?php endif; ?>

    </nav>

    <div class="sidebar-footer">
        <a href="logout.php" class="nav-item" style="color: #ef4444; border-left: none; padding: 6px 0; display:block; text-align:center;">
            <i class="fa-solid fa-right-from-bracket nav-icon"></i> Keluar (Logout)
        </a>
    </div>
</aside>

<script>
function toggleSubmenu(id, elem) {
    var submenu = document.getElementById(id);
    if (submenu) {
        submenu.classList.toggle('show');
        elem.classList.toggle('open');
    }
}
</script>

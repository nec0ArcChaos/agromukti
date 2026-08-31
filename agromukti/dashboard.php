<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$user_role = $_SESSION['role'] ?? 'petugas';
$user_nama = $_SESSION['nama'] ?? 'Pengguna Sistem';
$is_admin  = ($user_role === 'admin');

$page_title = "Dashboard AgroMukti";

// 1. Statistik Pertanian Sektor Hortikultura
$total_petani      = $conn->query("SELECT COUNT(*) as c FROM petani WHERE status='aktif'")->fetch_assoc()['c'] ?? 0;
$total_lahan       = $conn->query("SELECT COALESCE(SUM(luas),0) as total FROM lahan WHERE status='aktif'")->fetch_assoc()['total'] ?? 0;
$total_komoditas   = $conn->query("SELECT COUNT(*) as c FROM komoditas WHERE status='aktif'")->fetch_assoc()['c'] ?? 0;
$total_panen       = $conn->query("SELECT COALESCE(SUM(jumlah_panen),0) as total FROM panen")->fetch_assoc()['total'] ?? 0;

// 2. Statistik Stok & Penyaluran Pupuk
$stok_kompos       = $conn->query("SELECT COALESCE(SUM(jumlah),0) as total FROM stok_pupuk sp JOIN produk_pupuk pp ON sp.produk_pupuk_id = pp.id WHERE pp.jenis='kompos'")->fetch_assoc()['total'] ?? 0;
$stok_cair         = $conn->query("SELECT COALESCE(SUM(jumlah),0) as total FROM stok_pupuk sp JOIN produk_pupuk pp ON sp.produk_pupuk_id = pp.id WHERE pp.jenis='pupuk_organik'")->fetch_assoc()['total'] ?? 0;
$total_permintaan  = $conn->query("SELECT COUNT(*) as c FROM permintaan_pupuk")->fetch_assoc()['c'] ?? 0;
$total_distribusi  = $conn->query("SELECT COUNT(*) as c FROM distribusi_pupuk WHERE status='diterima'")->fetch_assoc()['c'] ?? 0;

// 3. Aktivitas Terkini (Panen & Permintaan Pupuk)
$recent_panen = $conn->query("
    SELECT p.*, pt.nama as nama_petani, k.nama as nama_komoditas 
    FROM panen p 
    JOIN petani pt ON p.petani_id = pt.id 
    JOIN komoditas k ON p.komoditas_id = k.id 
    ORDER BY p.tanggal_panen DESC LIMIT 5
");

$recent_req = $conn->query("
    SELECT req.*, p.nama, prd.nama_produk, dp.jumlah, dp.satuan 
    FROM permintaan_pupuk req 
    JOIN petani p ON req.petani_id = p.id 
    LEFT JOIN detail_permintaan_pupuk dp ON dp.permintaan_id = req.id 
    LEFT JOIN produk_pupuk prd ON dp.produk_pupuk_id = prd.id 
    ORDER BY req.id DESC LIMIT 5
");

include 'includes/header.php';
$flash = getFlash();
?>

<?php if ($flash): ?>
    <div style="padding:14px 20px; background: <?= $flash['type'] == 'success' ? '#dcfce7' : '#fee2e2' ?>; color: <?= $flash['type'] == 'success' ? '#15803d' : '#b91c1c' ?>; border-radius:12px; margin-bottom:24px; font-weight:600; font-size:0.86rem; display:flex; align-items:center; gap:10px; border: 1px solid <?= $flash['type'] == 'success' ? '#86efac' : '#fca5a5' ?>;">
        <i class="fa-solid <?= $flash['type'] == 'success' ? 'fa-circle-check' : 'fa-circle-exclamation' ?>"></i>
        <span><?= $flash['message'] ?></span>
    </div>
<?php endif; ?>

<!-- PAGE HEADER -->
<div class="page-header">
    <div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span class="badge badge-purple" style="font-size:0.72rem;"><i class="fa-solid fa-shield-halved me-1"></i> Panel Kendali Pertanian</span>
            <span class="badge badge-success" style="font-size:0.72rem;"><i class="fa-solid fa-cloud me-1"></i> Cloud Hosting Mode</span>
        </div>
        <h3 style="font-size:1.45rem; font-weight:800; color:var(--text-dark); letter-spacing:-0.02em;">
            Dashboard AgroMukti Argamukti
        </h3>
        <p style="font-size:0.84rem; color:var(--text-muted);">
            Sistem Informasi Pertanian Terpadu, Pencatatan Lahan & Hasil Panen, serta Manajemen Distribusi Pupuk Organik Desa.
        </p>
    </div>

    <div style="display:flex; gap:10px; align-items:center;">
        <a href="laporan.php" class="btn btn-outline" style="font-size:0.82rem;">
            <i class="fa-solid fa-file-chart-pie me-1"></i> Cetak Laporan
        </a>
        <a href="permintaan_pupuk.php" class="btn btn-primary" style="font-size:0.82rem;">
            <i class="fa-solid fa-plus me-1"></i> Kelola Permintaan
        </a>
    </div>
</div>

<?php if ($is_admin): ?>
<!-- INTEGRASI KKM WIDGET -->
<?php 
    $kkm_stok = getKkmPupukStock(); 
    $kkm_conn_check = @new mysqli('localhost', 'root', '', 'db_prokerkkm');
    $jml_umkm = 0;
    if (!$kkm_conn_check->connect_error) {
        $jml_umkm = $kkm_conn_check->query("SELECT COUNT(*) as c FROM produk")->fetch_assoc()['c'] ?? 0;
        $kkm_conn_check->close();
    }
?>
<div class="card" style="margin-bottom: 24px; border: 1px solid #14b8a6; background: rgba(20, 184, 166, 0.05);">
    <div style="padding: 15px; display:flex; justify-content:space-between; align-items:center;">
        <div>
            <h4 style="margin-bottom: 5px; font-size: 1.1rem; color: #0f766e;"><i class="fa-solid fa-satellite-dish me-2"></i> Modul Terintegrasi: Proker KKM Mahasiswa</h4>
            <div style="font-size: 0.85rem; color: #64748b;">Akses langsung ke sistem Bank Sampah & Katalog UMKM dari Desa Argamukti</div>
        </div>
        <div style="display: flex; gap: 15px;">
            <a href="kkm_buat_pupuk.php" class="btn btn-primary" style="background:#0f766e; border:none; padding:10px 15px;">
                <i class="fa-solid fa-flask"></i> Bank Sampah (<?= number_format($kkm_stok['pupuk_cair'] ?? 0) ?> L / <?= number_format($kkm_stok['pupuk_kasar'] ?? 0) ?> KG)
            </a>
            <a href="kkm_umkm.php" class="btn btn-primary" style="background:#7c3aed; border:none; padding:10px 15px;">
                <i class="fa-solid fa-store"></i> UMKM (<?= $jml_umkm ?> Produk)
            </a>
        </div>
    </div>
</div>
<?php endif; ?>

<!-- STATS CARDS -->
<div class="stats-row" style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px;">
    <!-- CARD 1: PETANI -->
    <div class="stat-card" style="display:flex; align-items:center; gap:16px; background:var(--card-dark); padding:20px; border-radius:12px; border:1px solid var(--border-dark);">
        <div class="stat-icon purple" style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(124,58,237,0.15); color:#7c3aed; font-size:1.3rem;"><i class="fa-solid fa-users"></i></div>
        <div class="stat-info">
            <div class="label" style="font-size:0.75rem; color:var(--text-sub);">Petani Terdaftar</div>
            <div class="value" style="font-size:1.4rem; font-weight:800;"><?= $total_petani ?> <small style="font-size:0.8rem; font-weight:500;">petani</small></div>
            <div class="subtext" style="font-size:0.7rem; color:var(--text-sub);"><i class="fa-solid fa-map me-1"></i> <?= formatNumber($total_lahan, 0) ?> m² lahan</div>
        </div>
    </div>

    <!-- CARD 2: HASIL PANEN -->
    <div class="stat-card" style="display:flex; align-items:center; gap:16px; background:var(--card-dark); padding:20px; border-radius:12px; border:1px solid var(--border-dark);">
        <div class="stat-icon amber" style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(245,158,11,0.15); color:#f59e0b; font-size:1.3rem;"><i class="fa-solid fa-wheat-awn"></i></div>
        <div class="stat-info">
            <div class="label" style="font-size:0.75rem; color:var(--text-sub);">Hasil Panen Sayur</div>
            <div class="value" style="font-size:1.4rem; font-weight:800;"><?= formatNumber($total_panen, 0) ?> <small style="font-size:0.8rem; font-weight:500;">kg</small></div>
            <div class="subtext" style="font-size:0.7rem; color:var(--text-sub);"><i class="fa-solid fa-tag me-1"></i> <?= $total_komoditas ?> komoditas utama</div>
        </div>
    </div>

    <!-- CARD 3: STOK KOMPOS -->
    <div class="stat-card" style="display:flex; align-items:center; gap:16px; background:var(--card-dark); padding:20px; border-radius:12px; border:1px solid var(--border-dark);">
        <div class="stat-icon teal" style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(20,184,166,0.15); color:#14b8a6; font-size:1.3rem;"><i class="fa-solid fa-seedling"></i></div>
        <div class="stat-info">
            <div class="label" style="font-size:0.75rem; color:var(--text-sub);">Stok Pupuk Kompos</div>
            <div class="value" style="font-size:1.4rem; font-weight:800;"><?= formatNumber($stok_kompos, 0) ?> <small style="font-size:0.8rem; font-weight:500;">kg</small></div>
            <div class="subtext" style="font-size:0.7rem; color:var(--text-sub);"><i class="fa-solid fa-arrows-spin me-1"></i> Dari pengolahan organik</div>
        </div>
    </div>

    <!-- CARD 4: STOK POC -->
    <div class="stat-card" style="display:flex; align-items:center; gap:16px; background:var(--card-dark); padding:20px; border-radius:12px; border:1px solid var(--border-dark);">
        <div class="stat-icon blue" style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(2,132,199,0.15); color:#0284c7; font-size:1.3rem;"><i class="fa-solid fa-droplet"></i></div>
        <div class="stat-info">
            <div class="label" style="font-size:0.75rem; color:var(--text-sub);">Stok Pupuk Cair (POC)</div>
            <div class="value" style="font-size:1.4rem; font-weight:800;"><?= formatNumber($stok_cair, 0) ?> <small style="font-size:0.8rem; font-weight:500;">liter</small></div>
            <div class="subtext" style="font-size:0.7rem; color:var(--text-sub);"><i class="fa-solid fa-truck me-1"></i> Penyaluran terpantau</div>
        </div>
    </div>
</div>

<!-- CHART.JS GRAFIK PANEN -->
<div class="card" style="background:var(--card-dark); border:1px solid var(--border-dark); margin-bottom:24px; padding:20px; border-radius:12px;">
    <div class="card-header" style="border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:12px; margin-bottom:16px;">
        <h4 class="card-title" style="color:white; font-size:1.05rem; font-weight:700;"><i class="fa-solid fa-chart-column me-2" style="color:var(--primary-light);"></i> Grafik Panen Per Bulan</h4>
    </div>
    <div class="card-body">
        <canvas id="panenChart" height="80"></canvas>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
    // Data untuk grafik diambil dari database (contoh statis untuk KKM)
    const ctx = document.getElementById('panenChart').getContext('2d');
    const panenChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [{
                label: 'Total Panen (Kg)',
                data: [150, 200, 180, 220, 300, 280, 350, 400, 0, 0, 0, 0],
                backgroundColor: 'rgba(20, 184, 166, 0.6)',
                borderColor: 'rgba(20, 184, 166, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { labels: { color: 'white' } }
            }
        }
    });
</script>

<!-- DUAL TABLES -->
<div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:24px;">
    <!-- PANEN TERBARU -->
    <div class="card" style="margin-bottom:0; background:var(--card-dark); border:1px solid var(--border-dark); border-radius:12px; padding:20px;">
        <div class="card-header" style="display:flex; justify-content:between; align-items:center; margin-bottom:12px;">
            <div>
                <h4 class="card-title" style="font-size:0.95rem; font-weight:700; color:var(--text-dark);"><i class="fa-solid fa-wheat-awn me-2" style="color:var(--primary);"></i> Pencatatan Panen Terbaru</h4>
                <span class="card-subtitle" style="font-size:0.72rem; color:var(--text-sub);">Hasil panen sayur hortikultura</span>
            </div>
            <a href="panen.php" class="btn btn-sm btn-outline" style="font-size:0.72rem; padding:4px 8px;">Lihat Semua</a>
        </div>
        <div class="table-wrapper">
            <table class="data-table" style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                <thead>
                    <tr style="text-align:left; color:var(--text-sub); border-bottom:1px solid var(--border-dark);">
                        <th style="padding:8px 0;">Petani</th>
                        <th>Komoditas</th>
                        <th>Berat</th>
                        <th>Tanggal</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($recent_panen->num_rows > 0): ?>
                        <?php while ($p = $recent_panen->fetch_assoc()): ?>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                            <td style="padding:10px 0; font-weight:600;"><?= htmlspecialchars($p['nama_petani']) ?></td>
                            <td><span class="badge badge-success" style="font-size:0.68rem;"><?= htmlspecialchars($p['nama_komoditas']) ?></span></td>
                            <td style="font-weight:700; color:var(--primary-light);"><?= formatNumber($p['jumlah_panen'], 0) ?> kg</td>
                            <td style="color:var(--text-sub);"><?= date('d/m/y', strtotime($p['tanggal_panen'])) ?></td>
                        </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr><td colspan="4" class="text-center text-muted" style="padding:20px;">Belum ada catatan hasil panen.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- PERMINTAAN PUPUK -->
    <div class="card" style="margin-bottom:0; background:var(--card-dark); border:1px solid var(--border-dark); border-radius:12px; padding:20px;">
        <div class="card-header" style="display:flex; justify-content:between; align-items:center; margin-bottom:12px;">
            <div>
                <h4 class="card-title" style="font-size:0.95rem; font-weight:700; color:var(--text-dark);"><i class="fa-solid fa-hand-holding-hand me-2" style="color:var(--secondary);"></i> Permintaan Pupuk Petani</h4>
                <span class="card-subtitle" style="font-size:0.72rem; color:var(--text-sub);">Pengajuan pupuk organik terbaru</span>
            </div>
            <a href="permintaan_pupuk.php" class="btn btn-sm btn-outline" style="font-size:0.72rem; padding:4px 8px;">Lihat Semua</a>
        </div>
        <div class="table-wrapper">
            <table class="data-table" style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                <thead>
                    <tr style="text-align:left; color:var(--text-sub); border-bottom:1px solid var(--border-dark);">
                        <th style="padding:8px 0;">Kode</th>
                        <th>Petani</th>
                        <th>Alokasi</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($recent_req->num_rows > 0): ?>
                        <?php while ($req = $recent_req->fetch_assoc()): ?>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                            <td style="padding:10px 0;"><code><?= $req['kode_permintaan'] ?></code></td>
                            <td style="font-weight:600;"><?= htmlspecialchars($req['nama']) ?></td>
                            <td><?= formatNumber($req['jumlah'], 0) ?> <?= $req['satuan'] ?? 'kg' ?></td>
                            <td>
                                <?php 
                                $bclass = 'badge-warning';
                                if ($req['status'] === 'disetujui') $bclass = 'badge-success';
                                if ($req['status'] === 'ditolak') $bclass = 'badge-danger';
                                if ($req['status'] === 'selesai') $bclass = 'badge-info';
                                ?>
                                <span class="badge <?= $bclass ?>" style="font-size:0.65rem;"><?= strtoupper($req['status']) ?></span>
                            </td>
                        </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr><td colspan="4" class="text-center text-muted" style="padding:20px;">Belum ada permohonan pupuk.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

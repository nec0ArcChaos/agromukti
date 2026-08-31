<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$page_title = "Laporan Pertanian & Pupuk";

// Hanya admin yang boleh akses
if (($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: dashboard.php"); exit;
}

$tgl_mulai = $_GET['tgl_mulai'] ?? date('Y-m-01');
$tgl_selesai = $_GET['tgl_selesai'] ?? date('Y-m-d');

// Query Rekap Pertanian & Pupuk
$total_petani = $conn->query("SELECT COUNT(*) as c FROM petani WHERE status='aktif'")->fetch_assoc()['c'] ?? 0;
$total_lahan = $conn->query("SELECT COALESCE(SUM(luas),0) as total FROM lahan WHERE status='aktif'")->fetch_assoc()['total'] ?? 0;

$rekap_panen = $conn->query("
    SELECT COUNT(*) as total_trx, COALESCE(SUM(jumlah_panen),0) as total_berat 
    FROM panen 
    WHERE tanggal_panen BETWEEN '$tgl_mulai' AND '$tgl_selesai'
")->fetch_assoc();

$rekap_distribusi = $conn->query("
    SELECT COUNT(*) as total_dist, COALESCE(SUM(dd.jumlah),0) as total_vol 
    FROM distribusi_pupuk d 
    JOIN detail_distribusi_pupuk dd ON dd.distribusi_id=d.id 
    WHERE d.status='diterima' AND d.tanggal_distribusi BETWEEN '$tgl_mulai' AND '$tgl_selesai'
")->fetch_assoc();

include 'includes/header.php';
$flash = getFlash();
?>

<?php if ($flash): ?>
    <div style="padding:12px 18px; background: <?= $flash['type'] == 'success' ? '#dcfce7' : '#fee2e2' ?>; color: <?= $flash['type'] == 'success' ? '#15803d' : '#b91c1c' ?>; border-radius:10px; margin-bottom:20px; font-weight:600; font-size:0.84rem;">
        <i class="fa-solid <?= $flash['type'] == 'success' ? 'fa-circle-check' : 'fa-circle-exclamation' ?> me-2"></i><?= $flash['message'] ?>
    </div>
<?php endif; ?>

<div class="page-header">
    <div>
        <h3>Laporan Resmi Pertanian & Pupuk Argamukti</h3>
        <p>Rekapitulasi berkas hasil panen komoditas hortikultura serta penyaluran pupuk organik tingkat desa</p>
    </div>
    <button class="btn btn-primary" onclick="window.print()">
        <i class="fa-solid fa-print me-1"></i> Cetak Laporan
    </button>
</div>

<!-- FILTER RENTANG TANGGAL -->
<div class="card" style="margin-bottom:24px;">
    <div class="card-body">
        <form action="laporan.php" method="GET" class="form-grid" style="align-items:end; display:grid; grid-template-columns:1fr 1fr 0.5fr; gap:16px;">
            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Tanggal Mulai</label>
                <input type="date" name="tgl_mulai" class="form-control" value="<?= htmlspecialchars($tgl_mulai) ?>">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Tanggal Selesai</label>
                <input type="date" name="tgl_selesai" class="form-control" value="<?= htmlspecialchars($tgl_selesai) ?>">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <button type="submit" class="btn btn-primary" style="width:100%; padding:10px 0;">
                    <i class="fa-solid fa-filter me-1"></i> Tampilkan
                </button>
            </div>
        </form>
    </div>
</div>

<!-- STATS RINGKASAN REKAPITULASI -->
<div class="stats-row" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px; margin-bottom:24px;">
    <div class="stat-card" style="display:flex; align-items:center; gap:16px; background:var(--card-dark); padding:20px; border-radius:12px; border:1px solid var(--border-dark);">
        <div class="stat-icon purple" style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(124,58,237,0.15); color:#7c3aed; font-size:1.3rem;"><i class="fa-solid fa-users"></i></div>
        <div class="stat-info">
            <div class="label" style="font-size:0.75rem; color:var(--text-sub);">Petani Aktif</div>
            <div class="value" style="font-size:1.4rem; font-weight:800;"><?= $total_petani ?> <small style="font-size:0.8rem; font-weight:500;">org</small></div>
            <div class="subtext" style="font-size:0.7rem; color:var(--text-sub);"><?= formatNumber($total_lahan, 0) ?> m² luas lahan</div>
        </div>
    </div>

    <div class="stat-card" style="display:flex; align-items:center; gap:16px; background:var(--card-dark); padding:20px; border-radius:12px; border:1px solid var(--border-dark);">
        <div class="stat-icon amber" style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(245,158,11,0.15); color:#f59e0b; font-size:1.3rem;"><i class="fa-solid fa-wheat-awn"></i></div>
        <div class="stat-info">
            <div class="label" style="font-size:0.75rem; color:var(--text-sub);">Volume Panen</div>
            <div class="value" style="font-size:1.4rem; font-weight:800;"><?= formatNumber($rekap_panen['total_berat'], 0) ?> <small style="font-size:0.8rem; font-weight:500;">kg</small></div>
            <div class="subtext" style="font-size:0.7rem; color:var(--text-sub);"><?= $rekap_panen['total_trx'] ?> catatan panen</div>
        </div>
    </div>

    <div class="stat-card" style="display:flex; align-items:center; gap:16px; background:var(--card-dark); padding:20px; border-radius:12px; border:1px solid var(--border-dark);">
        <div class="stat-icon blue" style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(2,132,199,0.15); color:#0284c7; font-size:1.3rem;"><i class="fa-solid fa-truck-ramp-box"></i></div>
        <div class="stat-info">
            <div class="label" style="font-size:0.75rem; color:var(--text-sub);">Pupuk Disalurkan</div>
            <div class="value" style="font-size:1.4rem; font-weight:800;"><?= formatNumber($rekap_distribusi['total_vol'], 0) ?> <small style="font-size:0.8rem; font-weight:500;">kg</small></div>
            <div class="subtext" style="font-size:0.7rem; color:var(--text-sub);"><?= $rekap_distribusi['total_dist'] ?> batch salur</div>
        </div>
    </div>

    <div class="stat-card" style="display:flex; align-items:center; gap:16px; background:var(--card-dark); padding:20px; border-radius:12px; border:1px solid var(--border-dark);">
        <div class="stat-icon teal" style="width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(20,184,166,0.15); color:#14b8a6; font-size:1.3rem;"><i class="fa-solid fa-file-signature"></i></div>
        <div class="stat-info">
            <div class="label" style="font-size:0.75rem; color:var(--text-sub);">Periode Rekap</div>
            <div class="value" style="font-size:0.95rem; font-weight:800; padding:4px 0;"><?= date('d/m/Y', strtotime($tgl_mulai)) ?></div>
            <div class="subtext" style="font-size:0.7rem; color:var(--text-sub);">s/d <?= date('d/m/Y', strtotime($tgl_selesai)) ?></div>
        </div>
    </div>
</div>

<!-- REKAP HASIL PANEN -->
<div class="card" style="margin-bottom:24px; background:var(--card-dark); border:1px solid var(--border-dark); border-radius:12px; padding:20px;">
    <div class="card-header" style="margin-bottom:12px;">
        <h4 class="card-title" style="font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-wheat-awn me-2" style="color:var(--primary);"></i> Laporan Rekapitulasi Hasil Panen Petani</h4>
    </div>
    <div class="table-wrapper">
        <table class="data-table" style="width:100%; border-collapse:collapse; font-size:0.8rem;">
            <thead>
                <tr style="text-align:left; color:var(--text-sub); border-bottom:1px solid var(--border-dark);">
                    <th style="padding:10px 0;">No</th>
                    <th>Tanggal</th>
                    <th>Nama Petani</th>
                    <th>Komoditas</th>
                    <th>Hasil Panen (Kg)</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $panen_q = $conn->query("
                    SELECT p.*, pt.nama as nama_petani, k.nama as nama_komoditas 
                    FROM panen p 
                    JOIN petani pt ON p.petani_id = pt.id 
                    JOIN komoditas k ON p.komoditas_id = k.id 
                    WHERE p.tanggal_panen BETWEEN '$tgl_mulai' AND '$tgl_selesai' 
                    ORDER BY p.tanggal_panen DESC
                ");
                $no = 1;
                if ($panen_q && $panen_q->num_rows > 0):
                    while ($r = $panen_q->fetch_assoc()):
                ?>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                    <td style="padding:10px 0;"><?= $no++ ?></td>
                    <td><?= date('d/m/Y', strtotime($r['tanggal_panen'])) ?></td>
                    <td class="fw-bold"><?= htmlspecialchars($r['nama_petani']) ?></td>
                    <td><span class="badge badge-success" style="font-size:0.65rem;"><?= htmlspecialchars($r['nama_komoditas']) ?></span></td>
                    <td class="fw-bold" style="color:var(--primary-light);"><?= formatNumber($r['jumlah_panen'], 0) ?> kg</td>
                    <td style="color:var(--text-sub);"><?= htmlspecialchars($r['keterangan'] ?: '—') ?></td>
                </tr>
                <?php 
                    endwhile;
                else:
                ?>
                    <tr><td colspan="6" class="text-center text-muted" style="padding:20px;">Tidak ada data panen dalam periode ini.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- REKAP PENYALURAN PUPUK -->
<div class="card" style="background:var(--card-dark); border:1px solid var(--border-dark); border-radius:12px; padding:20px;">
    <div class="card-header" style="margin-bottom:12px;">
        <h4 class="card-title" style="font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-truck-ramp-box me-2" style="color:var(--secondary);"></i> Laporan Rekapitulasi Distribusi & Penyaluran Pupuk</h4>
    </div>
    <div class="table-wrapper">
        <table class="data-table" style="width:100%; border-collapse:collapse; font-size:0.8rem;">
            <thead>
                <tr style="text-align:left; color:var(--text-sub); border-bottom:1px solid var(--border-dark);">
                    <th style="padding:10px 0;">No</th>
                    <th>Kode Distribusi</th>
                    <th>Petani Penerima</th>
                    <th>Produk Pupuk</th>
                    <th>Jumlah Volume</th>
                    <th>Tanggal Penyaluran</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $dist_q = $conn->query("
                    SELECT d.*, p.nama as nama_petani, prd.nama_produk, dd.jumlah, dd.satuan 
                    FROM distribusi_pupuk d 
                    JOIN permintaan_pupuk req ON d.permintaan_id = req.id 
                    JOIN petani p ON req.petani_id = p.id 
                    JOIN detail_distribusi_pupuk dd ON dd.distribusi_id = d.id 
                    JOIN produk_pupuk prd ON dd.produk_pupuk_id = prd.id 
                    WHERE d.tanggal_distribusi BETWEEN '$tgl_mulai' AND '$tgl_selesai' 
                    ORDER BY d.tanggal_distribusi DESC
                ");
                $no = 1;
                if ($dist_q && $dist_q->num_rows > 0):
                    while ($r = $dist_q->fetch_assoc()):
                ?>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.02);">
                    <td style="padding:10px 0;"><?= $no++ ?></td>
                    <td><code><?= $r['kode_distribusi'] ?></code></td>
                    <td class="fw-bold"><?= htmlspecialchars($r['nama_petani']) ?></td>
                    <td><?= htmlspecialchars($r['nama_produk']) ?></td>
                    <td class="fw-bold" style="color:var(--accent-blue);"><?= formatNumber($r['jumlah'], 0) ?> <?= $r['satuan'] ?></td>
                    <td><?= date('d/m/Y', strtotime($r['tanggal_distribusi'])) ?></td>
                    <td><span class="badge badge-success" style="font-size:0.65rem;"><?= strtoupper($r['status']) ?></span></td>
                </tr>
                <?php 
                    endwhile;
                else:
                ?>
                    <tr><td colspan="7" class="text-center text-muted" style="padding:20px;">Tidak ada data distribusi pupuk dalam periode ini.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

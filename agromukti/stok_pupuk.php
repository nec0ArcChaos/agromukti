<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$page_title = "Stok Pupuk Desa";

$stok_list = $conn->query("
    SELECT s.*, p.nama_produk, p.jenis, p.harga
    FROM stok_pupuk s
    JOIN produk_pupuk p ON s.produk_pupuk_id = p.id
    ORDER BY s.id DESC
");

include 'includes/header.php';
?>

<div class="page-header">
    <div>
        <h3>Stok Pupuk Real-Time</h3>
        <p>Pemantauan posisi persediaan pupuk hasil produksi desa yang siap disalurkan ke petani</p>
    </div>
</div>

<?php 
// Ambil data stok langsung dari Database KKM (Bank Sampah)
$kkm_stok = getKkmPupukStock(); 
if (empty($kkm_stok['error'])):
?>
<div class="card" style="border-left: 4px solid #14b8a6; margin-bottom: 25px; background: rgba(20, 184, 166, 0.05);">
    <div style="padding: 15px;">
        <h4 style="margin-bottom: 15px; font-size: 1rem;"><i class="fa-solid fa-satellite-dish" style="color: #14b8a6; margin-right: 8px;"></i> Data Terintegrasi: Pusat Produksi Bank Sampah KKM</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; display:flex; align-items:center; gap: 15px;">
                <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(15, 118, 110, 0.1); display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:#0f766e;"><i class="fa-solid fa-flask"></i></div>
                <div>
                    <div style="font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Pupuk Organik Cair (POC)</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #0f172a;"><?= number_format($kkm_stok['pupuk_cair'], 2, ',', '.') ?> <span style="font-size: 0.9rem; font-weight:500; color:#94a3b8;">Liter</span></div>
                </div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; display:flex; align-items:center; gap: 15px;">
                <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(217, 119, 6, 0.1); display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:#d97706;"><i class="fa-solid fa-box"></i></div>
                <div>
                    <div style="font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Pupuk Kompos Kasar</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #0f172a;"><?= number_format($kkm_stok['pupuk_kasar'], 2, ',', '.') ?> <span style="font-size: 0.9rem; font-weight:500; color:#94a3b8;">KG</span></div>
                </div>
            </div>
        </div>
    </div>
</div>
<?php else: ?>
<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> <?= htmlspecialchars($kkm_stok['error']) ?></div>
<?php endif; ?>


<div class="card">
    <div class="card-header">
        <div>
            <h4 class="card-title"><i class="fa-solid fa-cubes-stacked me-2" style="color:var(--primary);"></i> Inventaris Stok Pupuk Siap Salur</h4>
            <span class="card-subtitle">Diperbarui secara otomatis setiap ada penyelesaian produksi atau distribusi</span>
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama Produk Pupuk</th>
                    <th>Jenis</th>
                    <th>Total Jumlah Stok</th>
                    <th>Status Stok</th>
                    <th>Pembaruan Terakhir</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                while ($row = $stok_list->fetch_assoc()): 
                    $jumlah = (float)$row['jumlah'];
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td class="fw-bold"><?= htmlspecialchars($row['nama_produk']) ?></td>
                    <td><span class="badge badge-purple"><?= strtoupper($row['jenis']) ?></span></td>
                    <td><span class="fw-bold" style="font-size:1.1rem; color:var(--primary);"><?= formatNumber($jumlah, 2) ?></span> <?= $row['satuan'] ?></td>
                    <td>
                        <?php if ($jumlah > 500): ?>
                            <span class="badge badge-success"><i class="fa-solid fa-circle-check me-1"></i> Aman</span>
                        <?php elseif ($jumlah > 100): ?>
                            <span class="badge badge-warning"><i class="fa-solid fa-triangle-exclamation me-1"></i> Menipis</span>
                        <?php else: ?>
                            <span class="badge badge-danger"><i class="fa-solid fa-circle-exclamation me-1"></i> Kritis</span>
                        <?php endif; ?>
                    </td>
                    <td><?= date('d M Y H:i', strtotime($row['updated_at'])) ?> WIB</td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

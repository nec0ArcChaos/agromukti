<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$page_title = "Distribusi & Penyaluran Pupuk";

// Update status penyaluran pupuk
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_distribusi'])) {
    $dist_id = (int)$_POST['id'];
    $status  = cleanInput($_POST['status']);

    $conn->query("UPDATE distribusi_pupuk SET status='$status' WHERE id=$dist_id");

    if ($status === 'diterima' || $status === 'dikirim') {
        // Fetch detail distribusi untuk kurangi stok pupuk
        $det_q = $conn->query("SELECT * FROM detail_distribusi_pupuk WHERE distribusi_id=$dist_id");
        while ($d = $det_q->fetch_assoc()) {
            $produk_id = $d['produk_pupuk_id'];
            $jumlah    = $d['jumlah'];

            // Potong stok
            $conn->query("UPDATE stok_pupuk SET jumlah = GREATEST(0, jumlah - $jumlah) WHERE produk_pupuk_id=$produk_id");

            // Catat mutasi keluar
            $dist_row = $conn->query("SELECT kode_distribusi FROM distribusi_pupuk WHERE id=$dist_id")->fetch_assoc();
            $conn->query("INSERT INTO mutasi_stok (produk_pupuk_id, jenis_mutasi, jumlah, sumber, reference_id, tanggal, keterangan) VALUES ($produk_id, 'keluar', $jumlah, 'Penyaluran {$dist_row['kode_distribusi']}', $dist_id, CURDATE(), 'Disalurkan ke kelompok tani / petani pemohon')");
        }
    }

    setFlash('success', "Status distribusi berhasil diperbarui menjadi $status.");
    header("Location: distribusi_pupuk.php");
    exit;
}

if (isset($_GET['delete'])) {
    $del_id = (int)$_GET['delete'];
    $conn->query("DELETE FROM distribusi_pupuk WHERE id=$del_id");
    setFlash('success', 'Data distribusi telah dihapus.');
    header("Location: distribusi_pupuk.php");
    exit;
}

$distribusi_list = $conn->query("
    SELECT d.*, req.kode_permintaan, p.nama as nama_petani, p.nik, dd.jumlah, dd.satuan, prd.nama_produk
    FROM distribusi_pupuk d
    JOIN permintaan_pupuk req ON d.permintaan_id = req.id
    JOIN petani p ON req.petani_id = p.id
    LEFT JOIN detail_distribusi_pupuk dd ON dd.distribusi_id = d.id
    LEFT JOIN produk_pupuk prd ON dd.produk_pupuk_id = prd.id
    ORDER BY d.id DESC
");

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
        <h3>Distribusi & Penyaluran Pupuk Desa</h3>
        <p>Pencatatan penyerahan pupuk ke petani berdasarkan pengajuan yang telah disetujui</p>
    </div>
</div>

<div class="card">
    <div class="card-header">
        <div>
            <h4 class="card-title"><i class="fa-solid fa-truck-ramp-box me-2" style="color:var(--primary);"></i> Log Penyaluran Pupuk Desa</h4>
            <span class="card-subtitle">Status pengiriman dan penerimaan pupuk oleh kelompok tani</span>
        </div>
        <div class="search-input">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="searchDist" placeholder="Cari Kode Distribusi / Petani..." onkeyup="filterTable('searchDist', 'tableDist')">
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table" id="tableDist">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Kode Penyaluran</th>
                    <th>Tgl Distribusi</th>
                    <th>Penerima (Petani)</th>
                    <th>Produk Pupuk</th>
                    <th>Volume Disalurkan</th>
                    <th>Status Penyaluran</th>
                    <th style="text-align:right;">Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                while ($row = $distribusi_list->fetch_assoc()): 
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td><code><?= $row['kode_distribusi'] ?></code></td>
                    <td><?= date('d/m/Y', strtotime($row['tanggal_distribusi'])) ?></td>
                    <td class="fw-bold"><?= htmlspecialchars($row['nama_petani']) ?></td>
                    <td><?= htmlspecialchars($row['nama_produk'] ?? 'Pupuk Kompos Desa') ?></td>
                    <td><span class="fw-bold" style="color:var(--primary);"><?= formatNumber($row['jumlah'], 2) ?></span> <?= $row['satuan'] ?? 'kg' ?></td>
                    <td>
                        <span class="badge badge-<?= $row['status'] ?>">
                            <?= strtoupper($row['status']) ?>
                        </span>
                    </td>
                    <td style="text-align:right;">
                        <?php if ($row['status'] === 'diproses' || $row['status'] === 'dikirim'): ?>
                            <form action="distribusi_pupuk.php" method="POST" style="display:inline-block;">
                                <input type="hidden" name="update_distribusi" value="1">
                                <input type="hidden" name="id" value="<?= $row['id'] ?>">
                                <input type="hidden" name="status" value="diterima">
                                <button type="submit" class="btn btn-sm btn-primary"><i class="fa-solid fa-circle-check me-1"></i> Konfirmasi Diterima</button>
                            </form>
                        <?php endif; ?>
                        <a href="distribusi_pupuk.php?delete=<?= $row['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Hapus record distribusi ini?')">
                            <i class="fa-solid fa-trash"></i>
                        </a>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

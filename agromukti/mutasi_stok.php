<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$page_title = "Mutasi Stok Pupuk";

// Hanya admin yang boleh akses
if (($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: dashboard.php"); exit;
}

// Handle manual penyesuaian stok
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_mutasi'])) {
    $produk_pupuk_id = (int)$_POST['produk_pupuk_id'];
    $jenis_mutasi    = cleanInput($_POST['jenis_mutasi']);
    $jumlah          = (float)$_POST['jumlah'];
    $sumber          = cleanInput($_POST['sumber']);
    $keterangan      = cleanInput($_POST['keterangan']);
    $tanggal         = cleanInput($_POST['tanggal']);

    // Insert Mutasi
    $conn->query("INSERT INTO mutasi_stok (produk_pupuk_id, jenis_mutasi, jumlah, sumber, tanggal, keterangan) VALUES ($produk_pupuk_id, '$jenis_mutasi', $jumlah, '$sumber', '$tanggal', '$keterangan')");

    // Adjust Stok Pupuk
    if ($jenis_mutasi === 'masuk') {
        $conn->query("UPDATE stok_pupuk SET jumlah = jumlah + $jumlah WHERE produk_pupuk_id=$produk_pupuk_id");
    } elseif ($jenis_mutasi === 'keluar') {
        $conn->query("UPDATE stok_pupuk SET jumlah = GREATEST(0, jumlah - $jumlah) WHERE produk_pupuk_id=$produk_pupuk_id");
    } elseif ($jenis_mutasi === 'penyesuaian') {
        $conn->query("UPDATE stok_pupuk SET jumlah = $jumlah WHERE produk_pupuk_id=$produk_pupuk_id");
    }

    setFlash('success', 'Mutasi stok pupuk berhasil dicatat!');
    header("Location: mutasi_stok.php");
    exit;
}

$mutasi_list = $conn->query("
    SELECT m.*, p.nama_produk, p.satuan
    FROM mutasi_stok m
    JOIN produk_pupuk p ON m.produk_pupuk_id = p.id
    ORDER BY m.id DESC
");

$produk_opt = $conn->query("SELECT id, nama_produk FROM produk_pupuk WHERE status='aktif'");

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
        <h3>Riwayat Mutasi Stok Pupuk</h3>
        <p>Jurnal pencatatan keluar-masuk persediaan pupuk desa (Produksi, Penyaluran, & Opname)</p>
    </div>
    <button class="btn btn-primary" onclick="openModal('modalMutasi')">
        <i class="fa-solid fa-plus-circle"></i> Catat Mutasi Manual
    </button>
</div>

<div class="card">
    <div class="card-header">
        <div>
            <h4 class="card-title"><i class="fa-solid fa-list-check me-2" style="color:var(--primary);"></i> Log Mutasi Stok Pupuk</h4>
            <span class="card-subtitle">Semua riwayat perubahan volume stok pupuk</span>
        </div>
        <div class="search-input">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="searchMutasi" placeholder="Cari sumber / keterangan..." onkeyup="filterTable('searchMutasi', 'tableMutasi')">
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table" id="tableMutasi">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Tanggal</th>
                    <th>Nama Produk Pupuk</th>
                    <th>Jenis Mutasi</th>
                    <th>Jumlah</th>
                    <th>Sumber / Referensi</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                while ($row = $mutasi_list->fetch_assoc()): 
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td><?= date('d/m/Y', strtotime($row['tanggal'])) ?></td>
                    <td class="fw-bold"><?= htmlspecialchars($row['nama_produk']) ?></td>
                    <td>
                        <span class="badge badge-<?= $row['jenis_mutasi'] === 'masuk' ? 'success' : ($row['jenis_mutasi'] === 'keluar' ? 'danger' : 'info') ?>">
                            <i class="fa-solid <?= $row['jenis_mutasi'] === 'masuk' ? 'fa-arrow-down-left' : ($row['jenis_mutasi'] === 'keluar' ? 'fa-arrow-up-right' : 'fa-sliders') ?> me-1"></i><?= strtoupper($row['jenis_mutasi']) ?>
                        </span>
                    </td>
                    <td><span class="fw-bold"><?= formatNumber($row['jumlah'], 2) ?></span> <?= $row['satuan'] ?></td>
                    <td><?= htmlspecialchars($row['sumber']) ?></td>
                    <td><?= htmlspecialchars($row['keterangan']) ?></td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- MODAL TAMBAH MUTASI -->
<div class="modal-overlay" id="modalMutasi">
    <div class="modal-box">
        <div class="modal-header">
            <h5><i class="fa-solid fa-sliders me-2"></i> Catat Mutasi Stok Manual</h5>
            <button class="modal-close" onclick="closeModal('modalMutasi')">&times;</button>
        </div>
        <form action="mutasi_stok.php" method="POST">
            <input type="hidden" name="add_mutasi" value="1">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Produk Pupuk</label>
                    <select name="produk_pupuk_id" class="form-select" required>
                        <option value="">-- Pilih Produk Pupuk --</option>
                        <?php while ($p = $produk_opt->fetch_assoc()): ?>
                            <option value="<?= $p['id'] ?>"><?= htmlspecialchars($p['nama_produk']) ?></option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Jenis Mutasi</label>
                        <select name="jenis_mutasi" class="form-select" required>
                            <option value="masuk">Masuk (+)</option>
                            <option value="keluar">Keluar (-)</option>
                            <option value="penyesuaian">Penyesuaian Opname</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Jumlah (Kg/Liter)</label>
                        <input type="number" step="0.1" name="jumlah" class="form-control" placeholder="Contoh: 50" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Tanggal</label>
                    <input type="date" name="tanggal" class="form-control" value="<?= date('Y-m-d') ?>" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Sumber Mutasi</label>
                    <input type="text" name="sumber" class="form-control" placeholder="Contoh: Penyesuaian Stok Gudang">
                </div>
                <div class="form-group">
                    <label class="form-label">Keterangan Alasan</label>
                    <textarea name="keterangan" class="form-control" placeholder="Catatan opsional..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalMutasi')">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Mutasi</button>
            </div>
        </form>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

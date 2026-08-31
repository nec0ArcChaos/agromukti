<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$page_title = "Katalog Produk Pupuk";

// Hanya admin yang boleh akses
if (($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: dashboard.php"); exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id          = (int)($_POST['id'] ?? 0);
    $nama_produk = cleanInput($_POST['nama_produk']);
    $jenis       = cleanInput($_POST['jenis']);
    $deskripsi   = cleanInput($_POST['deskripsi']);
    $harga       = (float)$_POST['harga'];
    $satuan      = cleanInput($_POST['satuan']);
    $status      = cleanInput($_POST['status'] ?? 'aktif');

    if ($id > 0) {
        $conn->query("UPDATE produk_pupuk SET nama_produk='$nama_produk', jenis='$jenis', deskripsi='$deskripsi', harga=$harga, satuan='$satuan', status='$status' WHERE id=$id");
        setFlash('success', 'Produk pupuk berhasil diperbarui!');
    } else {
        $conn->query("INSERT INTO produk_pupuk (nama_produk, jenis, deskripsi, harga, satuan, status) VALUES ('$nama_produk', '$jenis', '$deskripsi', $harga, '$satuan', '$status')");
        $produk_id = $conn->insert_id;
        // Create initial stock record
        $conn->query("INSERT INTO stok_pupuk (produk_pupuk_id, jumlah, satuan) VALUES ($produk_id, 0, '$satuan')");
        setFlash('success', 'Produk pupuk baru berhasil ditambahkan!');
    }
    header("Location: produk_pupuk.php");
    exit;
}

if (isset($_GET['delete'])) {
    $del_id = (int)$_GET['delete'];
    $conn->query("DELETE FROM produk_pupuk WHERE id=$del_id");
    setFlash('success', 'Produk pupuk telah dihapus.');
    header("Location: produk_pupuk.php");
    exit;
}

$produk_list = $conn->query("SELECT p.*, COALESCE(s.jumlah, 0) as total_stok FROM produk_pupuk p LEFT JOIN stok_pupuk s ON s.produk_pupuk_id = p.id ORDER BY p.id DESC");

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
        <h3>Katalog Produk Pupuk Desa</h3>
        <p>Daftar jenis dan formulasi produk pupuk organik yang diproduksi dan disalurkan ke petani Desa Argamukti.</p>
    </div>
    <button class="btn btn-primary" onclick="openModal('modalProdukPupuk')">
        <i class="fa-solid fa-plus-circle"></i> Tambah Produk Pupuk
    </button>
</div>

<div class="card">
    <div class="card-header">
        <div>
            <h4 class="card-title"><i class="fa-solid fa-box-open me-2" style="color:var(--primary);"></i> Master Data Produk Pupuk</h4>
            <span class="card-subtitle">Semua varian pupuk organik yang dapat disalurkan ke petani desa</span>
        </div>
        <div class="search-input">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="searchPupuk" placeholder="Cari nama produk..." onkeyup="filterTable('searchPupuk', 'tablePupuk')">
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table" id="tablePupuk">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama Produk Pupuk</th>
                    <th>Jenis</th>
                    <th>Harga Distribusi</th>
                    <th>Stok Saat Ini</th>
                    <th>Status</th>
                    <th style="text-align:right;">Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                while ($row = $produk_list->fetch_assoc()): 
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td class="fw-bold"><?= htmlspecialchars($row['nama_produk']) ?><br><small class="text-muted"><?= htmlspecialchars($row['deskripsi']) ?></small></td>
                    <td>
                        <span class="badge badge-purple">
                            <?= strtoupper($row['jenis']) ?>
                        </span>
                    </td>
                    <td><span class="fw-bold" style="color:var(--primary);"><?= formatRupiah($row['harga']) ?></span> / <?= $row['satuan'] ?></td>
                    <td><span class="fw-bold"><?= formatNumber($row['total_stok'], 2) ?></span> <?= $row['satuan'] ?></td>
                    <td>
                        <span class="badge <?= $row['status'] === 'aktif' ? 'badge-success' : 'badge-danger' ?>">
                            <?= strtoupper($row['status']) ?>
                        </span>
                    </td>
                    <td style="text-align:right;">
                        <a href="produk_pupuk.php?delete=<?= $row['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Yakin hapus produk pupuk ini?')">
                            <i class="fa-solid fa-trash"></i>
                        </a>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- MODAL TAMBAH PRODUK PUPUK -->
<div class="modal-overlay" id="modalProdukPupuk">
    <div class="modal-box">
        <div class="modal-header">
            <h5><i class="fa-solid fa-box-open me-2"></i> Tambah Produk Pupuk Baru</h5>
            <button class="modal-close" onclick="closeModal('modalProdukPupuk')">&times;</button>
        </div>
        <form action="produk_pupuk.php" method="POST">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Nama Produk Pupuk</label>
                    <input type="text" name="nama_produk" class="form-control" placeholder="Contoh: Pupuk Kompos Organik Super" required>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Jenis</label>
                        <select name="jenis" class="form-select" required>
                            <option value="kompos">Kompos</option>
                            <option value="pupuk_organik">Pupuk Organik Cair</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Satuan</label>
                        <input type="text" name="satuan" class="form-control" value="kg" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Harga Subsidi / HET (Rp)</label>
                    <input type="number" step="100" name="harga" class="form-control" placeholder="Contoh: 1500" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Deskripsi & Keunggulan</label>
                    <textarea name="deskripsi" class="form-control" placeholder="Penjelasan kandungan nutrisi..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalProdukPupuk')">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Produk Pupuk</button>
            </div>
        </form>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

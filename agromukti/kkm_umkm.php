<?php
session_start();
include 'config.php';
checkAuth();

// Pastikan hanya admin yang bisa akses
if (!canEdit() || $_SESSION['role'] !== 'admin') {
    setFlash('error', 'Anda tidak memiliki hak akses ke modul KKM.');
    header("Location: dashboard.php");
    exit;
}

$page_title = "Katalog UMKM (Proker KKM)";

// Koneksi khusus ke KKM
$kkm_conn = @new mysqli('localhost', 'root', '', 'db_prokerkkm');
if ($kkm_conn->connect_error) {
    die("Gagal koneksi ke database KKM: " . $kkm_conn->connect_error);
}

// Hapus UMKM
if (isset($_GET['hapus'])) {
    $id = (int)$_GET['hapus'];
    $kkm_conn->query("DELETE FROM produk WHERE id = $id");
    setFlash('success', 'Produk UMKM berhasil dihapus.');
    header("Location: kkm_umkm.php");
    exit;
}

// Ambil data produk
$produk_list = $kkm_conn->query("SELECT * FROM produk ORDER BY id DESC");

include 'includes/header.php';
?>

<div class="page-header">
    <div>
        <h3>Data Produk UMKM</h3>
        <p>Integrasi Proker KKM - Kelola katalog produk UMKM (Wajik Tomat, dll) dari Desa Argamukti.</p>
    </div>
    <div class="header-actions">
        <!-- Fitur tambah produk bisa dikembangkan jika perlu, saat ini demo read/delete -->
        <button onclick="alert('Fitur tambah produk melalui portal integrasi sedang dikembangkan. Silakan hubungi admin KKM.')" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Tambah Produk</button>
    </div>
</div>

<?php 
$flash = getFlash();
if ($flash): 
?>
<div class="alert alert-<?= $flash['type'] === 'error' ? 'danger' : 'success' ?>">
    <i class="fa-solid <?= $flash['type'] === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check' ?>"></i> <?= htmlspecialchars($flash['message']) ?>
</div>
<?php endif; ?>

<div class="card">
    <div class="card-header">
        <h4 class="card-title">Daftar Produk Unggulan Desa</h4>
    </div>
    <div class="table-wrapper">
        <table class="data-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama Produk</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Stok</th>
                    <th>Status</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                while ($row = $produk_list->fetch_assoc()): 
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td class="fw-bold">
                        <?= htmlspecialchars($row['nama_produk']) ?><br>
                        <small style="color:var(--text-sub);"><?= htmlspecialchars($row['kode_produk']) ?></small>
                    </td>
                    <td><span class="badge badge-purple"><?= htmlspecialchars($row['kategori']) ?></span></td>
                    <td class="text-primary fw-bold">Rp <?= number_format($row['harga'], 0, ',', '.') ?></td>
                    <td><?= htmlspecialchars($row['stok']) ?> <?= htmlspecialchars($row['satuan']) ?></td>
                    <td>
                        <?php if ($row['status'] == 'tersedia'): ?>
                            <span class="badge badge-success">Tersedia</span>
                        <?php else: ?>
                            <span class="badge badge-danger">Habis</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <a href="?hapus=<?= $row['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Hapus produk UMKM ini?')"><i class="fa-solid fa-trash"></i></a>
                    </td>
                </tr>
                <?php endwhile; ?>
                <?php if ($produk_list->num_rows == 0): ?>
                <tr>
                    <td colspan="7" class="text-center">Belum ada produk UMKM terdaftar di KKM.</td>
                </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php 
$kkm_conn->close();
include 'includes/footer.php'; 
?>

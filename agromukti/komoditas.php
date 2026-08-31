<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$page_title = "Data Komoditas";

// Hanya admin yang boleh akses
if (($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: dashboard.php"); exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id        = (int)($_POST['id'] ?? 0);
    $nama      = cleanInput($_POST['nama']);
    $deskripsi = cleanInput($_POST['deskripsi']);
    $status    = cleanInput($_POST['status'] ?? 'aktif');

    if ($id > 0) {
        $conn->query("UPDATE komoditas SET nama='$nama', deskripsi='$deskripsi', status='$status' WHERE id=$id");
        setFlash('success', 'Data komoditas berhasil diperbarui!');
    } else {
        $conn->query("INSERT INTO komoditas (nama, deskripsi, status) VALUES ('$nama', '$deskripsi', '$status')");
        setFlash('success', 'Komoditas baru berhasil ditambahkan!');
    }
    header("Location: komoditas.php");
    exit;
}

if (isset($_GET['delete'])) {
    $del_id = (int)$_GET['delete'];
    $conn->query("DELETE FROM komoditas WHERE id=$del_id");
    setFlash('success', 'Komoditas telah dihapus.');
    header("Location: komoditas.php");
    exit;
}

$komoditas_list = $conn->query("
    SELECT k.*, COUNT(l.id) as total_lahan
    FROM komoditas k
    LEFT JOIN lahan l ON l.komoditas_id = k.id
    GROUP BY k.id
    ORDER BY k.id DESC
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
        <h3>Master Data Komoditas Pertanian</h3>
        <p>Daftar tanaman dan komoditas unggulan hasil bumi Desa Argamukti</p>
    </div>
    <button class="btn btn-primary" onclick="openModal('modalKomoditas')">
        <i class="fa-solid fa-seedling"></i> Tambah Komoditas
    </button>
</div>

<div class="card">
    <div class="card-header">
        <div>
            <h4 class="card-title"><i class="fa-solid fa-wheat-awn me-2" style="color:var(--primary);"></i> Daftar Komoditas Hasil Bumi</h4>
            <span class="card-subtitle">Komoditas utama yang dibudidayakan di lereng Gunung Ciremai</span>
        </div>
        <div class="search-input">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="searchKom" placeholder="Cari nama komoditas..." onkeyup="filterTable('searchKom', 'tableKom')">
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table" id="tableKom">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama Komoditas</th>
                    <th>Deskripsi</th>
                    <th>Jumlah Lahan Tanam</th>
                    <th>Status</th>
                    <th style="text-align:right;">Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                while ($row = $komoditas_list->fetch_assoc()): 
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td class="fw-bold"><?= htmlspecialchars($row['nama']) ?></td>
                    <td><?= htmlspecialchars($row['deskripsi']) ?></td>
                    <td><span class="badge badge-purple"><?= $row['total_lahan'] ?> Lahan</span></td>
                    <td>
                        <span class="badge <?= $row['status'] === 'aktif' ? 'badge-success' : 'badge-danger' ?>">
                            <?= strtoupper($row['status']) ?>
                        </span>
                    </td>
                    <td style="text-align:right;">
                        <a href="komoditas.php?delete=<?= $row['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Yakin hapus komoditas ini?')">
                            <i class="fa-solid fa-trash"></i>
                        </a>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- MODAL TAMBAH KOMODITAS -->
<div class="modal-overlay" id="modalKomoditas">
    <div class="modal-box">
        <div class="modal-header">
            <h5><i class="fa-solid fa-seedling me-2"></i> Tambah Komoditas Baru</h5>
            <button class="modal-close" onclick="closeModal('modalKomoditas')">&times;</button>
        </div>
        <form action="komoditas.php" method="POST">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Nama Komoditas</label>
                    <input type="text" name="nama" class="form-control" placeholder="Contoh: Tomat Argamukti" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Deskripsi & Varietas</label>
                    <textarea name="deskripsi" class="form-control" placeholder="Keunggulan komoditas..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalKomoditas')">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Komoditas</button>
            </div>
        </form>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

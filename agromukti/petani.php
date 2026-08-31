<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$page_title = "Data Petani";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id     = (int)($_POST['id'] ?? 0);
    $nama   = cleanInput($_POST['nama']);
    $nik    = cleanInput($_POST['nik']);
    $no_hp  = cleanInput($_POST['no_hp']);
    $alamat = cleanInput($_POST['alamat']);
    $status = cleanInput($_POST['status'] ?? 'aktif');

    if ($id > 0) {
        $conn->query("UPDATE petani SET nama='$nama', nik='$nik', no_hp='$no_hp', alamat='$alamat', status='$status' WHERE id=$id");
        setFlash('success', 'Data petani berhasil diperbarui!');
    } else {
        $conn->query("INSERT INTO petani (nama, nik, no_hp, alamat, status) VALUES ('$nama', '$nik', '$no_hp', '$alamat', '$status')");
        setFlash('success', 'Data petani baru berhasil ditambahkan!');
    }
    header("Location: petani.php");
    exit;
}

if (isset($_GET['delete'])) {
    $del_id = (int)$_GET['delete'];
    $conn->query("DELETE FROM petani WHERE id=$del_id");
    setFlash('success', 'Data petani telah dihapus.');
    header("Location: petani.php");
    exit;
}

$petani_list = $conn->query("
    SELECT p.*, COUNT(l.id) as total_lahan 
    FROM petani p 
    LEFT JOIN lahan l ON l.petani_id = p.id 
    GROUP BY p.id 
    ORDER BY p.id DESC
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
        <h3>Database Petani Desa Argamukti</h3>
        <p>Pendataan anggota petani dan kelompok tani penerima alokasi pupuk & program pendampingan</p>
    </div>
    <button class="btn btn-primary" onclick="openModal('modalPetani')">
        <i class="fa-solid fa-user-plus"></i> Tambah Data Petani
    </button>
</div>

<div class="card">
    <div class="card-header">
        <div>
            <h4 class="card-title"><i class="fa-solid fa-users me-2" style="color:var(--primary);"></i> Daftar Petani Terdaftar</h4>
            <span class="card-subtitle">Semua anggota kelompok tani Desa Argamukti</span>
        </div>
        <div class="search-input">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="searchPetani" placeholder="Cari NIK / Nama..." onkeyup="filterTable('searchPetani', 'tablePetani')">
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table" id="tablePetani">
            <thead>
                <tr>
                    <th>No</th>
                    <th>NIK</th>
                    <th>Nama Petani</th>
                    <th>No. Handphone</th>
                    <th>Alamat Dusun</th>
                    <th>Jumlah Lahan</th>
                    <th>Status</th>
                    <th style="text-align:right;">Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                while ($row = $petani_list->fetch_assoc()): 
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td><code><?= htmlspecialchars($row['nik']) ?></code></td>
                    <td class="fw-bold"><?= htmlspecialchars($row['nama']) ?></td>
                    <td><?= htmlspecialchars($row['no_hp']) ?></td>
                    <td><?= htmlspecialchars($row['alamat']) ?></td>
                    <td><span class="badge badge-purple"><?= $row['total_lahan'] ?> Lahan</span></td>
                    <td>
                        <span class="badge <?= $row['status'] === 'aktif' ? 'badge-success' : 'badge-danger' ?>">
                            <?= strtoupper($row['status']) ?>
                        </span>
                    </td>
                    <td style="text-align:right;">
                        <a href="petani.php?delete=<?= $row['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Yakin hapus data petani ini?')">
                            <i class="fa-solid fa-trash"></i>
                        </a>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- MODAL TAMBAH PETANI -->
<div class="modal-overlay" id="modalPetani">
    <div class="modal-box">
        <div class="modal-header">
            <h5><i class="fa-solid fa-user-plus me-2"></i> Tambah Data Petani Baru</h5>
            <button class="modal-close" onclick="closeModal('modalPetani')">&times;</button>
        </div>
        <form action="petani.php" method="POST">
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">NIK Petani</label>
                        <input type="text" name="nik" class="form-control" placeholder="Contoh: 12345 (Boleh Asal)" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nama Lengkap</label>
                        <input type="text" name="nama" class="form-control" placeholder="Nama Petani" required>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">No. Handphone / WA</label>
                        <input type="text" name="no_hp" class="form-control" placeholder="08xxxxxxxxxx">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select name="status" class="form-select">
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Nonaktif</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Alamat Dusun / Blok</label>
                    <textarea name="alamat" class="form-control" placeholder="Lokasi rumah / dusun"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalPetani')">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Data Petani</button>
            </div>
        </form>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

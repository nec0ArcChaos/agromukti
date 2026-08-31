<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$page_title = "Data Lahan Pertanian";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id           = (int)($_POST['id'] ?? 0);
    $petani_id    = (int)$_POST['petani_id'];
    $komoditas_id = (int)$_POST['komoditas_id'];
    $luas         = (float)$_POST['luas'];
    $satuan       = cleanInput($_POST['satuan'] ?? 'm2');
    $lokasi       = cleanInput($_POST['lokasi']);
    $status       = cleanInput($_POST['status'] ?? 'aktif');

    if ($id > 0) {
        $conn->query("UPDATE lahan SET petani_id=$petani_id, komoditas_id=$komoditas_id, luas=$luas, satuan='$satuan', lokasi='$lokasi', status='$status' WHERE id=$id");
        setFlash('success', 'Data lahan berhasil diperbarui!');
    } else {
        $conn->query("INSERT INTO lahan (petani_id, komoditas_id, luas, satuan, lokasi, status) VALUES ($petani_id, $komoditas_id, $luas, '$satuan', '$lokasi', '$status')");
        setFlash('success', 'Data lahan baru berhasil ditambahkan!');
    }
    header("Location: lahan.php");
    exit;
}

if (isset($_GET['delete'])) {
    $del_id = (int)$_GET['delete'];
    $conn->query("DELETE FROM lahan WHERE id=$del_id");
    setFlash('success', 'Data lahan telah dihapus.');
    header("Location: lahan.php");
    exit;
}

$lahan_list = $conn->query("
    SELECT l.*, p.nama as nama_petani, k.nama as nama_komoditas
    FROM lahan l
    JOIN petani p ON l.petani_id = p.id
    JOIN komoditas k ON l.komoditas_id = k.id
    ORDER BY l.id DESC
");

$petani_opt    = $conn->query("SELECT id, nama FROM petani WHERE status='aktif' ORDER BY nama");
$komoditas_opt = $conn->query("SELECT id, nama FROM komoditas WHERE status='aktif' ORDER BY nama");

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
        <h3>Data Lahan Pertanian Desa</h3>
        <p>Inventaris pemetaan luas lahan, kepemilikan petani, dan komoditas yang ditanam</p>
    </div>
    <button class="btn btn-primary" onclick="openModal('modalLahan')">
        <i class="fa-solid fa-map-location-dot"></i> Tambah Data Lahan
    </button>
</div>

<div class="card">
    <div class="card-header">
        <div>
            <h4 class="card-title"><i class="fa-solid fa-map me-2" style="color:var(--primary);"></i> Daftar Lahan Terdaftar</h4>
            <span class="card-subtitle">Pemetaan blok lahan pertanian Desa Argamukti</span>
        </div>
        <div class="search-input">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="searchLahan" placeholder="Cari Petani / Lokasi..." onkeyup="filterTable('searchLahan', 'tableLahan')">
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table" id="tableLahan">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Pemilik (Petani)</th>
                    <th>Komoditas Tanam</th>
                    <th>Luas Lahan</th>
                    <th>Lokasi Blok</th>
                    <th>Status</th>
                    <th style="text-align:right;">Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                while ($row = $lahan_list->fetch_assoc()): 
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td class="fw-bold"><?= htmlspecialchars($row['nama_petani']) ?></td>
                    <td><span class="badge badge-purple"><?= htmlspecialchars($row['nama_komoditas']) ?></span></td>
                    <td><span class="fw-bold"><?= formatNumber($row['luas'], 0) ?></span> <?= $row['satuan'] ?></td>
                    <td><?= htmlspecialchars($row['lokasi']) ?></td>
                    <td>
                        <span class="badge <?= $row['status'] === 'aktif' ? 'badge-success' : 'badge-danger' ?>">
                            <?= strtoupper($row['status']) ?>
                        </span>
                    </td>
                    <td style="text-align:right;">
                        <a href="lahan.php?delete=<?= $row['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Yakin hapus lahan ini?')">
                            <i class="fa-solid fa-trash"></i>
                        </a>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- MODAL TAMBAH LAHAN -->
<div class="modal-overlay" id="modalLahan">
    <div class="modal-box">
        <div class="modal-header">
            <h5><i class="fa-solid fa-map-location-dot me-2"></i> Tambah Lahan Pertanian</h5>
            <button class="modal-close" onclick="closeModal('modalLahan')">&times;</button>
        </div>
        <form action="lahan.php" method="POST">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Petani Pemilik/Penggarap</label>
                    <select name="petani_id" class="form-select" required>
                        <option value="">-- Pilih Petani --</option>
                        <?php while ($p = $petani_opt->fetch_assoc()): ?>
                            <option value="<?= $p['id'] ?>"><?= htmlspecialchars($p['nama']) ?></option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Komoditas Ditanam</label>
                        <select name="komoditas_id" class="form-select" required>
                            <option value="">-- Pilih Komoditas --</option>
                            <?php while ($k = $komoditas_opt->fetch_assoc()): ?>
                                <option value="<?= $k['id'] ?>"><?= htmlspecialchars($k['nama']) ?></option>
                            <?php endwhile; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Luas & Satuan</label>
                        <div style="display:flex; gap:8px;">
                            <input type="number" step="0.1" name="luas" class="form-control" placeholder="Luas" required>
                            <select name="satuan" class="form-select" style="width:100px;">
                                <option value="m2">m²</option>
                                <option value="ha">Hektar</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Lokasi Blok Lahan</label>
                    <textarea name="lokasi" class="form-control" placeholder="Contoh: Blok A (Boleh Asal)"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalLahan')">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Data Lahan</button>
            </div>
        </form>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

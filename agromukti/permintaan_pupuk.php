<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';
checkAuth();

$page_title = "Permintaan Pupuk";

// Handle Actions (Tambah Pengajuan & Update Status)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['add_permintaan'])) {
        $petani_id       = (int)$_POST['petani_id'];
        $lahan_id        = (int)$_POST['lahan_id'];
        $produk_pupuk_id = (int)$_POST['produk_pupuk_id'];
        $jumlah          = (float)$_POST['jumlah'];
        $keterangan      = cleanInput($_POST['keterangan']);
        $tanggal         = cleanInput($_POST['tanggal']);
        $kode_permintaan = generateCode('REQ');

        try {
            $conn->query("ALTER TABLE permintaan_pupuk ADD COLUMN IF NOT EXISTS lahan_id INT NULL AFTER petani_id");
        } catch (Exception $e) {}

        $conn->query("INSERT INTO permintaan_pupuk (kode_permintaan, petani_id, lahan_id, tanggal, status, keterangan) VALUES ('$kode_permintaan', $petani_id, $lahan_id, '$tanggal', 'diajukan', '$keterangan')");
        $permintaan_id = $conn->insert_id;

        $conn->query("INSERT INTO detail_permintaan_pupuk (permintaan_id, produk_pupuk_id, jumlah, satuan) VALUES ($permintaan_id, $produk_pupuk_id, $jumlah, 'kg')");

        setFlash('success', "Permintaan Pupuk ($kode_permintaan) berhasil diajukan!");
        header("Location: permintaan_pupuk.php");
        exit;
    }

    if (isset($_POST['update_status'])) {
        $id     = (int)$_POST['id'];
        $status = cleanInput($_POST['status']);
        $conn->query("UPDATE permintaan_pupuk SET status='$status' WHERE id=$id");

        // Jika disetujui, otomatis buat draft Distribusi Pupuk!
        if ($status === 'disetujui') {
            $kode_dist = generateCode('DST');
            $conn->query("INSERT INTO distribusi_pupuk (kode_distribusi, permintaan_id, tanggal_distribusi, status, keterangan) VALUES ('$kode_dist', $id, CURDATE(), 'diproses', 'Otomatis dibuat dari persetujuan pengajuan $id')");
            $dist_id = $conn->insert_id;

            // Detail distribusi
            $req_detail = $conn->query("SELECT produk_pupuk_id, jumlah, satuan FROM detail_permintaan_pupuk WHERE permintaan_id=$id")->fetch_assoc();
            if ($req_detail) {
                $conn->query("INSERT INTO detail_distribusi_pupuk (distribusi_id, produk_pupuk_id, jumlah, satuan) VALUES ($dist_id, {$req_detail['produk_pupuk_id']}, {$req_detail['jumlah']}, '{$req_detail['satuan']}')");
            }
        }

        setFlash('success', "Status permintaan pupuk diperbarui menjadi $status.");
        header("Location: permintaan_pupuk.php");
        exit;
    }
}

if (isset($_GET['delete'])) {
    $del_id = (int)$_GET['delete'];
    $conn->query("DELETE FROM permintaan_pupuk WHERE id=$del_id");
    setFlash('success', 'Permintaan pupuk telah dihapus.');
    header("Location: permintaan_pupuk.php");
    exit;
}

$permintaan_list = $conn->query("
    SELECT req.*, p.nama as nama_petani, p.nik, dp.jumlah, dp.satuan, prd.nama_produk
    FROM permintaan_pupuk req
    JOIN petani p ON req.petani_id = p.id
    LEFT JOIN detail_permintaan_pupuk dp ON dp.permintaan_id = req.id
    LEFT JOIN produk_pupuk prd ON dp.produk_pupuk_id = prd.id
    ORDER BY req.id DESC
");

$petani_opt = $conn->query("SELECT id, nama, nik FROM petani WHERE status='aktif' ORDER BY nama");
$produk_opt = $conn->query("SELECT id, nama_produk FROM produk_pupuk WHERE status='aktif'");

// Ambil data lahan dan komoditas untuk kalkulator
$lahan_data = [];
$res_lahan = $conn->query("SELECT l.id, l.petani_id, l.luas, l.lokasi, k.nama as nama_komoditas, k.dosis_pupuk_per_ha FROM lahan l JOIN komoditas k ON l.komoditas_id = k.id WHERE l.status='aktif'");
if ($res_lahan) {
    while ($l = $res_lahan->fetch_assoc()) {
        $lahan_data[$l['petani_id']][] = $l;
    }
}

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
        <h3>Pengajuan Permintaan Pupuk Petani</h3>
        <p>Verifikasi & persetujuan alokasi pupuk organik subsidi untuk kelompok tani Desa Argamukti</p>
    </div>
    <button class="btn btn-primary" onclick="openModal('modalPermintaan')">
        <i class="fa-solid fa-file-signature"></i> Buat Pengajuan Pupuk
    </button>
</div>

<div class="card">
    <div class="card-header">
        <div>
            <h4 class="card-title"><i class="fa-solid fa-hand-holding-hand me-2" style="color:var(--primary);"></i> Daftar Permintaan Pupuk</h4>
            <span class="card-subtitle">Pengajuan kuota pupuk dari para petani desa</span>
        </div>
        <div class="search-input">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="searchReq" placeholder="Cari Kode / Petani..." onkeyup="filterTable('searchReq', 'tableReq')">
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table" id="tableReq">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Kode Permintaan</th>
                    <th>Tanggal</th>
                    <th>Nama Petani</th>
                    <th>Produk Pupuk</th>
                    <th>Jumlah Diminta</th>
                    <th>Status</th>
                    <th style="text-align:right;">Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $no = 1;
                while ($row = $permintaan_list->fetch_assoc()): 
                ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td><code><?= $row['kode_permintaan'] ?></code></td>
                    <td><?= date('d/m/Y', strtotime($row['tanggal'])) ?></td>
                    <td class="fw-bold"><?= htmlspecialchars($row['nama_petani']) ?> <br><small class="text-muted">NIK: <?= $row['nik'] ?></small></td>
                    <td><?= htmlspecialchars($row['nama_produk'] ?? 'Pupuk Kompos Desa') ?></td>
                    <td><span class="fw-bold"><?= formatNumber($row['jumlah'], 2) ?></span> <?= $row['satuan'] ?? 'kg' ?></td>
                    <td>
                        <span class="badge badge-<?= $row['status'] ?>">
                            <?= strtoupper($row['status']) ?>
                        </span>
                    </td>
                    <td style="text-align:right;">
                        <?php if ($row['status'] === 'diajukan' || $row['status'] === 'diproses'): ?>
                            <form action="permintaan_pupuk.php" method="POST" style="display:inline-block;">
                                <input type="hidden" name="update_status" value="1">
                                <input type="hidden" name="id" value="<?= $row['id'] ?>">
                                <input type="hidden" name="status" value="disetujui">
                                <button type="submit" class="btn btn-sm btn-primary"><i class="fa-solid fa-check me-1"></i> Setujui</button>
                            </form>
                            <form action="permintaan_pupuk.php" method="POST" style="display:inline-block;">
                                <input type="hidden" name="update_status" value="1">
                                <input type="hidden" name="id" value="<?= $row['id'] ?>">
                                <input type="hidden" name="status" value="ditolak">
                                <button type="submit" class="btn btn-sm btn-danger"><i class="fa-solid fa-xmark me-1"></i> Tolak</button>
                            </form>
                        <?php endif; ?>
                        <a href="permintaan_pupuk.php?delete=<?= $row['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Hapus pengajuan ini?')">
                            <i class="fa-solid fa-trash"></i>
                        </a>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- MODAL BUAT PERMINTAAN -->
<div class="modal-overlay" id="modalPermintaan">
    <div class="modal-box">
        <div class="modal-header">
            <h5><i class="fa-solid fa-file-signature me-2"></i> Form Pengajuan Permintaan Pupuk</h5>
            <button class="modal-close" onclick="closeModal('modalPermintaan')">&times;</button>
        </div>
        <form action="permintaan_pupuk.php" method="POST">
            <input type="hidden" name="add_permintaan" value="1">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Petani Pemohon</label>
                    <select name="petani_id" id="petani_id" class="form-select" onchange="fetchLahan(this.value)" required>
                        <option value="">-- Pilih Petani --</option>
                        <?php while ($p = $petani_opt->fetch_assoc()): ?>
                            <option value="<?= $p['id'] ?>"><?= htmlspecialchars($p['nama']) ?> (NIK: <?= $p['nik'] ?>)</option>
                        <?php endwhile; ?>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Pilih Lahan & Komoditas</label>
                    <select name="lahan_id" id="lahan_id" class="form-select" onchange="calculatePupuk()" required>
                        <option value="">-- Pilih Petani Terlebih Dahulu --</option>
                    </select>
                </div>

                <div id="kalkulator_info" style="display:none; padding:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; margin-bottom:15px;">
                    <strong style="color:#166534;"><i class="fa-solid fa-calculator me-1"></i> Rekomendasi Kebutuhan Pupuk:</strong>
                    <div id="kalkulator_text" style="color:#15803d; margin-top:5px; font-size:0.9rem;"></div>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Produk Pupuk</label>
                        <select name="produk_pupuk_id" class="form-select" required>
                            <option value="">-- Pilih Produk Pupuk --</option>
                            <?php while ($pr = $produk_opt->fetch_assoc()): ?>
                                <option value="<?= $pr['id'] ?>"><?= htmlspecialchars($pr['nama_produk']) ?></option>
                            <?php endwhile; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Jumlah Diminta (Liter/Kg)</label>
                        <input type="number" step="0.1" name="jumlah" id="jumlah_input" class="form-control" placeholder="Contoh: 10" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Tanggal Pengajuan</label>
                    <input type="date" name="tanggal" class="form-control" value="<?= date('Y-m-d') ?>" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Keterangan Tambahan</label>
                    <textarea name="keterangan" class="form-control" placeholder="Tujuan pemupukan (Kosongkan juga boleh)"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalPermintaan')">Batal</button>
                <button type="submit" class="btn btn-primary">Kirim Permintaan Pupuk</button>
            </div>
        </form>
    </div>
</div>

<script>
const lahanData = <?= json_encode($lahan_data) ?>;

function fetchLahan(petaniId) {
    const selectLahan = document.getElementById('lahan_id');
    const info = document.getElementById('kalkulator_info');
    info.style.display = 'none';
    
    selectLahan.innerHTML = '<option value="">-- Pilih Lahan --</option>';
    
    if (petaniId && lahanData[petaniId]) {
        lahanData[petaniId].forEach(lahan => {
            const opt = document.createElement('option');
            opt.value = lahan.id;
            opt.dataset.luas = lahan.luas;
            opt.dataset.komoditas = lahan.nama_komoditas;
            opt.dataset.dosis = lahan.dosis_pupuk_per_ha;
            opt.textContent = `${lahan.lokasi} - ${lahan.nama_komoditas} (${lahan.luas} m2)`;
            selectLahan.appendChild(opt);
        });
    } else {
        selectLahan.innerHTML = '<option value="">-- Tidak ada data lahan --</option>';
    }
}

function calculatePupuk() {
    const selectLahan = document.getElementById('lahan_id');
    const info = document.getElementById('kalkulator_info');
    const textInfo = document.getElementById('kalkulator_text');
    const jumlahInput = document.getElementById('jumlah_input');
    
    if (selectLahan.selectedIndex <= 0) {
        info.style.display = 'none';
        return;
    }
    
    const opt = selectLahan.options[selectLahan.selectedIndex];
    const luas_m2 = parseFloat(opt.dataset.luas);
    const luas_ha = luas_m2 / 10000;
    const dosis_per_ha = parseFloat(opt.dataset.dosis);
    
    const rekomendasi = (luas_ha * dosis_per_ha).toFixed(2);
    
    info.style.display = 'block';
    textInfo.innerHTML = `
        Luas Lahan: ${luas_m2} m² (${luas_ha} Ha)<br>
        Komoditas: ${opt.dataset.komoditas} (SOP Dosis: ${dosis_per_ha} Liter/Ha)<br>
        <strong>Rekomendasi Optimal: ${rekomendasi} Liter/Kg</strong>
    `;
    
    // Auto fill form
    jumlahInput.value = rekomendasi;
}
</script>

<?php include 'includes/footer.php'; ?>

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

$page_title = "Bank Sampah (Proker KKM)";

// Koneksi khusus ke KKM
$kkm_conn = @new mysqli('localhost', 'root', '', 'db_prokerkkm');
if ($kkm_conn->connect_error) {
    die("Gagal koneksi ke database KKM: " . $kkm_conn->connect_error);
}

// ======================================================
// AMBIL STOK SAMPAH ORGANIK
// ======================================================
$query_sampah = $kkm_conn->query("SELECT jumlah FROM jumlahsampahorganik WHERE id = 1");
$sampah = 0;
if ($query_sampah && $row = $query_sampah->fetch_assoc()) {
    $sampah = (float) $row['jumlah'];
}

// ======================================================
// PROSES POST
// ======================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['berapaKG'])) {
    $berapaKG = (float) $_POST['berapaKG'];
    if ($berapaKG <= 0) {
        setFlash('error', "Jumlah sampah organik harus lebih dari 0 KG.");
    } elseif ($berapaKG > $sampah) {
        setFlash('error', "Stok sampah organik tidak mencukupi.");
    } else {
        $faktor_cair = 0.20;
        $faktor_kasar = 0.40;
        $estimasi_cair = $berapaKG * $faktor_cair;
        $estimasi_kasar = $berapaKG * $faktor_kasar;

        $tanggal_mulai = date('Y-m-d');
        $estimasi_selesai = date('Y-m-d', strtotime('+14 days'));
        $tanggal_kode = date('Ymd');
        
        $query_nomor = $kkm_conn->query("SELECT COUNT(*) AS total FROM produksi_pupuk WHERE tanggal_mulai = CURDATE()");
        $data_nomor = $query_nomor->fetch_assoc();
        $urutan = $data_nomor['total'] + 1;
        $kode_pupuk = sprintf("PRD-%s-%03d", $tanggal_kode, $urutan);

        $kkm_conn->begin_transaction();
        try {
            $sisa_sampah = $sampah - $berapaKG;
            $kkm_conn->query("UPDATE jumlahsampahorganik SET jumlah = $sisa_sampah WHERE id = 1");
            
            $stmt = $kkm_conn->prepare("INSERT INTO produksi_pupuk (kode_pupuk, tanggal_mulai, berat_sampah_organik, estimasi_pupuk_cair, estimasi_pupuk_kasar, estimasi_selesai, status, keterangan) VALUES (?, ?, ?, ?, ?, ?, 'proses', 'Otomatis AgroMukti')");
            $stmt->bind_param("ssddds", $kode_pupuk, $tanggal_mulai, $berapaKG, $estimasi_cair, $estimasi_kasar, $estimasi_selesai);
            $stmt->execute();

            $kkm_conn->commit();
            setFlash('success', "Produksi pupuk $kode_pupuk berhasil dimulai!");
            header("Location: kkm_buat_pupuk.php");
            exit;
        } catch (Exception $e) {
            $kkm_conn->rollback();
            setFlash('error', "Gagal memulai produksi.");
        }
    }
}

// Selesaikan proses
if (isset($_GET['selesaikan'])) {
    $id = (int)$_GET['selesaikan'];
    
    $kkm_conn->begin_transaction();
    try {
        $prod = $kkm_conn->query("SELECT * FROM produksi_pupuk WHERE id = $id")->fetch_assoc();
        if ($prod && $prod['status'] == 'proses') {
            // Selesaikan produksi
            $kkm_conn->query("UPDATE produksi_pupuk SET status = 'selesai', tanggal_selesai = CURDATE(), pupuk_cair_aktual = estimasi_pupuk_cair, pupuk_kasar_aktual = estimasi_pupuk_kasar WHERE id = $id");
            
            // Masukkan ke inventaris KKM
            $cair = $prod['estimasi_pupuk_cair'];
            $kasar = $prod['estimasi_pupuk_kasar'];
            
            // Tambah cair
            $kkm_conn->query("UPDATE inventaris SET stok = stok + $cair WHERE kategori = 'pupuk_cair'");
            // Tambah kasar
            $kkm_conn->query("UPDATE inventaris SET stok = stok + $kasar WHERE kategori = 'pupuk_kasar'");
            
            $kkm_conn->commit();
            setFlash('success', "Produksi selesai. Stok KKM otomatis ditambahkan!");
        }
    } catch(Exception $e) {
        $kkm_conn->rollback();
        setFlash('error', "Gagal menyelesaikan.");
    }
    header("Location: kkm_buat_pupuk.php");
    exit;
}

// Riwayat Produksi
$riwayat = $kkm_conn->query("SELECT * FROM produksi_pupuk ORDER BY id DESC LIMIT 10");

include 'includes/header.php';
?>

<div class="page-header">
    <div>
        <h3>Bank Sampah (Produksi Pupuk)</h3>
        <p>Integrasi Proker KKM - Pemrosesan sampah organik menjadi pupuk.</p>
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

<div class="card" style="margin-bottom: 25px;">
    <div style="display:flex; gap: 30px; align-items:center;">
        <div style="text-align: center; padding: 20px; background: rgba(20, 184, 166, 0.1); border-radius: 12px; min-width: 200px;">
            <div style="font-size: 0.9rem; color: #0f766e; font-weight: 600;">STOK SAMPAH ORGANIK</div>
            <div style="font-size: 2.5rem; font-weight: 800; color: #0f172a; margin: 10px 0;"><?= number_format($sampah, 2, ',', '.') ?> <span style="font-size:1rem;">KG</span></div>
            <a href="?tambah_sampah=1" class="btn btn-primary btn-sm">Setor Sampah Warga</a>
        </div>
        
        <div style="flex-grow: 1;">
            <h4 style="margin-bottom: 15px;"><i class="fa-solid fa-flask text-primary"></i> Mulai Fermentasi</h4>
            <form action="" method="POST" style="display:flex; gap:15px; align-items:flex-end;">
                <div class="form-group" style="flex-grow:1; margin-bottom:0;">
                    <label class="form-label">Jumlah Bahan Baku (KG)</label>
                    <input type="number" step="0.1" name="berapaKG" class="form-input" required placeholder="Contoh: 10">
                </div>
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-play"></i> Proses</button>
            </form>
            <p style="font-size: 0.85rem; color: var(--text-sub); margin-top: 10px;">Estimasi Hasil: 20% Pupuk Cair, 40% Pupuk Kasar. Selesai dalam 14 Hari.</p>
        </div>
    </div>
</div>

<!-- Dummy Tambah Sampah untuk testing -->
<?php 
if (isset($_GET['tambah_sampah'])) {
    $kkm_conn->query("UPDATE jumlahsampahorganik SET jumlah = jumlah + 50 WHERE id = 1");
    setFlash('success', "Berhasil menambahkan 50 KG setoran sampah warga (Demo).");
    echo "<script>window.location='kkm_buat_pupuk.php';</script>";
}
?>

<div class="card">
    <div class="card-header">
        <h4 class="card-title">Riwayat Produksi Pupuk KKM</h4>
    </div>
    <div class="table-wrapper">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Kode</th>
                    <th>Tanggal Mulai</th>
                    <th>Bahan Baku</th>
                    <th>Estimasi Hasil</th>
                    <th>Status</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($row = $riwayat->fetch_assoc()): ?>
                <tr>
                    <td class="fw-bold"><?= $row['kode_pupuk'] ?></td>
                    <td><?= date('d M Y', strtotime($row['tanggal_mulai'])) ?></td>
                    <td><?= $row['berat_sampah_organik'] ?> KG</td>
                    <td>
                        <div style="font-size:0.85rem;">
                            <span class="text-success"><i class="fa-solid fa-flask"></i> <?= $row['estimasi_pupuk_cair'] ?>L Cair</span><br>
                            <span class="text-warning"><i class="fa-solid fa-box"></i> <?= $row['estimasi_pupuk_kasar'] ?>KG Kasar</span>
                        </div>
                    </td>
                    <td>
                        <?php if ($row['status'] == 'proses'): ?>
                            <span class="badge badge-warning">Proses Fermentasi</span>
                        <?php else: ?>
                            <span class="badge badge-success">Selesai</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if ($row['status'] == 'proses'): ?>
                            <a href="?selesaikan=<?= $row['id'] ?>" class="btn btn-sm btn-primary" onclick="return confirm('Selesaikan fermentasi dan masukkan ke stok KKM?')"><i class="fa-solid fa-check"></i> Panen</a>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<?php 
$kkm_conn->close();
include 'includes/footer.php'; 
?>

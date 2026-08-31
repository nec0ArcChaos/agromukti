<?php
$page_title = 'Distribusi Pupuk';
include 'config.php';

// Handle aksi setujui dari dashboard
if(isset($_GET['aksi']) && $_GET['aksi']==='setujui' && isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    $row = $conn->query("SELECT * FROM distribusi_pupuk WHERE id=$id")->fetch_assoc();
    if($row) {
        $jumlah = $row['jumlah_diminta'];
        $conn->query("UPDATE distribusi_pupuk SET status='Disalurkan',jumlah_disetujui='$jumlah',tanggal_penyaluran=CURDATE() WHERE id=$id");
        $conn->query("UPDATE pupuk SET stok=stok-$jumlah WHERE id={$row['pupuk_id']} AND stok>=$jumlah");
    }
    header("Location: permintaan_pupuk.php?msg=disalurkan"); exit;
}

// Tambah stok
if(isset($_POST['tambah_stok'])) {
    $pupuk_id=(int)$_POST['pupuk_id'];
    $tambah=$conn->real_escape_string($_POST['tambah']);
    $conn->query("UPDATE pupuk SET stok=stok+$tambah WHERE id=$pupuk_id");
    header("Location: pupuk.php?msg=stok"); exit;
}

// Edit jenis pupuk
if(isset($_POST['edit_pupuk'])) {
    $id=(int)$_POST['pupuk_id'];
    $jenis=$conn->real_escape_string($_POST['jenis_pupuk']);
    $ket=$conn->real_escape_string($_POST['keterangan']??'');
    $conn->query("UPDATE pupuk SET jenis_pupuk='$jenis',keterangan='$ket' WHERE id=$id");
    header("Location: pupuk.php?msg=edit"); exit;
}

$pupuks = $conn->query("SELECT * FROM pupuk");
$total_disalurkan = $conn->query("SELECT COALESCE(SUM(jumlah_disetujui),0) as t FROM distribusi_pupuk WHERE status='Disalurkan'")->fetch_assoc()['t'];
$total_pending = $conn->query("SELECT COUNT(*) as c FROM distribusi_pupuk WHERE status='Menunggu'")->fetch_assoc()['c'];

include 'includes/header.php';
?>

<div class="page-header">
    <div><h3>Manajemen Stok Pupuk</h3><p>Kelola stok dan rekap distribusi pupuk organik desa</p></div>
    <button class="btn btn-primary" onclick="openModal('modalTambahStok')"><i class="fa-solid fa-plus"></i> Tambah Stok</button>
</div>

<?php if(isset($_GET['msg'])): ?>
<div style="background:rgba(22,163,74,.1);border:1px solid rgba(22,163,74,.3);border-radius:10px;padding:14px 18px;margin-bottom:20px;color:#15803d;font-size:0.875rem;font-weight:500;display:flex;align-items:center;gap:12px;">
    <i class="fa-solid fa-circle-check"></i>
    <?php
    $msgs = ['stok'=>'Stok pupuk berhasil ditambahkan!','edit'=>'Data pupuk berhasil diperbarui!','disalurkan'=>'Pupuk berhasil disalurkan!'];
    echo $msgs[$_GET['msg']] ?? 'Berhasil!';
    ?>
</div>
<?php endif; ?>

<!-- Pupuk cards -->
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;margin-bottom:24px;">
<?php $pupuks->data_seek(0); while($p=$pupuks->fetch_assoc()):
    $pct = min(100, ($p['stok']/2000)*100);
    $cls = $pct>50?'good':($pct>20?'low':'critical');
    $clr = $pct>50?'var(--primary)':($pct>20?'var(--accent)':'var(--danger)');
?>
<div class="card">
    <div class="card-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
            <div>
                <div style="font-size:0.75rem;color:var(--text-muted);font-weight:500;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Pupuk Organik</div>
                <h5 style="font-weight:700;margin-bottom:4px;"><?= htmlspecialchars($p['jenis_pupuk']) ?></h5>
                <div style="font-size:0.8rem;color:var(--text-muted);"><?= htmlspecialchars($p['keterangan']?:'Pupuk organik desa') ?></div>
            </div>
            <button onclick="openModal('modalEditPupuk<?= $p['id'] ?>')" class="btn btn-sm btn-icon btn-icon-edit"><i class="fa-solid fa-pen"></i></button>
        </div>
        <div style="font-size:2.5rem;font-weight:800;color:<?= $clr ?>;margin-bottom:6px;"><?= number_format($p['stok'],0) ?> <span style="font-size:1rem;font-weight:600;">Kg</span></div>
        <div class="stok-bar"><div class="stok-fill <?= $cls ?>" style="width:<?= $pct ?>%"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:0.75rem;color:var(--text-muted);">
            <span><?= round($pct) ?>% dari kapasitas normal (2000 Kg)</span>
            <span style="color:<?= $clr ?>;font-weight:600;"><?= $pct>50?'Cukup':($pct>20?'Perlu Perhatian':'⚠️ Kritis') ?></span>
        </div>
    </div>
</div>

<!-- Modal Edit Pupuk -->
<div class="modal-overlay" id="modalEditPupuk<?= $p['id'] ?>">
    <div class="modal-box">
        <div class="modal-header"><h5>Edit Data Pupuk</h5><button class="modal-close" onclick="closeModal('modalEditPupuk<?= $p['id'] ?>')"><i class="fa-solid fa-xmark"></i></button></div>
        <form method="POST"><input type="hidden" name="pupuk_id" value="<?= $p['id'] ?>">
            <div class="modal-body">
                <div class="form-group"><label class="form-label">Jenis Pupuk</label><input type="text" name="jenis_pupuk" class="form-control" value="<?= htmlspecialchars($p['jenis_pupuk']) ?>" required></div>
                <div class="form-group"><label class="form-label">Keterangan</label><textarea name="keterangan" class="form-control"><?= htmlspecialchars($p['keterangan']??'') ?></textarea></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalEditPupuk<?= $p['id'] ?>')">Batal</button>
                <button type="submit" name="edit_pupuk" class="btn btn-primary"><i class="fa-solid fa-save"></i> Simpan</button>
            </div>
        </form>
    </div>
</div>
<?php endwhile; ?>
</div>

<!-- Summary Stats -->
<div class="stats-row" style="margin-bottom:22px;">
    <div class="stat-card green"><div class="stat-icon green"><i class="fa-solid fa-truck-fast"></i></div><div class="stat-info"><div class="label">Total Tersalurkan</div><div class="value"><?= number_format($total_disalurkan,0) ?> <sup>Kg</sup></div></div></div>
    <div class="stat-card orange"><div class="stat-icon orange"><i class="fa-solid fa-clock"></i></div><div class="stat-info"><div class="label">Menunggu Persetujuan</div><div class="value"><?= $total_pending ?> <sup>req</sup></div><div class="trend neutral"><a href="permintaan_pupuk.php" style="color:var(--text-muted);">Lihat detail →</a></div></div></div>
</div>

<!-- Modal Tambah Stok -->
<div class="modal-overlay" id="modalTambahStok">
    <div class="modal-box">
        <div class="modal-header"><h5><i class="fa-solid fa-seedling" style="color:var(--primary);margin-right:8px;"></i> Tambah Stok Pupuk</h5><button class="modal-close" onclick="closeModal('modalTambahStok')"><i class="fa-solid fa-xmark"></i></button></div>
        <form method="POST">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Jenis Pupuk</label>
                    <select name="pupuk_id" class="form-select" required>
                        <?php $pupuks->data_seek(0); while($p=$pupuks->fetch_assoc()): ?>
                        <option value="<?=$p['id']?>"><?= htmlspecialchars($p['jenis_pupuk']) ?> (Stok: <?= number_format($p['stok'],0) ?> Kg)</option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Jumlah Tambah (Kg)</label>
                    <div class="input-group"><input type="number" name="tambah" class="form-control" step="1" min="1" placeholder="0" required><span class="input-group-text">Kg</span></div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalTambahStok')">Batal</button>
                <button type="submit" name="tambah_stok" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Tambah Stok</button>
            </div>
        </form>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

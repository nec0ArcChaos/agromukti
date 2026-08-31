<?php
$page_title = 'Hasil Panen';
include 'config.php';

if(isset($_GET['hapus'])) { $conn->query("DELETE FROM panen WHERE id=".(int)$_GET['hapus']); header("Location: panen.php?msg=hapus"); exit; }

if($_SERVER['REQUEST_METHOD']==='POST') {
    $petani_id=(int)$_POST['petani_id'];
    $komoditas_id=(int)$_POST['komoditas_id'];
    $jumlah=$conn->real_escape_string($_POST['jumlah_panen']);
    $tgl=$conn->real_escape_string($_POST['tanggal_panen']);
    $ket=$conn->real_escape_string($_POST['keterangan']??'');
    $edit_id=(int)($_POST['edit_id']??0);
    if($edit_id) $conn->query("UPDATE panen SET petani_id=$petani_id,komoditas_id=$komoditas_id,jumlah_panen='$jumlah',tanggal_panen='$tgl',keterangan='$ket' WHERE id=$edit_id");
    else $conn->query("INSERT INTO panen (petani_id,komoditas_id,jumlah_panen,tanggal_panen,keterangan) VALUES ($petani_id,$komoditas_id,'$jumlah','$tgl','$ket')");
    header("Location: panen.php?msg=simpan"); exit;
}

$panens = $conn->query("SELECT pn.*, pt.nama as nama_petani, k.nama as nama_komoditas FROM panen pn JOIN petani pt ON pn.petani_id=pt.id JOIN komoditas k ON pn.komoditas_id=k.id ORDER BY pn.tanggal_panen DESC");
$petanis = $conn->query("SELECT id,nama FROM petani ORDER BY nama");
$komoditas = $conn->query("SELECT id,nama as nama_komoditas FROM komoditas ORDER BY nama");

$total_panen = $conn->query("SELECT COALESCE(SUM(jumlah_panen),0) as t FROM panen")->fetch_assoc()['t'];
$bulan_ini = $conn->query("SELECT COALESCE(SUM(jumlah_panen),0) as t FROM panen WHERE MONTH(tanggal_panen)=MONTH(CURDATE())")->fetch_assoc()['t'];
$jml_transaksi = $conn->query("SELECT COUNT(*) as c FROM panen")->fetch_assoc()['c'];

$edit_data = isset($_GET['edit']) ? $conn->query("SELECT * FROM panen WHERE id=".(int)$_GET['edit'])->fetch_assoc() : null;

include 'includes/header.php';
?>

<div class="page-header">
    <div><h3>Catatan Hasil Panen</h3><p>Rekap hasil panen komoditas Desa Argamukti</p></div>
    <button class="btn btn-primary" onclick="openModal('modalPanen')"><i class="fa-solid fa-plus"></i> Catat Panen</button>
</div>

<?php if(isset($_GET['msg'])): ?>
<div style="background:rgba(22,163,74,.1);border:1px solid rgba(22,163,74,.3);border-radius:10px;padding:14px 18px;margin-bottom:20px;color:#15803d;font-size:0.875rem;font-weight:500;display:flex;align-items:center;gap:12px;">
    <i class="fa-solid fa-circle-check"></i> Data panen berhasil <?= $_GET['msg']==='hapus'?'dihapus':'disimpan' ?>!
</div>
<?php endif; ?>

<!-- Stats Row -->
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:22px;">
    <div class="card" style="border-left:4px solid var(--primary);"><div class="card-body" style="padding:18px;"><div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;font-weight:500;">Total Seluruh Panen</div><div style="font-size:1.5rem;font-weight:800;color:var(--primary);"><?= number_format($total_panen,0) ?> Kg</div></div></div>
    <div class="card" style="border-left:4px solid var(--secondary);"><div class="card-body" style="padding:18px;"><div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;font-weight:500;">Panen Bulan Ini</div><div style="font-size:1.5rem;font-weight:800;color:var(--secondary);"><?= number_format($bulan_ini,0) ?> Kg</div></div></div>
    <div class="card" style="border-left:4px solid var(--accent);"><div class="card-body" style="padding:18px;"><div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;font-weight:500;">Jumlah Transaksi</div><div style="font-size:1.5rem;font-weight:800;color:var(--accent);"><?= $jml_transaksi ?> catatan</div></div></div>
</div>

<div class="card">
    <div class="dt-toolbar">
        <div class="fw-bold" style="font-size:0.9rem;">Rekap Panen</div>
        <div style="display:flex;gap:10px;align-items:center;">
            <div class="search-box"><i class="fa-solid fa-search"></i><input type="text" id="searchPanen" placeholder="Cari petani / komoditas..." oninput="filterTable('searchPanen','tblPanen')"></div>
            <button class="btn btn-outline btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i></button>
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table" id="tblPanen">
            <thead><tr><th>No</th><th>Tanggal</th><th>Petani</th><th>Komoditas</th><th>Jumlah</th><th>Keterangan</th><th class="text-center">Aksi</th></tr></thead>
            <tbody>
            <?php $panens->data_seek(0); $no=1; while($row=$panens->fetch_assoc()): ?>
            <tr>
                <td><?= $no++ ?></td>
                <td><?= date('d M Y',strtotime($row['tanggal_panen'])) ?></td>
                <td><div class="fw-bold"><?= htmlspecialchars($row['nama_petani']) ?></div><small>Mandiri</small></td>
                <td><span class="badge badge-success"><?= htmlspecialchars($row['nama_komoditas']) ?></span></td>
                <td><div class="fw-bold" style="color:var(--primary);font-size:1rem;"><?= number_format($row['jumlah_panen'],0) ?> Kg</div><small style="color:var(--text-muted);"><?= number_format($row['jumlah_panen']/1000,3) ?> Ton</small></td>
                <td style="max-width:180px;"><?= htmlspecialchars($row['keterangan']?:'—') ?></td>
                <td class="text-center"><div style="display:flex;gap:6px;justify-content:center;">
                    <a href="panen.php?edit=<?= $row['id'] ?>" class="btn btn-sm btn-icon btn-icon-edit"><i class="fa-solid fa-pen"></i></a>
                    <a href="panen.php?hapus=<?= $row['id'] ?>" class="btn btn-sm btn-icon btn-icon-delete" onclick="return confirm('Hapus catatan panen ini?')"><i class="fa-solid fa-trash"></i></a>
                </div></td>
            </tr>
            <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- MODAL -->
<div class="modal-overlay" id="modalPanen">
    <div class="modal-box">
        <div class="modal-header">
            <h5><i class="fa-solid fa-wheat-awn" style="color:var(--accent);margin-right:8px;"></i> <?= $edit_data ? 'Edit' : 'Catat' ?> Panen</h5>
            <button class="modal-close" onclick="closeModal('modalPanen')"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form method="POST">
            <input type="hidden" name="edit_id" value="<?= $edit_data['id'] ?? 0 ?>">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Tanggal Panen <span style="color:var(--danger)">*</span></label>
                    <input type="date" name="tanggal_panen" class="form-control" required value="<?= $edit_data['tanggal_panen'] ?? date('Y-m-d') ?>">
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Petani <span style="color:var(--danger)">*</span></label>
                        <select name="petani_id" class="form-select" required>
                            <option value="">-- Pilih Petani --</option>
                            <?php $petanis->data_seek(0); while($p=$petanis->fetch_assoc()): ?>
                            <option value="<?=$p['id']?>" <?= ($edit_data['petani_id']??'')==$p['id']?'selected':'' ?>><?= htmlspecialchars($p['nama']) ?></option>
                            <?php endwhile; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Komoditas <span style="color:var(--danger)">*</span></label>
                        <select name="komoditas_id" class="form-select" required>
                            <option value="">-- Pilih Komoditas --</option>
                            <?php $komoditas->data_seek(0); while($k=$komoditas->fetch_assoc()): ?>
                            <option value="<?=$k['id']?>" <?= ($edit_data['komoditas_id']??'')==$k['id']?'selected':'' ?>><?= htmlspecialchars($k['nama_komoditas']) ?></option>
                            <?php endwhile; ?>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Jumlah Panen <span style="color:var(--danger)">*</span></label>
                    <div class="input-group">
                        <input type="number" name="jumlah_panen" class="form-control" step="0.5" min="0" placeholder="0" required value="<?= $edit_data['jumlah_panen'] ?? '' ?>">
                        <span class="input-group-text">Kg</span>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Keterangan</label>
                    <textarea name="keterangan" class="form-control" rows="3" placeholder="Contoh: Panen sukses (Boleh kosong)"><?= htmlspecialchars($edit_data['keterangan'] ?? '') ?></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalPanen')">Batal</button>
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-save"></i> Simpan</button>
            </div>
        </form>
    </div>
</div>

<?php $extra_script = $edit_data ? "<script>openModal('modalPanen');</script>" : ''; include 'includes/footer.php'; ?>

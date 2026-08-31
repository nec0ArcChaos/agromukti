<?php
if (session_status() === PHP_SESSION_NONE) { session_start(); }
include 'config.php';
checkAuth();

$page_title = "Manajemen Pengguna Sistem";

// Hanya admin yang boleh akses
if (($_SESSION['role'] ?? '') !== 'admin') {
    header("Location: dashboard.php"); exit;
}

// Handle Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_user'])) {
    $id       = (int)($_POST['id'] ?? 0);
    $nama     = cleanInput($_POST['nama']);
    $username = cleanInput($_POST['username']);
    $role     = in_array($_POST['role'], ['admin','petugas']) ? $_POST['role'] : 'petugas';
    $password = $_POST['password'] ?? '';

    if ($id > 0) {
        if (!empty($password)) {
            $pass_hash = password_hash($password, PASSWORD_BCRYPT);
            $conn->query("UPDATE users SET nama='$nama', username='$username', role='$role', password='$pass_hash' WHERE id=$id");
        } else {
            $conn->query("UPDATE users SET nama='$nama', username='$username', role='$role' WHERE id=$id");
        }
        setFlash('success', 'Data pengguna berhasil diperbarui!');
    } else {
        $pass_hash = password_hash(!empty($password) ? $password : 'password123', PASSWORD_BCRYPT);
        $conn->query("INSERT INTO users (nama, username, password, role) VALUES ('$nama', '$username', '$pass_hash', '$role')");
        setFlash('success', 'Pengguna baru berhasil ditambahkan! Password default: password123');
    }
    header("Location: users.php"); exit;
}

if (isset($_GET['delete_user'])) {
    $del_id = (int)$_GET['delete_user'];
    if ($del_id !== (int)$_SESSION['user_id']) {
        $conn->query("DELETE FROM users WHERE id=$del_id");
        setFlash('success', 'Pengguna berhasil dihapus!');
    } else {
        setFlash('error', 'Tidak bisa menghapus akun sendiri!');
    }
    header("Location: users.php"); exit;
}

$edit_user = isset($_GET['edit']) ? $conn->query("SELECT * FROM users WHERE id=" . (int)$_GET['edit'])->fetch_assoc() : null;
$users_list = $conn->query("SELECT * FROM users ORDER BY role ASC, id ASC");

include 'includes/header.php';
$flash = getFlash();
?>

<?php if ($flash): ?>
    <div style="padding:12px 18px; background: <?= $flash['type']=='success' ? '#dcfce7' : '#fee2e2' ?>; color: <?= $flash['type']=='success' ? '#15803d' : '#b91c1c' ?>; border-radius:10px; margin-bottom:20px; font-weight:600; font-size:0.84rem; border:1px solid <?= $flash['type']=='success' ? '#86efac' : '#fca5a5' ?>;">
        <i class="fa-solid <?= $flash['type']=='success' ? 'fa-circle-check' : 'fa-circle-exclamation' ?> me-2"></i><?= $flash['message'] ?>
    </div>
<?php endif; ?>

<div class="page-header">
    <div>
        <h3>Manajemen Pengguna Sistem</h3>
        <p>Kelola akun Admin dan Petugas yang bisa mengakses panel backend AgroMukti</p>
    </div>
    <button class="btn btn-primary" onclick="openModal('modalUser')">
        <i class="fa-solid fa-user-plus"></i> Tambah Pengguna
    </button>
</div>

<!-- STAT CARDS -->
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:24px;">
    <?php
    $total_admin   = $conn->query("SELECT COUNT(*) as c FROM users WHERE role='admin'")->fetch_assoc()['c'];
    $total_petugas = $conn->query("SELECT COUNT(*) as c FROM users WHERE role='petugas'")->fetch_assoc()['c'];
    ?>
    <div class="card" style="border-left:4px solid var(--primary);">
        <div class="card-body" style="padding:18px; display:flex; align-items:center; gap:14px;">
            <div style="width:44px;height:44px;border-radius:10px;background:rgba(15,118,110,0.12);display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:1.2rem;"><i class="fa-solid fa-shield-halved"></i></div>
            <div>
                <div style="font-size:0.75rem;color:var(--text-muted);font-weight:500;">Jumlah Admin</div>
                <div style="font-size:1.5rem;font-weight:800;color:var(--primary);"><?= $total_admin ?> <small style="font-size:0.8rem;">orang</small></div>
            </div>
        </div>
    </div>
    <div class="card" style="border-left:4px solid var(--secondary);">
        <div class="card-body" style="padding:18px; display:flex; align-items:center; gap:14px;">
            <div style="width:44px;height:44px;border-radius:10px;background:rgba(124,58,237,0.12);display:flex;align-items:center;justify-content:center;color:var(--secondary);font-size:1.2rem;"><i class="fa-solid fa-user-gear"></i></div>
            <div>
                <div style="font-size:0.75rem;color:var(--text-muted);font-weight:500;">Jumlah Petugas</div>
                <div style="font-size:1.5rem;font-weight:800;color:var(--secondary);"><?= $total_petugas ?> <small style="font-size:0.8rem;">orang</small></div>
            </div>
        </div>
    </div>
</div>

<!-- TABEL USERS -->
<div class="card">
    <div class="card-header">
        <div>
            <h4 class="card-title"><i class="fa-solid fa-users-gear me-2" style="color:var(--primary);"></i> Daftar Akun Pengguna Sistem</h4>
            <span class="card-subtitle">Admin & Petugas yang berhak mengelola data AgroMukti</span>
        </div>
        <div class="search-input">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="searchUser" placeholder="Cari nama / username..." onkeyup="filterTable('searchUser', 'tableUsers')">
        </div>
    </div>
    <div class="table-wrapper">
        <table class="data-table" id="tableUsers">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Nama Lengkap</th>
                    <th>Username</th>
                    <th>Role / Hak Akses</th>
                    <th>Tanggal Dibuat</th>
                    <th style="text-align:right;">Aksi</th>
                </tr>
            </thead>
            <tbody>
                <?php $no = 1; while ($u = $users_list->fetch_assoc()): ?>
                <tr>
                    <td><?= $no++ ?></td>
                    <td class="fw-bold"><?= htmlspecialchars($u['nama']) ?></td>
                    <td><code><?= htmlspecialchars($u['username']) ?></code></td>
                    <td>
                        <span class="badge <?= $u['role'] === 'admin' ? 'badge-purple' : 'badge-success' ?>">
                            <i class="fa-solid <?= $u['role'] === 'admin' ? 'fa-shield-halved' : 'fa-user-gear' ?>"></i>
                            <?= strtoupper($u['role']) ?>
                        </span>
                    </td>
                    <td><?= date('d M Y H:i', strtotime($u['created_at'])) ?></td>
                    <td style="text-align:right;">
                        <a href="users.php?edit=<?= $u['id'] ?>" class="btn btn-sm btn-outline" title="Edit"><i class="fa-solid fa-pen"></i></a>
                        <?php if ($u['id'] != $_SESSION['user_id']): ?>
                        <a href="users.php?delete_user=<?= $u['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Hapus pengguna <?= htmlspecialchars($u['nama']) ?>?')">
                            <i class="fa-solid fa-trash"></i>
                        </a>
                        <?php else: ?>
                        <button class="btn btn-sm btn-outline" disabled title="Tidak bisa hapus akun sendiri"><i class="fa-solid fa-lock"></i></button>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- MODAL TAMBAH / EDIT USER -->
<div class="modal-overlay" id="modalUser" <?= $edit_user ? 'style="display:flex;"' : '' ?>>
    <div class="modal-box">
        <div class="modal-header">
            <h5><i class="fa-solid fa-user-plus me-2"></i> <?= $edit_user ? 'Edit' : 'Tambah' ?> Pengguna Sistem</h5>
            <button class="modal-close" onclick="closeModal('modalUser')">&times;</button>
        </div>
        <form action="users.php" method="POST">
            <input type="hidden" name="action_user" value="1">
            <input type="hidden" name="id" value="<?= $edit_user['id'] ?? 0 ?>">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Nama Lengkap</label>
                    <input type="text" name="nama" class="form-control" placeholder="Nama Lengkap Pengguna" required value="<?= htmlspecialchars($edit_user['nama'] ?? '') ?>">
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Username Login</label>
                        <input type="text" name="username" class="form-control" placeholder="username" required value="<?= htmlspecialchars($edit_user['username'] ?? '') ?>">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role / Hak Akses</label>
                        <select name="role" class="form-select" required>
                            <option value="petugas" <?= ($edit_user['role'] ?? '') === 'petugas' ? 'selected' : '' ?>>Petugas Lapangan</option>
                            <option value="admin" <?= ($edit_user['role'] ?? '') === 'admin' ? 'selected' : '' ?>>Administrator (Full Access)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Password <?= $edit_user ? '(Kosongkan jika tidak ingin diubah)' : '(Default: password123)' ?></label>
                    <input type="password" name="password" class="form-control" placeholder="<?= $edit_user ? 'Isi hanya jika ingin mengubah password' : 'Buat password baru' ?>" <?= $edit_user ? '' : 'required' ?>>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('modalUser')">Batal</button>
                <button type="submit" class="btn btn-primary"><i class="fa-solid fa-save me-1"></i> Simpan Pengguna</button>
            </div>
        </form>
    </div>
</div>

<?php if ($edit_user): ?>
<script>openModal('modalUser');</script>
<?php endif; ?>

<?php include 'includes/footer.php'; ?>

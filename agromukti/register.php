<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';

$error = '';
$success = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $nik      = cleanInput($_POST['nik']);
    $nama     = cleanInput($_POST['nama']);
    $no_hp    = cleanInput($_POST['no_hp']);
    $alamat   = cleanInput($_POST['alamat']);
    $username = cleanInput($_POST['username']);
    $password = $_POST['password'];

    if (empty($nik) || empty($nama) || empty($username) || empty($password)) {
        $error = "Semua bidang wajib diisi!";
    } else {
        // Check duplicate NIK or Username
        $cek_user = $conn->query("SELECT id FROM users WHERE username = '$username'");
        $cek_warga = $conn->query("SELECT id FROM warga WHERE nik = '$nik'");

        if ($cek_user->num_rows > 0) {
            $error = "Username sudah digunakan!";
        } elseif ($cek_warga->num_rows > 0) {
            $error = "NIK tersebut sudah terdaftar!";
        } else {
            // Insert to warga
            $conn->query("INSERT INTO warga (nama, nik, alamat, no_hp, status) VALUES ('$nama', '$nik', '$alamat', '$no_hp', 'aktif')");
            $warga_id = $conn->insert_id;

            // Also add as petani
            $conn->query("INSERT INTO petani (nama, nik, alamat, no_hp, status) VALUES ('$nama', '$nik', '$alamat', '$no_hp', 'aktif')");

            // Insert to users as role 'warga'
            $pass_hash = password_hash($password, PASSWORD_BCRYPT);
            $conn->query("INSERT INTO users (nama, username, password, role) VALUES ('$nama', '$username', '$pass_hash', 'warga')");

            header("Location: login.php?success=" . urlencode("Registrasi warga berhasil! Silahkan login dengan akun Anda."));
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registrasi Warga | AgroMukti</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
        /* ========================================================
           SIMPLE & ELEGANT TOP NAVBAR (MATCHING HOME PAGE)
           ======================================================== */
        :root {
            --nav-height: 64px;
        }

        .site-navbar {
            position: fixed;
            top: 0; left: 0; right: 0;
            height: var(--nav-height);
            background: rgba(8, 17, 26, 0.94);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
            z-index: 1000;
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
        }
        .nav-brand-icon {
            width: 36px; height: 36px;
            background: linear-gradient(135deg, #14b8a6, #0d9488);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 1.1rem;
            box-shadow: 0 3px 12px rgba(20, 184, 166, 0.3);
        }
        .nav-brand-text {
            display: flex;
            flex-direction: column;
        }
        .nav-brand-title {
            font-size: 1.15rem;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.1;
            letter-spacing: -0.02em;
        }
        .nav-brand-sub {
            font-size: 0.68rem;
            color: #2dd4bf;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .nav-menu {
            display: flex;
            align-items: center;
            gap: 28px;
            list-style: none;
            margin: 0; padding: 0;
        }
        .nav-menu a {
            color: #94a3b8;
            font-size: 0.84rem;
            font-weight: 600;
            text-decoration: none;
            transition: color 0.2s ease;
        }
        .nav-menu a:hover {
            color: #2dd4bf;
        }

        .btn-simple-primary {
            padding: 7px 18px;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            color: white;
            background: #0f766e;
            border: 1px solid #14b8a6;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .btn-simple-primary:hover {
            background: #14b8a6;
            color: #042f2e;
        }

        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: linear-gradient(135deg, #09121a 0%, #0f172a 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 90px 20px 40px;
            color: #f8fafc;
        }
        .reg-card {
            background: rgba(19, 34, 49, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 18px;
            padding: 36px;
            width: 100%;
            max-width: 520px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .brand-header { text-align: center; margin-bottom: 24px; }
        .brand-logo {
            width: 48px; height: 48px;
            background: linear-gradient(135deg, #14b8a6, #0d9488);
            border-radius: 12px;
            display: inline-flex; align-items: center; justify-content: center;
            font-size: 1.4rem; color: white; margin-bottom: 8px;
        }
        .brand-header h3 { font-size: 1.3rem; font-weight: 800; color: white; }
        .brand-header p { font-size: 0.78rem; color: #94a3b8; }

        .alert-danger { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 10px 14px; border-radius: 8px; font-size: 0.8rem; margin-bottom: 16px; }

        .form-group { margin-bottom: 16px; }
        .form-label { display: block; font-size: 0.78rem; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; }
        .form-control {
            width: 100%;
            padding: 10px 14px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            color: white;
            font-size: 0.84rem;
            font-family: inherit;
            outline: none;
        }
        .form-control:focus { border-color: #14b8a6; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .btn-submit {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #0d9488, #0f766e);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 0.88rem;
            font-weight: 700;
            cursor: pointer;
            margin-top: 10px;
            transition: all 0.2s;
        }
        .btn-submit:hover { opacity: 0.92; transform: translateY(-1px); }

        .reg-footer {
            margin-top: 20px;
            text-align: center;
            font-size: 0.8rem;
            color: #94a3b8;
        }
        .reg-footer a { color: #2dd4bf; font-weight: 600; text-decoration: none; }
        .reg-footer a:hover { text-decoration: underline; }

        @media (max-width: 768px) {
            .site-navbar { padding: 0 20px; }
            .nav-menu { display: none; }
            .form-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>

<!-- TOP NAVBAR (MATCHING HOME PAGE) -->
<header class="site-navbar">
    <a href="index.php" class="nav-brand">
        <div class="nav-brand-icon"><i class="fa-solid fa-leaf"></i></div>
        <div class="nav-brand-text">
            <span class="nav-brand-title">AgroMukti</span>
            <span class="nav-brand-sub">Portal Desa Argamukti</span>
        </div>
    </a>

    <ul class="nav-menu">
        <li><a href="index.php"><i class="fa-solid fa-house me-1"></i> Beranda</a></li>
        <li><a href="index.php#cek-status">Cek Pupuk</a></li>
        <li><a href="index.php#kalkulator-pupuk">Kalkulator POC</a></li>
        <li><a href="index.php#katalog-pupuk">Katalog Pupuk</a></li>
    </ul>

    <div>
        <a href="login.php" class="btn-simple-primary"><i class="fa-solid fa-right-to-bracket me-1"></i> Login</a>
    </div>
</header>

<div class="reg-card">
    <div class="brand-header">
        <div class="brand-logo"><i class="fa-solid fa-user-plus"></i></div>
        <h3>Pendaftaran Warga Desa Argamukti</h3>
        <p>Daftarkan diri Anda untuk mengakses layanan terpadu desa</p>
    </div>

    <?php if ($error): ?>
        <div class="alert-danger"><i class="fa-solid fa-circle-exclamation me-2"></i><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form action="register.php" method="POST">
        <div class="form-grid">
            <div class="form-group">
                <label class="form-label">NIK (16 Digit)</label>
                <input type="text" name="nik" class="form-control" maxlength="20" placeholder="321008xxxxxxxxxx" required>
            </div>
            <div class="form-group">
                <label class="form-label">Nama Lengkap</label>
                <input type="text" name="nama" class="form-control" placeholder="Nama Lengkap" required>
            </div>
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label class="form-label">No. Handphone / WA</label>
                <input type="text" name="no_hp" class="form-control" placeholder="08xxxxxxxxxx">
            </div>
            <div class="form-group">
                <label class="form-label">Username Login</label>
                <input type="text" name="username" class="form-control" placeholder="username" required>
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Alamat Lengkap / Dusun</label>
            <input type="text" name="alamat" class="form-control" placeholder="Contoh: Dusun Apuy RT 02/RW 01">
        </div>

        <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" name="password" class="form-control" placeholder="Buat Password" required>
        </div>

        <button type="submit" class="btn-submit">
            <i class="fa-solid fa-user-check me-1"></i> Daftar Akun Warga
        </button>
    </form>

    <div class="reg-footer">
        Sudah memiliki akun? <a href="login.php">Login di sini</a>
    </div>
</div>

</body>
</html>

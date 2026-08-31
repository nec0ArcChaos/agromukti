<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
include 'config.php';

$current_logged_user = $_SESSION['nama'] ?? '';
$current_logged_role = $_SESSION['role'] ?? '';

$error = $_GET['error'] ?? '';
$success = $_GET['success'] ?? '';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Terpadu | AgroMukti Desa Argamukti</title>
    <!-- Fonts & Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    
    <style>
        :root {
            --primary: #0f766e;
            --primary-light: #14b8a6;
            --primary-dark: #0d9488;
            --emerald-glow: rgba(20, 184, 166, 0.25);
            --dark-bg: #09121a;
            --card-dark: #111e2e;
            --border-dark: #1e3a5f;
            --text-white: #ffffff;
            --text-sub: #94a3b8;
        }

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

        .btn-simple-outline {
            padding: 7px 16px;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 600;
            color: #cbd5e1;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.15);
            text-decoration: none;
            transition: all 0.2s;
        }
        .btn-simple-outline:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #ffffff;
        }

        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: linear-gradient(135deg, #060d14 0%, #0d1a29 50%, #08111c 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 90px 20px 40px;
            color: var(--text-white);
        }

        .auth-container {
            width: 100%;
            max-width: 1000px;
            background: rgba(17, 30, 46, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(20px);
            overflow: hidden;
            display: grid;
            grid-template-columns: 1.05fr 1.15fr;
        }

        /* LEFT BRAND PANEL */
        .auth-brand-panel {
            background: linear-gradient(145deg, #09332e 0%, #041f1c 100%);
            border-right: 1px solid rgba(20, 184, 166, 0.2);
            padding: 44px 38px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
        }
        .auth-brand-panel::before {
            content: '';
            position: absolute;
            top: -50px; right: -50px;
            width: 220px; height: 220px;
            background: radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, transparent 70%);
            border-radius: 50%;
        }

        .brand-top { display: flex; align-items: center; gap: 12px; }
        .brand-icon {
            width: 44px; height: 44px;
            background: linear-gradient(135deg, var(--primary-light), var(--primary-dark));
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.3rem; color: white;
            box-shadow: 0 6px 20px var(--emerald-glow);
        }
        .brand-text h3 { font-size: 1.25rem; font-weight: 800; color: white; line-height: 1.1; }
        .brand-text span { font-size: 0.72rem; color: #2dd4bf; font-weight: 600; }

        .brand-mid { margin: 36px 0; }
        .brand-mid h2 { font-size: 1.7rem; font-weight: 800; color: white; line-height: 1.25; margin-bottom: 12px; }
        .brand-mid h2 span { color: #2dd4bf; }
        .brand-mid p { font-size: 0.86rem; color: #cbd5e1; line-height: 1.6; }

        .feature-pills {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 24px;
        }
        .feature-pill-item {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 0.8rem;
            color: #e2e8f0;
        }
        .feature-pill-item i { font-size: 1.05rem; color: #2dd4bf; }

        .brand-bottom {
            font-size: 0.74rem;
            color: #94a3b8;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 18px;
        }

        /* RIGHT FORM PANEL */
        .auth-form-panel {
            padding: 44px 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .form-header { margin-bottom: 24px; }
        .form-header h3 { font-size: 1.45rem; font-weight: 800; color: white; margin-bottom: 4px; }
        .form-header p { font-size: 0.82rem; color: var(--text-sub); }

        .alert {
            padding: 12px 16px;
            border-radius: 10px;
            font-size: 0.82rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .alert-danger { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; }
        .alert-success { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #86efac; }

        .form-group { margin-bottom: 18px; }
        .form-label { display: block; font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin-bottom: 8px; }
        
        .input-box {
            position: relative;
            display: flex;
            align-items: center;
        }
        .input-box i.input-icon {
            position: absolute;
            left: 14px;
            color: #64748b;
            font-size: 0.95rem;
        }
        .input-field {
            width: 100%;
            padding: 12px 42px 12px 42px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            color: white;
            font-size: 0.86rem;
            font-family: inherit;
            outline: none;
            transition: all 0.25s;
        }
        .input-field:focus {
            border-color: #14b8a6;
            background: rgba(15, 23, 42, 0.9);
            box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.2);
        }
        .toggle-password {
            position: absolute;
            right: 14px;
            color: #64748b;
            cursor: pointer;
            font-size: 0.9rem;
            transition: color 0.2s;
        }
        .toggle-password:hover { color: #2dd4bf; }

        .btn-login-submit {
            width: 100%;
            padding: 13px;
            background: linear-gradient(135deg, var(--primary-light), var(--primary-dark));
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 0.92rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.25s;
            box-shadow: 0 4px 18px var(--emerald-glow);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-top: 8px;
        }
        .btn-login-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(20, 184, 166, 0.4);
        }

        /* QUICK DEMO ROLE BUTTONS */
        .quick-role-section {
            margin-top: 24px;
            padding-top: 18px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .quick-role-title {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #94a3b8;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .quick-role-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }
        .role-chip {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 8px 6px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .role-chip:hover {
            background: rgba(20, 184, 166, 0.15);
            border-color: #14b8a6;
            transform: translateY(-1px);
        }
        .role-chip strong { display: block; font-size: 0.72rem; color: white; }
        .role-chip span { font-size: 0.65rem; color: #94a3b8; font-family: monospace; }

        .auth-footer {
            margin-top: 22px;
            text-align: center;
            font-size: 0.8rem;
            color: #94a3b8;
        }
        .auth-footer a { color: #2dd4bf; font-weight: 600; text-decoration: none; }
        .auth-footer a:hover { text-decoration: underline; }

        @media (max-width: 860px) {
            .auth-container { grid-template-columns: 1fr; }
            .auth-brand-panel { display: none; }
            .auth-form-panel { padding: 32px 24px; }
            .quick-role-grid { grid-template-columns: repeat(2, 1fr); }
        }
    </style>
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
        <a href="register.php" class="btn-simple-outline"><i class="fa-solid fa-user-plus me-1"></i> Daftar Warga</a>
    </div>
</header>

<div class="auth-container">
    <!-- LEFT HERO BRAND PANEL -->
    <div class="auth-brand-panel">
        <div>
            <div class="brand-top">
                <div class="brand-icon"><i class="fa-solid fa-leaf"></i></div>
                <div class="brand-text">
                    <h3>AgroMukti</h3>
                    <span>Desa Argamukti, Majalengka</span>
                </div>
            </div>

            <div class="brand-mid">
                <h2>Portal Pertanian & <span>Distribusi Pupuk</span></h2>
                <p>
                    Sistem informasi digital untuk pengelolaan data petani, lahan hortikultura, hasil panen, dan penyaluran pupuk organik Desa Argamukti.
                </p>

                <div class="feature-pills">
                    <div class="feature-pill-item">
                        <i class="fa-solid fa-users"></i>
                        <span>Data Petani & Lahan Pertanian</span>
                    </div>
                    <div class="feature-pill-item">
                        <i class="fa-solid fa-seedling"></i>
                        <span>Distribusi Pupuk Organik Terdata</span>
                    </div>
                    <div class="feature-pill-item">
                        <i class="fa-solid fa-wheat-awn"></i>
                        <span>Rekap Panen & Laporan Resmi</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="brand-bottom">
            <p>© 2026 Pemerintah Desa Argamukti • KKM Universitas Muhammadiyah Cirebon</p>
        </div>
    </div>

    <!-- RIGHT LOGIN FORM PANEL -->
    <div class="auth-form-panel">
        <div class="form-header">
            <h3>Masuk ke Sistem</h3>
            <p>Silakan gunakan Username atau NIK terdaftar untuk melanjutkan.</p>
        </div>

        <?php if (!empty($current_logged_user)): ?>
            <div style="background:rgba(20, 184, 166, 0.15); border:1px solid rgba(20, 184, 166, 0.4); border-radius:12px; padding:12px 16px; margin-bottom:18px; font-size:0.8rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                <div>
                    <span style="color:#94a3b8; display:block; font-size:0.7rem;">Status Login Saat Ini:</span>
                    <strong style="color:white;"><?= htmlspecialchars($current_logged_user) ?></strong> <span class="badge badge-success" style="font-size:0.68rem;"><?= strtoupper($current_logged_role) ?></span>
                </div>
                <div style="display:flex; gap:8px;">
                    <a href="<?= $current_logged_role === 'warga' ? 'portal_warga.php' : 'dashboard.php' ?>" style="padding:5px 12px; background:#14b8a6; color:#042f2e; border-radius:6px; font-weight:700; font-size:0.75rem;">
                        <i class="fa-solid fa-arrow-right me-1"></i> Buka Panel
                    </a>
                    <a href="logout.php" style="padding:5px 10px; background:rgba(239,68,68,0.2); color:#fca5a5; border-radius:6px; font-weight:700; font-size:0.75rem;">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </a>
                </div>
            </div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="alert alert-danger">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>
                    <?php 
                    if ($error === 'invalid') echo 'Username / NIK atau Password tidak cocok!';
                    elseif ($error === 'unauthorized') echo 'Harap login terlebih dahulu untuk mengakses halaman.';
                    else echo htmlspecialchars($error);
                    ?>
                </span>
            </div>
        <?php endif; ?>

        <?php if ($success): ?>
            <div class="alert alert-success">
                <i class="fa-solid fa-circle-check"></i>
                <span><?= htmlspecialchars($success) ?></span>
            </div>
        <?php endif; ?>

        <form action="proses_login.php" method="POST" id="mainLoginForm">
            <div class="form-group">
                <label class="form-label">Username atau NIK Warga</label>
                <div class="input-box">
                    <i class="fa-solid fa-user input-icon"></i>
                    <input type="text" name="username" id="inputUsername" class="input-field" placeholder="Masukkan Username / NIK 16 Digit" required autofocus>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Password</label>
                <div class="input-box">
                    <i class="fa-solid fa-lock input-icon"></i>
                    <input type="password" name="password" id="inputPassword" class="input-field" placeholder="Masukkan Password" required>
                    <i class="fa-regular fa-eye toggle-password" id="togglePassBtn" onclick="togglePass()"></i>
                </div>
            </div>

            <button type="submit" class="btn-login-submit">
                <i class="fa-solid fa-arrow-right-to-bracket"></i>
                <span>Masuk Sekarang</span>
            </button>
        </form>

        <!-- QUICK LOGIN PRESET CHIPS (NATIVE 1-CLICK FORMS) -->
        <div class="quick-role-section">
            <div class="quick-role-title">
                <span><i class="fa-solid fa-bolt me-1" style="color:#f59e0b;"></i> Klik Cepat Role Demo (1-Click Login)</span>
                <small style="color:#64748b;">(Pass: password123)</small>
            </div>
            <div class="quick-role-grid">
                <form action="proses_login.php" method="POST" style="margin:0;">
                    <input type="hidden" name="username" value="admin">
                    <input type="hidden" name="password" value="password123">
                    <button type="submit" class="role-chip" style="width:100%; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); cursor:pointer;">
                        <strong>👑 Administrator</strong>
                        <span>admin</span>
                    </button>
                </form>

                <form action="proses_login.php" method="POST" style="margin:0;">
                    <input type="hidden" name="username" value="petugas">
                    <input type="hidden" name="password" value="password123">
                    <button type="submit" class="role-chip" style="width:100%; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); cursor:pointer;">
                        <strong>🧑‍🌾 Petugas Lapangan</strong>
                        <span>petugas</span>
                    </button>
                </form>

                <form action="proses_login.php" method="POST" style="margin:0;">
                    <!-- Menggunakan custom login Ayu -->
                    <input type="hidden" name="username" value="ayu">
                    <input type="hidden" name="password" value="ayu123">
                    <button type="submit" class="role-chip" style="width:100%; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); cursor:pointer;">
                        <strong>🌾 Petani / Warga</strong>
                        <span>ayu</span>
                    </button>
                </form>
            </div>
        </div>

        <div class="auth-footer">
            Belum memiliki akun warga? <a href="register.php">Daftar Akun Baru</a> &nbsp;•&nbsp; <a href="index.php">Lihat Beranda</a>
        </div>
    </div>
</div>

<script>
function togglePass() {
    const passInput = document.getElementById('inputPassword');
    const toggleBtn = document.getElementById('togglePassBtn');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleBtn.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passInput.type = 'password';
        toggleBtn.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function quickFill(u, p) {
    document.getElementById('inputUsername').value = u;
    document.getElementById('inputPassword').value = p;
    document.getElementById('mainLoginForm').submit();
}
</script>

</body>
</html>

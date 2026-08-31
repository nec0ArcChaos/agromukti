<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_SERVER['PATH_INFO']) ? trim($_SERVER['PATH_INFO'], '/') : (isset($_GET['endpoint']) ? $_GET['endpoint'] : '');
$request = explode('/', $path);
$resource = $request[0] ?? '';
$id = $request[1] ?? null;

function sendResponse($status, $message, $data = null) {
    http_response_code($status);
    echo json_encode([
        'status' => $status == 200 ? 'success' : 'error',
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

if (empty($resource)) {
    sendResponse(200, "API AgroMukti Aktif", ["endpoints" => ["/petani", "/lahan", "/komoditas", "/panen", "/permintaan", "/distribusi", "/stok", "/dashboard"]]);
}

switch ($resource) {
    case 'petani':
        if ($method === 'GET') {
            if ($id) {
                $stmt = $conn->query("SELECT * FROM petani WHERE id = " . (int)$id);
                $data = $stmt->fetch_assoc();
            } else {
                $stmt = $conn->query("SELECT * FROM petani");
                $data = $stmt->fetch_all(MYSQLI_ASSOC);
            }
            sendResponse(200, "Data Petani", $data);
        }
        break;

    case 'lahan':
        if ($method === 'GET') {
            $stmt = $conn->query("SELECT l.*, p.nama as nama_petani, k.nama as nama_komoditas FROM lahan l JOIN petani p ON l.petani_id=p.id JOIN komoditas k ON l.komoditas_id=k.id");
            $data = $stmt->fetch_all(MYSQLI_ASSOC);
            sendResponse(200, "Data Lahan", $data);
        }
        break;

    case 'komoditas':
        if ($method === 'GET') {
            $stmt = $conn->query("SELECT * FROM komoditas");
            $data = $stmt->fetch_all(MYSQLI_ASSOC);
            sendResponse(200, "Data Komoditas", $data);
        }
        break;

    case 'panen':
        if ($method === 'GET') {
            $stmt = $conn->query("SELECT p.*, pt.nama as nama_petani, k.nama as nama_komoditas FROM panen p JOIN petani pt ON p.petani_id=pt.id JOIN komoditas k ON p.komoditas_id=k.id ORDER BY p.tanggal_panen DESC");
            $data = $stmt->fetch_all(MYSQLI_ASSOC);
            sendResponse(200, "Data Panen", $data);
        }
        break;

    case 'permintaan':
        if ($method === 'GET') {
            $stmt = $conn->query("SELECT * FROM permintaan_pupuk");
            $data = $stmt->fetch_all(MYSQLI_ASSOC);
            sendResponse(200, "Data Permintaan Pupuk", $data);
        }
        break;

    case 'distribusi':
        if ($method === 'GET') {
            $stmt = $conn->query("SELECT * FROM distribusi_pupuk");
            $data = $stmt->fetch_all(MYSQLI_ASSOC);
            sendResponse(200, "Data Distribusi Pupuk", $data);
        }
        break;

    case 'stok':
        if ($method === 'GET') {
            $stmt = $conn->query("SELECT s.*, p.nama_produk, p.jenis FROM stok_pupuk s JOIN produk_pupuk p ON s.produk_pupuk_id=p.id");
            $data = $stmt->fetch_all(MYSQLI_ASSOC);
            sendResponse(200, "Data Stok Pupuk", $data);
        }
        break;

    case 'dashboard':
        if ($method === 'GET') {
            $total_petani = $conn->query("SELECT COUNT(*) as c FROM petani")->fetch_assoc()['c'];
            $total_panen = $conn->query("SELECT SUM(jumlah_panen) as c FROM panen")->fetch_assoc()['c'];
            sendResponse(200, "Data Dashboard", [
                "total_petani" => $total_petani,
                "total_panen_kg" => $total_panen
            ]);
        }
        break;

    default:
        sendResponse(404, "Endpoint tidak ditemukan");
        break;
}
?>

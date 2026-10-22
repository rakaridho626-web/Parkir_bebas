/**
 * ==============================================================================
 * APLIKASI MANAJEMEN PARKIR - FULL BACKEND (SINGLE FILE)
 * PERSIS 100% SESUAI SKEMA DATABASE & SWIMLANE DOKUMEN SPK PAKET 2 UKK RPL
 * Database: parkir
 * Tabel: tb_user, tb_kendaraan, tb_tarif, tb_area_parkir, tb_transaksi, tb_log_aktivitas
 * ==============================================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

// 1. KONEKSI DATABASE (DATABASE: parkir SESUAI SPK)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'parkir',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper: Catat Log Aktivitas (tb_log_aktivitas)
async function logActivity(id_user, aktivitas) {
    try {
        await pool.query(
            'INSERT INTO tb_log_aktivitas (id_user, aktivitas, waktu_aktivitas) VALUES (?, ?, NOW())',
            [id_user || null, aktivitas]
        );
    } catch (err) {
        console.error('[Audit Log Error]:', err.message);
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ==============================================================================
// 2. AUTENTIKASI: LOGIN & LOGOUT (tb_user)
// ==============================================================================

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username dan password wajib diisi!' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM tb_user WHERE username = ? AND password = ? AND status_aktif = 1',
            [username, password]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Username/Password salah atau akun tidak aktif!' });
        }

        const user = rows[0];
        await logActivity(user.id_user, `User ${user.username} (${user.role}) berhasil login.`);

        res.json({
            success: true,
            message: 'Login berhasil!',
            user: {
                id: user.id_user,
                username: user.username,
                nama_lengkap: user.nama_lengkap,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    const { id_user, username } = req.body;
    if (id_user || username) {
        await logActivity(id_user, `User ${username || id_user} logout dari sistem.`);
    }
    res.json({ success: true, message: 'Logout berhasil' });
});

// ==============================================================================
// 3. CRUD USER (tb_user - KHUSUS ADMIN)
// ==============================================================================

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id_user as id, username, nama_lengkap, role, status_aktif FROM tb_user ORDER BY id_user DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, password, nama_lengkap, role, currentUserId } = req.body;
        await pool.query(
            'INSERT INTO tb_user (username, password, nama_lengkap, role, status_aktif) VALUES (?, ?, ?, ?, 1)',
            [username, password, nama_lengkap, role]
        );
        await logActivity(currentUserId, `Menambah user baru: ${username} (${role})`);
        res.json({ success: true, message: 'User berhasil ditambahkan!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, nama_lengkap, role, currentUserId } = req.body;
        if (password) {
            await pool.query(
                'UPDATE tb_user SET username = ?, password = ?, nama_lengkap = ?, role = ? WHERE id_user = ?',
                [username, password, nama_lengkap, role, id]
            );
        } else {
            await pool.query(
                'UPDATE tb_user SET username = ?, nama_lengkap = ?, role = ? WHERE id_user = ?',
                [username, nama_lengkap, role, id]
            );
        }
        await logActivity(currentUserId, `Mengubah data user ID: ${id}`);
        res.json({ success: true, message: 'User berhasil diperbarui!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentUserId } = req.query;
        await pool.query('DELETE FROM tb_user WHERE id_user = ?', [id]);
        await logActivity(currentUserId, `Menghapus user ID: ${id}`);
        res.json({ success: true, message: 'User berhasil dihapus!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ==============================================================================
// 4. CRUD TARIF PARKIR (tb_tarif - KHUSUS ADMIN)
// ==============================================================================

app.get('/api/tarif', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id_tarif as id, jenis_kendaraan, tarif_per_jam, 0 as tarif_maksimal FROM tb_tarif ORDER BY id_tarif ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/tarif', async (req, res) => {
    try {
        const { jenis_kendaraan, tarif_per_jam, currentUserId } = req.body;
        await pool.query(
            'INSERT INTO tb_tarif (jenis_kendaraan, tarif_per_jam) VALUES (?, ?)',
            [jenis_kendaraan.toLowerCase(), tarif_per_jam]
        );
        await logActivity(currentUserId, `Menambah tarif: ${jenis_kendaraan} (Rp${tarif_per_jam})`);
        res.json({ success: true, message: 'Tarif berhasil ditambahkan!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.put('/api/tarif/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { jenis_kendaraan, tarif_per_jam, currentUserId } = req.body;
        await pool.query(
            'UPDATE tb_tarif SET jenis_kendaraan = ?, tarif_per_jam = ? WHERE id_tarif = ?',
            [jenis_kendaraan.toLowerCase(), tarif_per_jam, id]
        );
        await logActivity(currentUserId, `Mengubah tarif ID: ${id}`);
        res.json({ success: true, message: 'Tarif berhasil diperbarui!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.delete('/api/tarif/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentUserId } = req.query;
        await pool.query('DELETE FROM tb_tarif WHERE id_tarif = ?', [id]);
        await logActivity(currentUserId, `Menghapus tarif ID: ${id}`);
        res.json({ success: true, message: 'Tarif berhasil dihapus!' });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Tarif sedang digunakan transaksi!' });
    }
});

// ==============================================================================
// 5. CRUD AREA PARKIR (tb_area_parkir - KHUSUS ADMIN)
// ==============================================================================

app.get('/api/area', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id_area as id, nama_area, kapasitas, terisi, CONCAT("Area-", id_area) as kode_area FROM tb_area_parkir ORDER BY id_area ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/area', async (req, res) => {
    try {
        const { nama_area, kapasitas, currentUserId } = req.body;
        await pool.query(
            'INSERT INTO tb_area_parkir (nama_area, kapasitas, terisi) VALUES (?, ?, 0)',
            [nama_area, kapasitas]
        );
        await logActivity(currentUserId, `Menambah area parkir: ${nama_area}`);
        res.json({ success: true, message: 'Area parkir berhasil ditambahkan!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.put('/api/area/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_area, kapasitas, currentUserId } = req.body;
        await pool.query(
            'UPDATE tb_area_parkir SET nama_area = ?, kapasitas = ? WHERE id_area = ?',
            [nama_area, kapasitas, id]
        );
        await logActivity(currentUserId, `Mengubah area parkir ID: ${id}`);
        res.json({ success: true, message: 'Area parkir berhasil diperbarui!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.delete('/api/area/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentUserId } = req.query;
        await pool.query('DELETE FROM tb_area_parkir WHERE id_area = ?', [id]);
        await logActivity(currentUserId, `Menghapus area parkir ID: ${id}`);
        res.json({ success: true, message: 'Area parkir berhasil dihapus!' });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Area sedang digunakan transaksi!' });
    }
});

// ==============================================================================
// 6. CRUD KENDARAAN (tb_kendaraan - KHUSUS ADMIN)
// ==============================================================================

app.get('/api/kendaraan', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id_kendaraan as id, plat_nomor, jenis_kendaraan, warna, pemilik FROM tb_kendaraan ORDER BY id_kendaraan DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/kendaraan', async (req, res) => {
    try {
        const { plat_nomor, jenis_kendaraan, warna, pemilik, currentUserId } = req.body;
        await pool.query(
            'INSERT INTO tb_kendaraan (plat_nomor, jenis_kendaraan, warna, pemilik, id_user) VALUES (?, ?, ?, ?, ?)',
            [plat_nomor.toUpperCase(), jenis_kendaraan, warna || '-', pemilik || '-', currentUserId || null]
        );
        await logActivity(currentUserId, `Menambah data kendaraan: ${plat_nomor.toUpperCase()}`);
        res.json({ success: true, message: 'Data kendaraan berhasil ditambahkan!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.put('/api/kendaraan/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { plat_nomor, jenis_kendaraan, warna, pemilik, currentUserId } = req.body;
        await pool.query(
            'UPDATE tb_kendaraan SET plat_nomor = ?, jenis_kendaraan = ?, warna = ?, pemilik = ? WHERE id_kendaraan = ?',
            [plat_nomor.toUpperCase(), jenis_kendaraan, warna || '-', pemilik || '-', id]
        );
        await logActivity(currentUserId, `Mengubah data kendaraan ID: ${id}`);
        res.json({ success: true, message: 'Data kendaraan diperbarui!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.delete('/api/kendaraan/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentUserId } = req.query;
        await pool.query('DELETE FROM tb_kendaraan WHERE id_kendaraan = ?', [id]);
        await logActivity(currentUserId, `Menghapus kendaraan ID: ${id}`);
        res.json({ success: true, message: 'Data kendaraan dihapus!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ==============================================================================
// 7. AUDIT TRAIL LOG AKTIVITAS (tb_log_aktivitas - KHUSUS ADMIN)
// ==============================================================================

app.get('/api/logs', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.id_log as id, COALESCE(u.username, 'system') as username, l.aktivitas, l.waktu_aktivitas as waktu
            FROM tb_log_aktivitas l
            LEFT JOIN tb_user u ON l.id_user = u.id_user
            ORDER BY l.waktu_aktivitas DESC LIMIT 100
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==============================================================================
// 8. TRANSAKSI PARKIR (tb_transaksi SESUAI SWIMLANE SPK)
// ==============================================================================

// Menampilkan Transaksi Aktif (status = 'masuk')
app.get('/api/transaksi/aktif', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.id_parkir as id, CONCAT("TIK-", LPAD(t.id_parkir, 6, "0")) as kode_tiket,
                   k.plat_nomor, tf.jenis_kendaraan, tf.tarif_per_jam,
                   a.nama_area, CONCAT("Area-", a.id_area) as kode_area,
                   t.waktu_masuk, t.status, u.nama_lengkap as petugas_masuk
            FROM tb_transaksi t
            JOIN tb_kendaraan k ON t.id_kendaraan = k.id_kendaraan
            JOIN tb_tarif tf ON t.id_tarif = tf.id_tarif
            JOIN tb_area_parkir a ON t.id_area = a.id_area
            LEFT JOIN tb_user u ON t.id_user = u.id_user
            WHERE t.status = 'masuk'
            ORDER BY t.id_parkir DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Check-In Kendaraan Masuk (Sesuai Swimlane Masuk)
app.post('/api/transaksi/masuk', async (req, res) => {
    try {
        const { plat_nomor, id_tarif, id_area, id_user } = req.body;
        const plat = plat_nomor.toUpperCase().trim();

        // 1. Cek apakah kendaraan masih berstatus 'masuk' di dalam area parkir
        const [active] = await pool.query(`
            SELECT t.id_parkir FROM tb_transaksi t
            JOIN tb_kendaraan k ON t.id_kendaraan = k.id_kendaraan
            WHERE k.plat_nomor = ? AND t.status = 'masuk'
        `, [plat]);

        if (active.length > 0) {
            return res.status(400).json({ success: false, message: 'Kendaraan dengan plat nomor ini masih berada di dalam area parkir!' });
        }

        // 2. Cek kapasitas area parkir (terisi >= kapasitas)
        const [[area]] = await pool.query('SELECT * FROM tb_area_parkir WHERE id_area = ?', [id_area]);
        if (area && area.terisi >= area.kapasitas) {
            return res.status(400).json({ success: false, message: 'Slot area parkir yang dipilih sudah penuh!' });
        }

        // 3. Cek atau daftarkan kendaraan di tb_kendaraan
        let [kendaraan] = await pool.query('SELECT id_kendaraan FROM tb_kendaraan WHERE plat_nomor = ?', [plat]);
        let id_kendaraan;
        if (kendaraan.length === 0) {
            const [[tarif]] = await pool.query('SELECT jenis_kendaraan FROM tb_tarif WHERE id_tarif = ?', [id_tarif]);
            const [insertK] = await pool.query(
                'INSERT INTO tb_kendaraan (plat_nomor, jenis_kendaraan, warna, pemilik) VALUES (?, ?, "-", "-")',
                [plat, tarif ? tarif.jenis_kendaraan : 'motor']
            );
            id_kendaraan = insertK.insertId;
        } else {
            id_kendaraan = kendaraan[0].id_kendaraan;
        }

        // 4. INSERT ke tb_transaksi
        const [transaksi] = await pool.query(
            `INSERT INTO tb_transaksi (id_kendaraan, waktu_masuk, id_tarif, id_area, status, id_user, durasi_jam, biaya_total)
             VALUES (?, NOW(), ?, ?, 'masuk', ?, 0, 0)`,
            [id_kendaraan, id_tarif, id_area, id_user || null]
        );

        // 5. UPDATE tb_area_parkir (terisi + 1)
        await pool.query('UPDATE tb_area_parkir SET terisi = terisi + 1 WHERE id_area = ?', [id_area]);

        // 6. INSERT tb_log_aktivitas
        await logActivity(id_user, `Kendaraan Masuk: ${plat} (ID Parkir: ${transaksi.insertId})`);

        // Ambil data karcis tiket
        const [[tiket]] = await pool.query(`
            SELECT t.id_parkir as id, CONCAT("TIK-", LPAD(t.id_parkir, 6, "0")) as kode_tiket,
                   k.plat_nomor, tf.jenis_kendaraan, tf.tarif_per_jam,
                   a.nama_area, t.waktu_masuk
            FROM tb_transaksi t
            JOIN tb_kendaraan k ON t.id_kendaraan = k.id_kendaraan
            JOIN tb_tarif tf ON t.id_tarif = tf.id_tarif
            JOIN tb_area_parkir a ON t.id_area = a.id_area
            WHERE t.id_parkir = ?
        `, [transaksi.insertId]);

        res.json({
            success: true,
            message: 'Check-in berhasil!',
            tiket
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Hitung Biaya Keluar (Sesuai Swimlane Keluar)
app.post('/api/transaksi/hitung-keluar', async (req, res) => {
    try {
        const { search } = req.body;
        const rawSearch = search.trim();
        const idSearch = rawSearch.toUpperCase().replace('TIK-', '').replace(/^0+/, '');

        const [rows] = await pool.query(`
            SELECT t.id_parkir as id, CONCAT("TIK-", LPAD(t.id_parkir, 6, "0")) as kode_tiket,
                   k.plat_nomor, tf.jenis_kendaraan, tf.tarif_per_jam,
                   a.nama_area, a.id_area, t.waktu_masuk
            FROM tb_transaksi t
            JOIN tb_kendaraan k ON t.id_kendaraan = k.id_kendaraan
            JOIN tb_tarif tf ON t.id_tarif = tf.id_tarif
            JOIN tb_area_parkir a ON t.id_area = a.id_area
            WHERE (t.id_parkir = ? OR k.plat_nomor = ?) AND t.status = 'masuk'
            LIMIT 1
        `, [idSearch || 0, rawSearch.toUpperCase()]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tiket/Plat tidak ditemukan atau sudah keluar!' });
        }

        const data = rows[0];
        const waktuMasuk = new Date(data.waktu_masuk);
        const waktuKeluar = new Date();
        const diffMs = waktuKeluar - waktuMasuk;
        const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60))); // Durasi jam (pembulatan ke atas)
        const totalBayar = diffHours * Number(data.tarif_per_jam);

        res.json({
            success: true,
            transaksi: data,
            estimasi: {
                waktu_keluar: waktuKeluar,
                durasi_jam: diffHours,
                total_bayar: totalBayar
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Check-Out & Bayar (Sesuai Swimlane Keluar)
app.post('/api/transaksi/bayar', async (req, res) => {
    try {
        const { id, durasi_jam, total_bayar, id_user } = req.body;
        const [rows] = await pool.query('SELECT * FROM tb_transaksi WHERE id_parkir = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
        }

        const item = rows[0];

        // 1. UPDATE tb_transaksi status='keluar'
        await pool.query(
            `UPDATE tb_transaksi 
             SET waktu_keluar = NOW(), durasi_jam = ?, biaya_total = ?, status = 'keluar', id_user = ?
             WHERE id_parkir = ?`,
            [durasi_jam, total_bayar, id_user || null, id]
        );

        // 2. UPDATE tb_area_parkir (terisi - 1)
        await pool.query('UPDATE tb_area_parkir SET terisi = GREATEST(0, terisi - 1) WHERE id_area = ?', [item.id_area]);

        // 3. INSERT tb_log_aktivitas
        await logActivity(id_user, `Kendaraan Keluar (ID: ${id}) - Total Bayar: Rp${total_bayar}`);

        // Ambil data struk selesai
        const [[struk]] = await pool.query(`
            SELECT t.id_parkir as id, CONCAT("TIK-", LPAD(t.id_parkir, 6, "0")) as kode_tiket,
                   k.plat_nomor, tf.jenis_kendaraan, tf.tarif_per_jam,
                   a.nama_area, t.waktu_masuk, t.waktu_keluar, t.durasi_jam, t.biaya_total as total_bayar,
                   u.nama_lengkap as petugas_keluar
            FROM tb_transaksi t
            JOIN tb_kendaraan k ON t.id_kendaraan = k.id_kendaraan
            JOIN tb_tarif tf ON t.id_tarif = tf.id_tarif
            JOIN tb_area_parkir a ON t.id_area = a.id_area
            LEFT JOIN tb_user u ON t.id_user = u.id_user
            WHERE t.id_parkir = ?
        `, [id]);

        res.json({
            success: true,
            message: 'Pembayaran berhasil dan struk siap dicetak!',
            struk
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==============================================================================
// 9. LAPORAN REKAPITULASI (tb_transaksi - KHUSUS OWNER & ADMIN)
// ==============================================================================

app.get('/api/laporan', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = `
            SELECT t.id_parkir as id, CONCAT("TIK-", LPAD(t.id_parkir, 6, "0")) as kode_tiket,
                   k.plat_nomor, tf.jenis_kendaraan, tf.tarif_per_jam,
                   a.nama_area, t.waktu_masuk, t.waktu_keluar, t.durasi_jam, t.biaya_total as total_bayar
            FROM tb_transaksi t
            JOIN tb_kendaraan k ON t.id_kendaraan = k.id_kendaraan
            JOIN tb_tarif tf ON t.id_tarif = tf.id_tarif
            JOIN tb_area_parkir a ON t.id_area = a.id_area
            WHERE t.status = 'keluar'
        `;
        const params = [];

        if (start_date && end_date) {
            query += ' AND DATE(t.waktu_keluar) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        query += ' ORDER BY t.waktu_keluar DESC';

        const [rows] = await pool.query(query, params);
        const totalPendapatan = rows.reduce((acc, curr) => acc + Number(curr.total_bayar || 0), 0);
        const totalKendaraan = rows.length;

        res.json({
            success: true,
            total_kendaraan: totalKendaraan,
            total_pendapatan: totalPendapatan,
            data: rows
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Ringkasan Statistik untuk Dashboard
app.get('/api/stats', async (req, res) => {
    try {
        const [[aktifCount]] = await pool.query("SELECT COUNT(*) as count FROM tb_transaksi WHERE status = 'masuk'");
        const [[hariIniCount]] = await pool.query("SELECT COUNT(*) as count, COALESCE(SUM(biaya_total), 0) as total FROM tb_transaksi WHERE status = 'keluar' AND DATE(waktu_keluar) = CURDATE()");
        const [[totalKapasitas]] = await pool.query("SELECT COALESCE(SUM(kapasitas), 0) as kapasitas, COALESCE(SUM(terisi), 0) as terisi FROM tb_area_parkir");

        res.json({
            success: true,
            parkir_aktif: aktifCount.count,
            transaksi_hari_ini: hariIniCount.count,
            pendapatan_hari_ini: Number(hariIniCount.total),
            kapasitas_total: totalKapasitas.kapasitas,
            kapasitas_terisi: totalKapasitas.terisi
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Fallback routing untuk Single Page Application (SPA)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server Backend UKK RPL SPK Paket 2 aktif di: http://localhost:${PORT}`);
});

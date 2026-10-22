const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, logActivity } = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. AUTHENTICATION (LOGIN & LOGOUT)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username dan password wajib diisi!' });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Username atau password salah!' });
        }

        const user = rows[0];
        await logActivity(user.username, `User ${user.username} (${user.role}) berhasil login.`);

        res.json({
            success: true,
            message: 'Login berhasil!',
            user: {
                id: user.id,
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
    const { username } = req.body;
    if (username) {
        await logActivity(username, `User ${username} logout dari sistem.`);
    }
    res.json({ success: true, message: 'Logout berhasil' });
});

// ==========================================
// 2. CRUD USERS (KHUSUS ADMIN)
// ==========================================
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, nama_lengkap, role, created_at FROM users ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, password, nama_lengkap, role, adminUser } = req.body;
        await pool.query(
            'INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)',
            [username, password, nama_lengkap, role]
        );
        await logActivity(adminUser, `Menambah user baru: ${username} (${role})`);
        res.json({ success: true, message: 'User berhasil ditambahkan!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, nama_lengkap, role, adminUser } = req.body;
        if (password) {
            await pool.query(
                'UPDATE users SET username = ?, password = ?, nama_lengkap = ?, role = ? WHERE id = ?',
                [username, password, nama_lengkap, role, id]
            );
        } else {
            await pool.query(
                'UPDATE users SET username = ?, nama_lengkap = ?, role = ? WHERE id = ?',
                [username, nama_lengkap, role, id]
            );
        }
        await logActivity(adminUser, `Mengubah data user ID: ${id} (${username})`);
        res.json({ success: true, message: 'User berhasil diperbarui!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminUser } = req.query;
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        await logActivity(adminUser, `Menghapus user ID: ${id}`);
        res.json({ success: true, message: 'User berhasil dihapus!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ==========================================
// 3. CRUD TARIF PARKIR (KHUSUS ADMIN)
// ==========================================
app.get('/api/tarif', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM tarif_parkir ORDER BY id ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/tarif', async (req, res) => {
    try {
        const { jenis_kendaraan, tarif_per_jam, tarif_maksimal, adminUser } = req.body;
        await pool.query(
            'INSERT INTO tarif_parkir (jenis_kendaraan, tarif_per_jam, tarif_maksimal) VALUES (?, ?, ?)',
            [jenis_kendaraan, tarif_per_jam, tarif_maksimal || 0]
        );
        await logActivity(adminUser, `Menambah tarif baru: ${jenis_kendaraan} - Rp${tarif_per_jam}/jam`);
        res.json({ success: true, message: 'Tarif parkir berhasil ditambahkan!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.put('/api/tarif/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { jenis_kendaraan, tarif_per_jam, tarif_maksimal, adminUser } = req.body;
        await pool.query(
            'UPDATE tarif_parkir SET jenis_kendaraan = ?, tarif_per_jam = ?, tarif_maksimal = ? WHERE id = ?',
            [jenis_kendaraan, tarif_per_jam, tarif_maksimal || 0, id]
        );
        await logActivity(adminUser, `Mengubah tarif parkir ID: ${id}`);
        res.json({ success: true, message: 'Tarif berhasil diperbarui!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.delete('/api/tarif/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminUser } = req.query;
        await pool.query('DELETE FROM tarif_parkir WHERE id = ?', [id]);
        await logActivity(adminUser, `Menghapus tarif parkir ID: ${id}`);
        res.json({ success: true, message: 'Tarif berhasil dihapus!' });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Tarif ini sedang digunakan oleh data transaksi!' });
    }
});

// ==========================================
// 4. CRUD AREA PARKIR (KHUSUS ADMIN)
// ==========================================
app.get('/api/area', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM area_parkir ORDER BY id ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/area', async (req, res) => {
    try {
        const { kode_area, nama_area, kapasitas, adminUser } = req.body;
        await pool.query(
            'INSERT INTO area_parkir (kode_area, nama_area, kapasitas, terisi) VALUES (?, ?, ?, 0)',
            [kode_area, nama_area, kapasitas]
        );
        await logActivity(adminUser, `Menambah area parkir: ${kode_area} (${nama_area})`);
        res.json({ success: true, message: 'Area parkir berhasil ditambahkan!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.put('/api/area/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { kode_area, nama_area, kapasitas, adminUser } = req.body;
        await pool.query(
            'UPDATE area_parkir SET kode_area = ?, nama_area = ?, kapasitas = ? WHERE id = ?',
            [kode_area, nama_area, kapasitas, id]
        );
        await logActivity(adminUser, `Mengubah area parkir ID: ${id}`);
        res.json({ success: true, message: 'Area parkir berhasil diperbarui!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.delete('/api/area/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminUser } = req.query;
        await pool.query('DELETE FROM area_parkir WHERE id = ?', [id]);
        await logActivity(adminUser, `Menghapus area parkir ID: ${id}`);
        res.json({ success: true, message: 'Area parkir berhasil dihapus!' });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Area ini sedang digunakan transaksi!' });
    }
});

// ==========================================
// 5. CRUD KENDARAAN / MASTER DATA (KHUSUS ADMIN)
// ==========================================
app.get('/api/kendaraan', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM kendaraan ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/kendaraan', async (req, res) => {
    try {
        const { plat_nomor, jenis_kendaraan, pemilik, adminUser } = req.body;
        await pool.query(
            'INSERT INTO kendaraan (plat_nomor, jenis_kendaraan, pemilik) VALUES (?, ?, ?)',
            [plat_nomor.toUpperCase(), jenis_kendaraan, pemilik || '-']
        );
        await logActivity(adminUser, `Menambah data kendaraan: ${plat_nomor.toUpperCase()}`);
        res.json({ success: true, message: 'Data kendaraan berhasil ditambahkan!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.put('/api/kendaraan/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { plat_nomor, jenis_kendaraan, pemilik, adminUser } = req.body;
        await pool.query(
            'UPDATE kendaraan SET plat_nomor = ?, jenis_kendaraan = ?, pemilik = ? WHERE id = ?',
            [plat_nomor.toUpperCase(), jenis_kendaraan, pemilik, id]
        );
        await logActivity(adminUser, `Mengubah data kendaraan ID: ${id}`);
        res.json({ success: true, message: 'Data kendaraan berhasil diperbarui!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.delete('/api/kendaraan/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { adminUser } = req.query;
        await pool.query('DELETE FROM kendaraan WHERE id = ?', [id]);
        await logActivity(adminUser, `Menghapus kendaraan ID: ${id}`);
        res.json({ success: true, message: 'Data kendaraan berhasil dihapus!' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ==========================================
// 6. LOG AKTIVITAS (KHUSUS ADMIN)
// ==========================================
app.get('/api/logs', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM log_aktivitas ORDER BY waktu DESC LIMIT 100');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 7. TRANSAKSI PARKIR (PETUGAS & ADMIN)
// ==========================================
// Mendapatkan daftar transaksi aktif (kendaraan masih di dalam)
app.get('/api/transaksi/aktif', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT t.*, tp.jenis_kendaraan, tp.tarif_per_jam, tp.tarif_maksimal, ap.nama_area, ap.kode_area
            FROM transaksi_parkir t
            JOIN tarif_parkir tp ON t.id_tarif = tp.id
            JOIN area_parkir ap ON t.id_area = ap.id
            WHERE t.status = 'masuk'
            ORDER BY t.id DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Masuk Parkir (Check-In)
app.post('/api/transaksi/masuk', async (req, res) => {
    try {
        const { plat_nomor, id_tarif, id_area, petugas } = req.body;
        if (!plat_nomor || !id_tarif || !id_area) {
            return res.status(400).json({ success: false, message: 'Lengkapi semua form!' });
        }

        // Cek apakah plat nomor ini masih terdata di dalam
        const [active] = await pool.query("SELECT id FROM transaksi_parkir WHERE plat_nomor = ? AND status = 'masuk'", [plat_nomor.toUpperCase()]);
        if (active.length > 0) {
            return res.status(400).json({ success: false, message: 'Kendaraan dengan plat ini masih berada di dalam area parkir!' });
        }

        // Generate Kode Tiket unik: TIK-YYYYMMDD-XXXX
        const now = new Date();
        const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const kode_tiket = `TIK-${ymd}-${randomNum}`;

        const [result] = await pool.query(
            `INSERT INTO transaksi_parkir (kode_tiket, plat_nomor, id_tarif, id_area, waktu_masuk, status, petugas_masuk)
             VALUES (?, ?, ?, ?, NOW(), 'masuk', ?)`,
            [kode_tiket, plat_nomor.toUpperCase(), id_tarif, id_area, petugas || 'Petugas']
        );

        // Update kuota area parkir
        await pool.query('UPDATE area_parkir SET terisi = terisi + 1 WHERE id = ?', [id_area]);
        await logActivity(petugas, `Kendaraan Masuk: ${plat_nomor.toUpperCase()} [Tiket: ${kode_tiket}]`);

        // Ambil data transaksi lengkap untuk struk
        const [ticketData] = await pool.query(`
            SELECT t.*, tp.jenis_kendaraan, tp.tarif_per_jam, ap.nama_area, ap.kode_area
            FROM transaksi_parkir t
            JOIN tarif_parkir tp ON t.id_tarif = tp.id
            JOIN area_parkir ap ON t.id_area = ap.id
            WHERE t.id = ?
        `, [result.insertId]);

        res.json({
            success: true,
            message: 'Kendaraan berhasil check-in!',
            tiket: ticketData[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Hitung Estimasi / Biaya Keluar Parkir (Check-Out)
app.post('/api/transaksi/hitung-keluar', async (req, res) => {
    try {
        const { search } = req.body; // bisa kode tiket atau plat nomor
        const [rows] = await pool.query(`
            SELECT t.*, tp.jenis_kendaraan, tp.tarif_per_jam, tp.tarif_maksimal, ap.nama_area, ap.kode_area
            FROM transaksi_parkir t
            JOIN tarif_parkir tp ON t.id_tarif = tp.id
            JOIN area_parkir ap ON t.id_area = ap.id
            WHERE (t.kode_tiket = ? OR t.plat_nomor = ?) AND t.status = 'masuk'
            LIMIT 1
        `, [search, search.toUpperCase()]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tiket/Kendaraan tidak ditemukan atau sudah keluar!' });
        }

        const data = rows[0];
        const waktuMasuk = new Date(data.waktu_masuk);
        const waktuKeluar = new Date();
        const diffMs = waktuKeluar - waktuMasuk;
        const diffHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60))); // Minimal dihitung 1 jam

        let totalBayar = diffHours * data.tarif_per_jam;
        if (data.tarif_maksimal > 0 && totalBayar > data.tarif_maksimal) {
            totalBayar = data.tarif_maksimal;
        }

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

// Bayar & Selesaikan Parkir (Check-Out Final)
app.post('/api/transaksi/bayar', async (req, res) => {
    try {
        const { id, durasi_jam, total_bayar, petugas } = req.body;
        const [rows] = await pool.query('SELECT * FROM transaksi_parkir WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
        }

        const item = rows[0];
        await pool.query(
            `UPDATE transaksi_parkir 
             SET waktu_keluar = NOW(), durasi_jam = ?, total_bayar = ?, status = 'selesai', petugas_keluar = ?
             WHERE id = ?`,
            [durasi_jam, total_bayar, petugas || 'Petugas', id]
        );

        // Update kuota area parkir
        await pool.query('UPDATE area_parkir SET terisi = GREATEST(0, terisi - 1) WHERE id = ?', [item.id_area]);
        await logActivity(petugas, `Kendaraan Keluar: ${item.plat_nomor} - Bayar Rp${total_bayar}`);

        // Ambil detail struk selesai
        const [finalData] = await pool.query(`
            SELECT t.*, tp.jenis_kendaraan, tp.tarif_per_jam, ap.nama_area
            FROM transaksi_parkir t
            JOIN tarif_parkir tp ON t.id_tarif = tp.id
            JOIN area_parkir ap ON t.id_area = ap.id
            WHERE t.id = ?
        `, [id]);

        res.json({
            success: true,
            message: 'Pembayaran berhasil & transaksi selesai!',
            struk: finalData[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 8. REKAP LAPORAN SESUAI WAKTU (KHUSUS OWNER & ADMIN)
// ==========================================
app.get('/api/laporan', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = `
            SELECT t.*, tp.jenis_kendaraan, tp.tarif_per_jam, ap.nama_area
            FROM transaksi_parkir t
            JOIN tarif_parkir tp ON t.id_tarif = tp.id
            JOIN area_parkir ap ON t.id_area = ap.id
            WHERE t.status = 'selesai'
        `;
        const params = [];

        if (start_date && end_date) {
            query += ' AND DATE(t.waktu_keluar) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        query += ' ORDER BY t.waktu_keluar DESC';

        const [rows] = await pool.query(query, params);
        const totalPendapatan = rows.reduce((acc, curr) => acc + (curr.total_bayar || 0), 0);
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

// Global stats untuk Dashboard
app.get('/api/stats', async (req, res) => {
    try {
        const [[aktifCount]] = await pool.query("SELECT COUNT(*) as count FROM transaksi_parkir WHERE status = 'masuk'");
        const [[hariIniCount]] = await pool.query("SELECT COUNT(*) as count, COALESCE(SUM(total_bayar), 0) as total FROM transaksi_parkir WHERE status = 'selesai' AND DATE(waktu_keluar) = CURDATE()");
        const [[totalKapasitas]] = await pool.query("SELECT COALESCE(SUM(kapasitas), 0) as kapasitas, COALESCE(SUM(terisi), 0) as terisi FROM area_parkir");

        res.json({
            success: true,
            parkir_aktif: aktifCount.count,
            transaksi_hari_ini: hariIniCount.count,
            pendapatan_hari_ini: hariIniCount.total,
            kapasitas_total: totalKapasitas.kapasitas,
            kapasitas_terisi: totalKapasitas.terisi
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Fallback untuk SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Aplikasi Parkir berjalan lancar di: http://localhost:${PORT}`);
});

-- ==========================================================
-- Seed Data / Dummy Awal: Parkir Bebas
-- ==========================================================

USE parkir_bebas;

-- 1. Insert Data Tipe Kendaraan & Tarif
INSERT INTO tipe_kendaraan (nama_tipe, tarif_dasar, tarif_per_jam, denda_tiket_hilang) VALUES
('Motor', 2000.00, 1000.00, 25000.00),
('Mobil', 5000.00, 3000.00, 50000.00),
('Truk / Bus', 10000.00, 5000.00, 100000.00)
ON DUPLICATE KEY UPDATE nama_tipe=VALUES(nama_tipe);

-- 2. Insert Data Area Parkir
INSERT INTO area_parkir (nama_area, kapasitas_total, slot_terisi) VALUES
('Lantai Basement (Motor)', 150, 0),
('Lantai 1 (Mobil)', 80, 0),
('Lantai 2 (Mobil)', 80, 0),
('Area Terbuka / Outdoor (Truk & Bus)', 20, 0)
ON DUPLICATE KEY UPDATE nama_area=VALUES(nama_area);

-- 3. Insert Admin Default (Password default plain: admin123, disarankan hash bcrypt di aplikasi)
INSERT INTO users (nama, username, password, role, is_active) VALUES
('Administrator', 'admin', '$2y$10$abcdefghijklmnopqrstuvwxyzDummyHashedPassword', 'admin', 1),
('Budi Santoso', 'petugas1', '$2y$10$abcdefghijklmnopqrstuvwxyzDummyHashedPassword', 'petugas', 1)
ON DUPLICATE KEY UPDATE username=VALUES(username);

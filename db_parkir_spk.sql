-- =======================================================
-- DATABASE APLIKASI PARKIR
-- Uji Kompetensi Keahlian (UKK) Rekayasa Perangkat Lunak
-- Paket 2: Pengembangan Aplikasi Parkir (3 Level User)
-- PASSWORD TELAH DI-HASH DENGAN BCRYPT (STANDAR KEAMANAN INDUSTRI)
-- =======================================================

CREATE DATABASE IF NOT EXISTS db_parkir;
USE db_parkir;

-- 1. Tabel Users (Hak Akses: admin, petugas, owner)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,               -- Berisi Hash Bcrypt
    nama_lengkap VARCHAR(100) NOT NULL,
    role ENUM('admin', 'petugas', 'owner') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Jenis Kendaraan & Tarif Parkir
CREATE TABLE IF NOT EXISTS tarif_parkir (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jenis_kendaraan VARCHAR(50) NOT NULL UNIQUE, -- Contoh: Motor, Mobil, Truk/Bus
    tarif_per_jam INT NOT NULL,                  -- Tarif dasar per jam
    tarif_maksimal INT DEFAULT 0,                -- Tarif maksimal jika seharian (opsional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Area Parkir
CREATE TABLE IF NOT EXISTS area_parkir (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_area VARCHAR(20) NOT NULL UNIQUE,       -- Contoh: A1, B1, VIP
    nama_area VARCHAR(100) NOT NULL,
    kapasitas INT NOT NULL,
    terisi INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Master Data Kendaraan
CREATE TABLE IF NOT EXISTS kendaraan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plat_nomor VARCHAR(20) NOT NULL UNIQUE,
    jenis_kendaraan VARCHAR(50) NOT NULL,
    pemilik VARCHAR(100) DEFAULT '-',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabel Transaksi Parkir
CREATE TABLE IF NOT EXISTS transaksi_parkir (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_tiket VARCHAR(30) NOT NULL UNIQUE,      -- Kode tiket unik misal TIK-20261008-001
    plat_nomor VARCHAR(20) NOT NULL,
    id_tarif INT NOT NULL,
    id_area INT NOT NULL,
    waktu_masuk DATETIME NOT NULL,
    waktu_keluar DATETIME NULL,
    durasi_jam INT DEFAULT 0,
    total_bayar INT DEFAULT 0,
    status ENUM('masuk', 'selesai') DEFAULT 'masuk',
    petugas_masuk VARCHAR(50) NOT NULL,
    petugas_keluar VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tarif) REFERENCES tarif_parkir(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_area) REFERENCES area_parkir(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabel Log Aktivitas (Sesuai Syarat UKK: Akses Log Aktifitas oleh Admin)
CREATE TABLE IF NOT EXISTS log_aktivitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    aktivitas VARCHAR(255) NOT NULL,
    waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =======================================================
-- DATA AWAL (SEED DATA UNTUK PENGUJIAN UKK)
-- =======================================================

-- Password asli: 123456 (Disimpan dalam bentuk hash Bcrypt $2b$10$...)
INSERT INTO users (username, password, nama_lengkap, role) VALUES
('admin', '$2b$10$QtikK.wNTZWdpzrrb9NfruYqoFx3kaW.E5zKnRTAwzLNtr4sb1PKG', 'Administrator Utama', 'admin'),
('petugas', '$2b$10$QtikK.wNTZWdpzrrb9NfruYqoFx3kaW.E5zKnRTAwzLNtr4sb1PKG', 'Petugas Gerbang 1', 'petugas'),
('owner', '$2b$10$QtikK.wNTZWdpzrrb9NfruYqoFx3kaW.E5zKnRTAwzLNtr4sb1PKG', 'Bapak Owner / Manajemen', 'owner')
ON DUPLICATE KEY UPDATE password=VALUES(password);

-- Data Awal Tarif
INSERT INTO tarif_parkir (jenis_kendaraan, tarif_per_jam, tarif_maksimal) VALUES
('Motor', 2000, 20000),
('Mobil', 5000, 50000),
('Truk / Bus', 10000, 100000)
ON DUPLICATE KEY UPDATE jenis_kendaraan=jenis_kendaraan;

-- Data Awal Area Parkir
INSERT INTO area_parkir (kode_area, nama_area, kapasitas, terisi) VALUES
('A1', 'Area Parkir Motor Timur', 100, 0),
('B1', 'Area Parkir Mobil Utama', 50, 0),
('C1', 'Area Parkir Kendaraan Besar', 20, 0)
ON DUPLICATE KEY UPDATE kode_area=kode_area;

-- Data Awal Kendaraan Member / Terdaftar
INSERT INTO kendaraan (plat_nomor, jenis_kendaraan, pemilik) VALUES
('B 1234 ABC', 'Motor', 'Ahmad Dani'),
('D 5678 XYZ', 'Mobil', 'Siti Rahma')
ON DUPLICATE KEY UPDATE plat_nomor=plat_nomor;

-- Log Awal
INSERT INTO log_aktivitas (username, aktivitas) VALUES
('admin', 'Inisialisasi sistem database aplikasi parkir UKK RPL (Security Hash Enabled).');

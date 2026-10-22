-- ==========================================================
-- Database Schema: Parkir Bebas (Sistem Manajemen Parkir)
-- DBMS: MySQL / MariaDB (Kompatibel juga dengan PostgreSQL)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS parkir_bebas;
USE parkir_bebas;

-- 1. Tabel Users (Admin & Operator Parkir)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'petugas', 'owner') NOT NULL DEFAULT 'petugas',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Tipe Kendaraan & Aturan Tarif
CREATE TABLE IF NOT EXISTS tipe_kendaraan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_tipe VARCHAR(50) NOT NULL UNIQUE,       -- Motor, Mobil, Truk, Bus
    tarif_dasar DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Tarif 1 jam pertama
    tarif_per_jam DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Tarif jam berikutnya
    denda_tiket_hilang DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Area Parkir & Kapasitas
CREATE TABLE IF NOT EXISTS area_parkir (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_area VARCHAR(50) NOT NULL UNIQUE,        -- Misal: Gedung A Lt. 1, Outdoor Utara
    kapasitas_total INT NOT NULL DEFAULT 0,
    slot_terisi INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Transaksi Parkir
CREATE TABLE IF NOT EXISTS transaksi_parkir (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    kode_tiket VARCHAR(50) NOT NULL UNIQUE,       -- Barcode / QR Tiket
    plat_nomor VARCHAR(20) NOT NULL,
    tipe_kendaraan_id INT NOT NULL,
    area_parkir_id INT NULL,
    waktu_masuk DATETIME NOT NULL,
    waktu_keluar DATETIME NULL,
    durasi_jam INT NOT NULL DEFAULT 0,
    total_biaya DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status ENUM('parkir', 'selesai', 'tiket_hilang') NOT NULL DEFAULT 'parkir',
    petugas_id INT NULL,
    metode_pembayaran ENUM('cash', 'qris', 'kartu') NULL,
    catatan TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT fk_transaksi_tipe FOREIGN KEY (tipe_kendaraan_id) 
        REFERENCES tipe_kendaraan(id) ON UPDATE CASCADE,
    CONSTRAINT fk_transaksi_area FOREIGN KEY (area_parkir_id) 
        REFERENCES area_parkir(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_transaksi_petugas FOREIGN KEY (petugas_id) 
        REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,

    -- Indexes untuk optimasi pencarian plat & tiket
    INDEX idx_plat_nomor (plat_nomor),
    INDEX idx_kode_tiket (kode_tiket),
    INDEX idx_status (status),
    INDEX idx_waktu_masuk (waktu_masuk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

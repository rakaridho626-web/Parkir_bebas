# Database Schema - Parkir Bebas (Sistem Manajemen Parkir)

Skema database relasional untuk sistem manajemen parkir, kompatibel dengan **MySQL / MariaDB / PostgreSQL**.

---

## 1. Struktur Tabel

### A. `users` (Petugas / Admin)
Menyimpan data akun petugas kasir, operator pos parkir, atau administrator sistem.
- `id` (INT, Primary Key, Auto Increment)
- `nama` (VARCHAR(100))
- `username` (VARCHAR(50), Unique)
- `password` (VARCHAR(255))
- `role` (ENUM: `'admin'`, `'petugas'`)
- `created_at` (TIMESTAMP)

### B. `tipe_kendaraan` (Kategori & Tarif)
Menyimpan master jenis kendaraan beserta aturan tarif per jam.
- `id` (INT, Primary Key, Auto Increment)
- `nama_tipe` (VARCHAR(50)) — contoh: Motor, Mobil, Truk/Bus
- `tarif_dasar` (DECIMAL(10,2)) — tarif jam pertama / biaya masuk
- `tarif_per_jam` (DECIMAL(10,2)) — tarif untuk jam-jam berikutnya
- `denda_tiket_hilang` (DECIMAL(10,2))

### C. `area_parkir` (Slot / Lokasi)
Menyimpan informasi kapasitas area dan ketersediaan slot parkir.
- `id` (INT, Primary Key, Auto Increment)
- `nama_area` (VARCHAR(50)) — contoh: Area A (Lantai 1), Area B (Outdoor)
- `kapasitas_total` (INT)
- `slot_terisi` (INT, Default 0)

### D. `transaksi_parkir` (Aktivitas Keluar Masuk)
Mencatat seluruh transaksi tiket masuk hingga selesai bayar di pos keluar.
- `id` (BIGINT, Primary Key, Auto Increment)
- `kode_tiket` (VARCHAR(50), Unique) — barcode / QR code tiket
- `plat_nomor` (VARCHAR(20))
- `tipe_kendaraan_id` (INT, Foreign Key -> `tipe_kendaraan.id`)
- `area_parkir_id` (INT, Foreign Key -> `area_parkir.id`, Nullable)
- `waktu_masuk` (DATETIME)
- `waktu_keluar` (DATETIME, Nullable)
- `durasi_jam` (INT, Default 0)
- `total_biaya` (DECIMAL(10,2), Default 0)
- `status` (ENUM: `'parkir'`, `'selesai'`, `'tiket_hilang'`)
- `petugas_id` (INT, Foreign Key -> `users.id`, Nullable)
- `metode_pembayaran` (ENUM: `'cash'`, `'qris'`, `'kartu'`)
- `created_at` (TIMESTAMP)

---

## 2. File Script yang Disediakan
- `schema.sql`: Script DDL lengkap untuk pembuatan tabel, indeks, relasi Foreign Key, serta *dummy data* awal.
- `seed.sql`: Data awal untuk jenis kendaraan (Motor, Mobil, Truk) dan akun admin default.

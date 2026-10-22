# DOKUMENTASI & DIAGRAM SWIMLANE APLIKASI PARKIR
## Berdasarkan Dokumen Uji Kompetensi Keahlian (UKK) / SPK Paket 2

---

## 1. Swimlane Diagram: Alur Kendaraan Masuk (Check-In)

Diagram ini membagi tanggung jawab antara **Pengendara / Pelanggan**, **Petugas Kasir Masuk**, dan **Sistem (Backend & Database)** saat mencetak tiket parkir baru.

```mermaid
sequenceDiagram
    autonumber
    actor Pengendara as Pengendara
    actor Petugas as Petugas Gerbang Masuk
    participant UI as Antarmuka / Frontend
    participant Server as Backend (server.js)
    participant DB as Database (db_parkir)

    Pengendara->>Petugas: Menyerahkan informasi kendaraan
    Petugas->>UI: Input Plat Nomor, Pilih Jenis Kendaraan & Area Parkir
    UI->>Server: POST /api/transaksi/masuk
    
    Server->>DB: Cek status kendaraan (apakah masih ada di dalam?)
    alt Kendaraan masih terdaftar di dalam
        DB-->>Server: Data ditemukan status 'masuk'
        Server-->>UI: Respon Error: Plat nomor masih berada di area parkir
        UI-->>Petugas: Tampilkan Notifikasi Gagal
    else Kuota Area Penuh
        Server->>DB: Cek kapasitas & slot terisi di area_parkir
        DB-->>Server: Slot terisi >= Kapasitas
        Server-->>UI: Respon Error: Area parkir penuh
        UI-->>Petugas: Tampilkan Notifikasi Area Penuh
    else Kendaraan Boleh Masuk
        Server->>Server: Generate Kode Tiket Unik (TIK-YYYYMMDD-XXXX)
        Server->>DB: INSERT ke transaksi_parkir (status='masuk', waktu_masuk=NOW())
        Server->>DB: UPDATE area_parkir SET terisi = terisi + 1
        Server->>DB: INSERT ke log_aktivitas (Audit trail)
        DB-->>Server: Transaksi berhasil disimpan
        Server-->>UI: Respon Sukses + Detail Tiket Karcis
        UI->>UI: Cetak Karcis / Struk Masuk
        Petugas->>Pengendara: Menyerahkan Karcis Parkir & Membuka Barrier Gate
    end
```

---

## 2. Swimlane Diagram: Alur Kendaraan Keluar & Pembayaran (Check-Out)

Diagram proses validasi karcis, kalkulasi tarif berbasis durasi otomatis, dan cetak struk pembayaran akhir.

```mermaid
sequenceDiagram
    autonumber
    actor Pengendara as Pengendara
    actor Petugas as Petugas Gerbang Keluar
    participant UI as Antarmuka / Frontend
    participant Server as Backend (server.js)
    participant DB as Database (db_parkir)

    Pengendara->>Petugas: Menyerahkan Karcis Tiket Masuk / Sebutkan Plat Nomor
    Petugas->>UI: Input Kode Tiket atau Plat Nomor
    UI->>Server: POST /api/transaksi/hitung-keluar
    
    Server->>DB: SELECT transaksi_parkir WHERE status = 'masuk'
    alt Tiket Tidak Ditemukan / Sudah Keluar
        DB-->>Server: Data kosong
        Server-->>UI: Respon 404 (Tiket tidak ditemukan)
        UI-->>Petugas: Tampilkan Pesan Error
    else Tiket Valid
        DB-->>Server: Return data tiket & tarif_parkir
        Server->>Server: Hitung durasi jam: ceil((NOW - waktu_masuk) / 1 jam)
        Server->>Server: total_bayar = durasi_jam * tarif_per_jam (maks = tarif_maksimal)
        Server-->>UI: Respon Detail Tagihan & Durasi Parkir
        UI-->>Petugas: Tampilkan Total Tagihan di Layar
        Petugas->>Pengendara: Menyebutkan Total Biaya Parkir
        Pengendara->>Petugas: Menyerahkan Uang Pembayaran (Cash/QRIS)
        
        Petugas->>UI: Konfirmasi Pembayaran Selesai
        UI->>Server: POST /api/transaksi/bayar
        Server->>DB: UPDATE transaksi_parkir (status='selesai', waktu_keluar=NOW(), total_bayar)
        Server->>DB: UPDATE area_parkir SET terisi = terisi - 1
        Server->>DB: INSERT ke log_aktivitas
        DB-->>Server: Update Berhasil
        Server-->>UI: Respon Sukses + Struk Pembayaran
        UI->>UI: Cetak Struk Bukti Pembayaran
        Petugas->>Pengendara: Menyerahkan Struk & Membuka Palang Keluar
    end
```

---

## 3. Swimlane Diagram: Alur Manajemen Master & Laporan (Admin & Owner)

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna (Admin / Owner)
    participant UI as Frontend Dashboard
    participant Server as Backend API
    participant DB as Database (db_parkir)

    User->>UI: Login dengan Username & Password
    UI->>Server: POST /api/auth/login
    Server->>DB: Verifikasi Akun users
    DB-->>Server: Data User Valid + Role
    Server->>DB: Catat ke log_aktivitas
    Server-->>UI: Login Berhasil (Token / Role Identitas)

    alt Role == ADMIN
        User->>UI: Mengelola Master (Users, Tarif, Area Parkir, Data Kendaraan)
        UI->>Server: Request CRUD Master Data
        Server->>DB: Execute Query (INSERT / UPDATE / DELETE)
        Server->>DB: Catat ke log_aktivitas
        DB-->>Server: Data Terupdate
        Server-->>UI: Notifikasi Sukses
    else Role == OWNER
        User->>UI: Buka Menu Laporan Pendapatan & Pilih Rentang Tanggal
        UI->>Server: GET /api/laporan?start_date=...&end_date=...
        Server->>DB: SELECT transaksi_parkir WHERE status='selesai' & rentang tanggal
        DB-->>Server: Return Data Transaksi & Total Pendapatan
        Server-->>UI: Rekapitulasi Data Transaksi
        UI->>UI: Render Tabel Laporan & Cetak PDF / Print Laporan
    end
```

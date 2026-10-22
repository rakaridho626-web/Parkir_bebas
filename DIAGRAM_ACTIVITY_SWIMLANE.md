# DOKUMENTASI DIAGRAM: ACTIVITY & SWIMLANE
## Aplikasi Parkir (UKK RPL 2025/2026 - Paket 2)
### Standar Database SPK: `tb_user`, `tb_kendaraan`, `tb_tarif`, `tb_area_parkir`, `tb_transaksi`, `tb_log_aktivitas`

---

## 1. ACTIVITY DIAGRAM

Activity Diagram menggambarkan aliran kerja proses bisnis sistem secara terstruktur mulai dari titik mulai (*start*), percabangan (*decision*), hingga titik selesai (*end*).

### A. Activity Diagram: Proses Login Pengguna (3 Level)
```mermaid
flowchart TD
    Start([Mulai]) --> B[Pengguna Masukkan Username & Password]
    B --> C[Klik Tombol Masuk Sistem]
    C --> D[(Cek Akun pada tb_user & status_aktif=1)]
    D --> E{Apakah Akun Valid?}
    
    E -- Tidak Valid / Nonaktif --> F[Tampilkan Pesan 'Username atau Password Salah']
    F --> B
    
    E -- Valid --> G[(Catat ke tb_log_aktivitas: Login Berhasil)]
    G --> H[Simpan Sesi User di LocalStorage / Session]
    H --> I{Identifikasi Role Pengguna}
    
    I -- Role = 'admin' --> J[Buka Dashboard Penuh + Akses CRUD & Log]
    I -- Role = 'petugas' --> K[Buka Dashboard Kasir Pos Parkir]
    I -- Role = 'owner' --> L[Buka Dashboard Ringkasan & Rekapitulasi Laporan]
    
    J --> End([Selesai])
    K --> End
    L --> End
```

### B. Activity Diagram: Transaksi Kendaraan Masuk (Check-In)
```mermaid
flowchart TD
    Start([Pengendara Datang]) --> B[Petugas Input Plat Nomor, Pilih Jenis Kendaraan & Area]
    B --> C[Klik Tombol Cetak Tiket Masuk]
    C --> D[(Cek tb_transaksi: Apakah Plat Masih Berstatus 'masuk'?)]
    
    D --> E{Plat Sudah di Dalam?}
    E -- Ya --> F[Tolak: Kendaraan Masih Berada di Dalam Area]
    F --> EndFail([Selesai])
    
    E -- Tidak --> G[(Cek tb_area_parkir: terisi < kapasitas?)]
    G --> H{Kapasitas Cukup?}
    H -- Penuh --> I[Tolak: Slot Area Parkir Sudah Penuh]
    I --> EndFail
    
    H -- Tersedia --> J[Generate Kode Tiket Otomatis: TIK-YYYYMMDD-XXXX]
    J --> K[(INSERT ke tb_transaksi: status='masuk', waktu_masuk=NOW())]
    K --> L[(UPDATE tb_area_parkir: terisi = terisi + 1)]
    L --> M[(INSERT ke tb_log_aktivitas: Kendaraan Masuk)]
    M --> N[Cetak Karcis / Struk Parkir Fisik]
    N --> O[Buka Palang Pintu Masuk / Barrier Gate]
    O --> EndSuccess([Kendaraan Masuk])
```

### C. Activity Diagram: Transaksi Kendaraan Keluar & Pembayaran (Check-Out)
```mermaid
flowchart TD
    Start([Pengendara Menuju Pos Keluar]) --> B[Petugas Input/Scan Kode Tiket atau Plat Nomor]
    B --> C[(SELECT dari tb_transaksi WHERE status='masuk')]
    C --> D{Data Tiket Ditemukan?}
    
    D -- Tidak Ditemukan --> E[Tampilkan Peringatan: Tiket Tidak Valid / Sudah Keluar]
    E --> EndFail([Selesai])
    
    D -- Ditemukan --> F[Hitung Durasi: ceil((waktu_keluar - waktu_masuk) / 1 Jam)]
    F --> G[Hitung Total Biaya: durasi_jam * tarif_per_jam]
    G --> H{Apakah Melebihi Tarif Maksimal?}
    H -- Ya --> I[biaya_total = tarif_maksimal]
    H -- Tidak --> J[biaya_total = total kalkulasi]
    
    I --> K[Tampilkan Rincian Durasi & Total Tagihan di Layar Kasir]
    J --> K
    K --> L[Pengendara Membayar Tunai / QRIS]
    L --> M[Petugas Konfirmasi Tombol Bayar & Selesai]
    M --> N[(UPDATE tb_transaksi: status='keluar', waktu_keluar=NOW(), biaya_total)]
    N --> O[(UPDATE tb_area_parkir: terisi = terisi - 1)]
    O --> P[(INSERT ke tb_log_aktivitas: Kendaraan Keluar)]
    P --> Q[Cetak Struk Bukti Pembayaran Parkir]
    Q --> R[Buka Palang Pintu Keluar]
    R --> EndSuccess([Kendaraan Keluar Selesai])
```

---

## 2. SWIMLANE DIAGRAM

Swimlane Diagram membagi alur kerja ke dalam **kolom / jalur peran (lane)**: Pengendara, Petugas Kasir, Sistem Backend, dan Database (`parkir`).

### A. Swimlane: Alur Masuk Kendaraan (Check-In)
```mermaid
sequenceDiagram
    autonumber
    actor Pengendara as Pengendara
    actor Petugas as Petugas Kasir Masuk
    participant Sistem as Sistem / Frontend Dashboard
    participant Backend as Backend (server.js)
    participant Database as Database (parkir)

    Pengendara->>Petugas: Membawa Kendaraan ke Gerbang Masuk
    Petugas->>Sistem: Input Plat Nomor, Pilih Jenis Tarif & Area
    Sistem->>Backend: POST /api/transaksi/masuk
    Backend->>Database: SELECT tb_transaksi (Cek duplikasi plat)
    Database-->>Backend: Hasil pengecekan
    
    alt Jika Plat Sudah Ada di Dalam
        Backend-->>Sistem: Error: Kendaraan masih ada di dalam
        Sistem-->>Petugas: Tampilkan Notifikasi Peringatan
    else Jika Kapasitas Area Penuh
        Backend->>Database: SELECT tb_area_parkir (terisi >= kapasitas)
        Database-->>Backend: Status area penuh
        Backend-->>Sistem: Error: Slot parkir penuh
        Sistem-->>Petugas: Tampilkan Notifikasi Area Penuh
    else Kendaraan Boleh Masuk
        Backend->>Backend: Generate Kode Tiket (TIK-YYYYMMDD-XXXX)
        Backend->>Database: INSERT tb_transaksi (status='masuk', waktu_masuk=NOW())
        Backend->>Database: UPDATE tb_area_parkir (terisi = terisi + 1)
        Backend->>Database: INSERT tb_log_aktivitas (Catat aktivitas)
        Database-->>Backend: Simpan Berhasil
        Backend-->>Sistem: Respon Sukses + Detail Tiket
        Sistem->>Sistem: Cetak Karcis / Struk Masuk
        Petugas->>Pengendara: Serahkan Tiket Parkir & Buka Palang
    end
```

### B. Swimlane: Alur Keluar Kendaraan & Pembayaran (Check-Out)
```mermaid
sequenceDiagram
    autonumber
    actor Pengendara as Pengendara
    actor Petugas as Petugas Kasir Keluar
    participant Sistem as Sistem / Frontend Dashboard
    participant Backend as Backend (server.js)
    participant Database as Database (parkir)

    Pengendara->>Petugas: Menyerahkan Tiket Parkir / Plat Nomor
    Petugas->>Sistem: Masukkan Kode Tiket / Plat pada Form Kasir
    Sistem->>Backend: POST /api/transaksi/hitung-keluar
    Backend->>Database: SELECT tb_transaksi JOIN tb_tarif WHERE status='masuk'
    Database-->>Backend: Data waktu_masuk, jenis, dan tarif
    Backend->>Backend: Kalkulasi: durasi_jam & biaya_total (maksimal)
    Backend-->>Sistem: Return rincian durasi & total_bayar
    Sistem-->>Petugas: Tampilkan Rincian Tagihan di Layar Kasir
    
    Petugas->>Pengendara: Informasikan Total Biaya Parkir
    Pengendara->>Petugas: Menyerahkan Pembayaran
    Petugas->>Sistem: Klik 'Bayar & Selesai'
    Sistem->>Backend: POST /api/transaksi/bayar
    Backend->>Database: UPDATE tb_transaksi (status='keluar', waktu_keluar=NOW())
    Backend->>Database: UPDATE tb_area_parkir (terisi = terisi - 1)
    Backend->>Database: INSERT tb_log_aktivitas
    Database-->>Backend: Update Selesai
    Backend-->>Sistem: Respon Transaksi Berhasil
    Sistem->>Sistem: Cetak Struk Bukti Pembayaran
    Petugas->>Pengendara: Berikan Struk Pembayaran & Buka Palang Keluar
```

### C. Swimlane: Alur Hak Akses Admin & Owner
```mermaid
sequenceDiagram
    autonumber
    actor AdminOwner as Admin / Owner
    participant Sistem as Dashboard Web
    participant Backend as Backend (server.js)
    participant Database as Database (parkir)

    AdminOwner->>Sistem: Input Username & Password
    Sistem->>Backend: POST /api/auth/login
    Backend->>Database: SELECT tb_user WHERE status_aktif = 1
    Database-->>Backend: Data Kredensial & Role
    Backend->>Database: INSERT tb_log_aktivitas (Login)
    Backend-->>Sistem: Login Sukses + Informasi Hak Akses

    alt Role == 'admin'
        AdminOwner->>Sistem: Kelola CRUD User, CRUD Tarif, CRUD Area, Master Kendaraan, & Audit Log
        Sistem->>Backend: Request Eksekusi Master Data
        Backend->>Database: Query INSERT / UPDATE / DELETE
        Backend->>Database: INSERT tb_log_aktivitas
        Database-->>Backend: Data Terupdate
        Backend-->>Sistem: Notifikasi Sukses
    else Role == 'owner'
        AdminOwner->>Sistem: Buka Menu Rekap Transaksi & Filter Tanggal
        Sistem->>Backend: GET /api/laporan?start_date=...&end_date=...
        Backend->>Database: SELECT tb_transaksi WHERE status='keluar' BETWEEN tanggal
        Database-->>Backend: Rekapitulasi Data & Total Pendapatan
        Backend-->>Sistem: Render Tabel Laporan & Siap Cetak
    end
```

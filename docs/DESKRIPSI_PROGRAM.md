# Deskripsi Program

Parkir Bebas adalah aplikasi web untuk mencatat kendaraan masuk dan keluar, menghitung biaya parkir, mencetak karcis dan struk, serta merekap pendapatan. Aplikasi punya 3 level pengguna: admin, petugas, dan owner.

## Teknologi

| Bagian | Teknologi | Folder |
|---|---|---|
| Frontend | Svelte 5, TypeScript, Vite, WebGL, CSS 3D | `frontend/` |
| Backend | Node.js, Express 5, mysql2, bcryptjs | `backend/` |
| Database | MySQL / MariaDB | `database_spk_asli.sql` |

## Hak akses

| Fitur | Admin | Petugas | Owner |
|---|:-:|:-:|:-:|
| Login dan logout | V | V | V |
| Dashboard kondisi parkir | V | V | V |
| CRUD user, tarif, area, kendaraan | V | | |
| Log aktivitas | V | | |
| Transaksi masuk dan keluar, cetak karcis dan struk | | V | |
| Rekap transaksi per rentang tanggal, cetak, export CSV | | | V |

Pembatasan halaman saat ini ada di frontend (`AKSES` di `frontend/src/App.svelte`). Backend belum memeriksa login dan role, lihat [LAPORAN_EVALUASI.md](LAPORAN_EVALUASI.md).

## Boundary dan pembagian tugas

Frontend dan backend hanya berhubungan lewat API `/api/*` berformat JSON. Frontend tidak menyentuh database.

```mermaid
flowchart LR
    Pengguna([Admin / Petugas / Owner])
    subgraph FE["Boundary Frontend (Nizar)"]
        UI[Halaman Svelte]
        Lib[lib/api.ts]
    end
    subgraph BE["Boundary Backend (Raka)"]
        API[Express /api/*]
        Biaya[hitungBiaya]
    end
    subgraph DB["Boundary Database"]
        Tabel[(database parkir)]
    end
    Pengguna --> UI --> Lib
    Lib -- "HTTP JSON" --> API
    API --> Biaya
    API -- "SQL" --> Tabel
```

| Boundary | Tanggung jawab |
|---|---|
| Frontend | Tampilan, validasi isian, format angka dan tanggal, cetak, export CSV |
| Backend | Aturan bisnis, hitung biaya, simpan data, hash password, catat log |
| Database | Menyimpan data dan menjaga relasi antartabel |

## Flowchart (a) Login

```mermaid
flowchart TD
    A([Mulai]) --> B[Kursor ke ujung layar atau tekan panah]
    B --> C[Form login role tersebut muncul]
    C --> D[Isi username dan password]
    D --> E[POST /api/auth/login]
    E --> F{Akun aktif dan password cocok?}
    F -- Tidak --> G[Tampilkan pesan salah] --> D
    F -- Ya --> H{Role sesuai pintu?}
    H -- Tidak --> I[Tampilkan pintu yang benar] --> B
    H -- Ya --> J[Simpan user di localStorage]
    J --> K[Buka panel sesuai role]
    K --> L([Selesai])
```

## Flowchart (b) Transaksi

```mermaid
flowchart TD
    A([Mulai]) --> B{Kendaraan masuk atau keluar?}
    B -- Masuk --> C[Isi plat, jenis, area]
    C --> D{Plat masih di dalam?}
    D -- Ya --> E[Tampilkan peringatan] --> C
    D -- Tidak --> F{Slot area tersedia?}
    F -- Tidak --> G[Tampilkan area penuh] --> C
    F -- Ya --> H[Simpan transaksi, terisi + 1, catat log]
    H --> I[Tampilkan karcis]
    B -- Keluar --> J[Masukkan kode tiket atau plat]
    J --> K{Transaksi aktif ditemukan?}
    K -- Tidak --> L[Tampilkan tidak ditemukan] --> J
    K -- Ya --> M[Hitung durasi dan biaya di server]
    M --> N[Tampilkan total bayar]
    N --> O[Petugas menerima uang dan menekan bayar]
    O --> P[status keluar, terisi - 1, catat log]
    P --> Q[Tampilkan struk]
    I --> R([Selesai])
    Q --> R
```

Rumus biaya:

```
durasi_jam  = bulatkan_ke_atas(selisih waktu / 1 jam), minimal 1
biaya_total = durasi_jam × tarif_per_jam
```

Contoh: parkir 1 jam 10 menit dengan tarif Rp 5.000 dihitung 2 jam, jadi Rp 10.000.

## Flowchart (c) Cetak struk

```mermaid
flowchart TD
    A([Mulai]) --> B[Backend mengirim data karcis atau struk]
    B --> C[Layar pratinjau menampilkan kertas thermal 72 mm]
    C --> D{Petugas menekan Cetak sekarang?}
    D -- Tutup --> H([Selesai])
    D -- Ya --> E[Komponen Struk dipasang ke #print-area]
    E --> F[window.print membuka dialog cetak]
    F --> G[afterprint melepas komponen dan mengembalikan tampilan]
    G --> H
```

## Cara menjalankan

Butuh dua terminal, karena frontend dan backend jalan terpisah.

Terminal 1, backend:

```
mysql -u root < database_spk_asli.sql
cd backend
npm install
node server.js
```

Terminal 2, frontend:

```
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173. Semua akun awal memakai password `123456`, dengan username `admin`, `petugas`, dan `owner`.

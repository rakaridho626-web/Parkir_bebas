# Tugas Backend

Catatan dari frontend (Nizar) untuk backend (Raka). Kalau kamu AI yang membantu Raka, baca seluruh file ini sebelum mengubah `backend/server.js`.

## Yang berubah di repo

- `frontend/` sekarang memakai Svelte 5 + TypeScript + Vite. Cara menjalankannya ada di `frontend/README.md`.
- `docs/` berisi dokumen SPK: soal, swimlane, ERD, deskripsi program, dokumentasi fungsi, debugging, dan laporan evaluasi.
- `backend/`, `public/`, `database_spk_asli.sql`, dan `README.md` tidak diubah.

Frontend jalan di `http://localhost:5173` dan memanggil API di `http://localhost:3000/api`. Struktur balasan API yang sudah ada jangan diubah, karena frontend bergantung padanya. Bentuk datanya ada di `frontend/src/lib/tipe.ts`.

## Daftar tugas

### 1. Lindungi API dengan login dan role (paling penting)

Sekarang semua route `/api/*` bisa dipanggil tanpa login, contohnya `GET /api/users` langsung mengembalikan daftar user. Pembatasan halaman hanya ada di frontend, dan itu bisa dilewati.

Yang diminta:

- `POST /api/auth/login` tetap mengembalikan `user` seperti sekarang, lalu tambahkan `token`.
- Semua route selain login memeriksa header `Authorization: Bearer <token>`.
- Token tidak ada atau tidak valid dibalas status `401`. Role tidak berhak dibalas status `403`. Keduanya memakai format `{ "success": false, "message": "..." }`.
- `id_user` dan `currentUserId` diambil dari token, bukan dari body atau query.

Hak akses sesuai SPK:

| Route | Role |
|---|---|
| `/api/users`, `/api/logs` | admin |
| `POST`, `PUT`, `DELETE` pada `/api/tarif`, `/api/area`, `/api/kendaraan` | admin |
| `GET /api/tarif`, `/api/area`, `/api/stats` | semua role yang login |
| `GET /api/kendaraan`, `/api/transaksi/aktif`, `POST /api/transaksi/*` | petugas (admin boleh baca) |
| `/api/laporan` | owner |

Setelah selesai, kabari Nizar. Frontend perlu diubah untuk menyimpan dan mengirim token, jadi jangan aktifkan pemeriksaan ini di `main` sebelum frontend siap, atau kerjakan bersamaan.

### 2. `status_aktif` bisa diubah

`PUT /api/users/:id` belum menerima `status_aktif`, jadi akun tidak bisa dinonaktifkan dari aplikasi. Tambahkan ke route itu, lalu kabari Nizar supaya form user ikut diubah.

### 3. Petugas masuk tidak tersimpan

Di `POST /api/transaksi/bayar`, `id_user` di `tb_transaksi` ditimpa petugas keluar. Akibatnya petugas yang mencatat kendaraan masuk hilang. Kolom di SPK hanya satu, jadi putuskan dulu: dibiarkan dan dicatat sebagai keterbatasan, atau menambah kolom baru.

### 4. Perbarui `README.md`

`README.md` utama masih menyebut frontend ada di `public/`. Tambahkan folder `frontend/` dan `docs/`, serta cara menjalankan frontend.

### 5. Putuskan nasib `public/`

Ada dua frontend di repo: `public/` dan `frontend/`. `localhost:3000` masih menampilkan `public/`.

- Kalau `public/` tidak dipakai lagi, hapus folder itu dan baris `express.static` di `backend/server.js`.
- Kalau `public/` tetap dipakai, tulis alasannya di `README.md`.

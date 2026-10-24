# Parkir Bebas - Aplikasi Parkir

Aplikasi manajemen parkir dengan 3 level pengguna (admin, petugas, owner).
UKK RPL 2025/2026 - Paket 2 (SPK Praktik Kejuruan).

## Teknologi
- Backend: Node.js, Express 5, mysql2, bcryptjs
- Frontend: HTML + JavaScript (folder `public/`), disajikan langsung oleh Express
- Database: MySQL / MariaDB

## Struktur
```
backend/                    server.js (API + static file server), package.json
public/                     index.html, app.js
database_spk_asli.sql       skema database `parkir` + data awal
```

## Cara menjalankan
1. Import database:
   ```
   mysql -u root < database_spk_asli.sql
   ```
2. Sesuaikan koneksi DB di `backend/server.js` jika perlu (default: `localhost`, user `root`, password kosong, database `parkir`).
3. Install dan jalankan:
   ```
   cd backend
   npm install
   node server.js
   ```
4. Buka http://localhost:3000

## Akun default
| Role    | Username  | Password |
|---------|-----------|----------|
| Admin   | `admin`   | `123456` |
| Petugas | `petugas` | `123456` |
| Owner   | `owner`   | `123456` |

## Tabel
`tb_user`, `tb_tarif`, `tb_area_parkir`, `tb_kendaraan`, `tb_transaksi`, `tb_log_aktivitas`

## Endpoint utama
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`
- CRUD: `/api/users`, `/api/tarif`, `/api/area`, `/api/kendaraan`
- Transaksi: `POST /api/transaksi/masuk`, `POST /api/transaksi/hitung-keluar`, `POST /api/transaksi/bayar`, `GET /api/transaksi/aktif`
- Lainnya: `GET /api/logs`, `GET /api/laporan`, `GET /api/stats`

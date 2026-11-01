# Dokumentasi Fungsi

## Backend (`backend/server.js`)

Semua balasan berbentuk JSON. Kalau gagal, balasan berisi `success: false` dan `message`.

| Fungsi | Input | Proses | Output |
|---|---|---|---|
| `hitungBiaya` | waktu masuk, tarif per jam, waktu keluar | Selisih waktu dibulatkan ke atas ke jam, minimal 1 | durasi jam, total bayar |
| `logActivity` | id user, teks aktivitas | Menyimpan ke `tb_log_aktivitas` | Tidak ada |
| `hashPassword` | password | Hash bcrypt 10 putaran | Hash |

| Endpoint | Input | Proses | Output |
|---|---|---|---|
| `POST /api/auth/login` | username, password | Cari akun aktif, cocokkan bcrypt, catat log | Data user |
| `POST /api/auth/logout` | username | Catat log | Pesan |
| `GET, POST /api/users` | Data user | Baca atau tambah, password di-hash | Daftar atau pesan |
| `PUT, DELETE /api/users/:id` | id, data user | Ubah atau hapus | Pesan |
| `GET, POST, PUT, DELETE /api/tarif` | Data tarif | CRUD tarif | Daftar atau pesan |
| `GET, POST, PUT, DELETE /api/area` | Data area | CRUD area | Daftar atau pesan |
| `GET, POST, PUT, DELETE /api/kendaraan` | Data kendaraan | CRUD kendaraan | Daftar atau pesan |
| `GET /api/logs` | Tidak ada | Baca log terbaru | Daftar log |
| `GET /api/transaksi/aktif` | Tidak ada | Baca transaksi berstatus `masuk` | Daftar kendaraan di dalam |
| `POST /api/transaksi/masuk` | plat, id tarif, id area, id user | Cek plat ganda, ambil slot, simpan transaksi, catat log | Data karcis |
| `POST /api/transaksi/hitung-keluar` | kode tiket atau plat | Cari transaksi aktif, hitung biaya, belum menyimpan | Transaksi dan estimasi |
| `POST /api/transaksi/bayar` | id parkir, id user | Kunci baris, hitung ulang biaya, tutup transaksi, slot berkurang, catat log | Data struk |
| `GET /api/laporan` | tanggal awal, tanggal akhir | Baca transaksi selesai dalam rentang | Daftar dan total |
| `GET /api/stats` | Tidak ada | Hitung kendaraan aktif, transaksi hari ini, kapasitas | Angka ringkasan |

## Frontend (`frontend/src/`)

### `lib/`

| File | Fungsi | Input | Proses | Output |
|---|---|---|---|---|
| `api.ts` | `api.get/post/put/del` | alamat, data | Memanggil backend dan mengubah error jadi kalimat mudah | Data, atau Error |
| `auth.svelte.ts` | `simpanUser`, `hapusUser` | user | Menyimpan atau menghapus data login di localStorage | State `auth.user` |
| `format.ts` | `rupiah`, `tanggal`, `lama`, `kapital`, `periode`, `hariIni` | angka, tanggal, teks | Mengubah format tampilan | Teks |
| `grafik.ts` | `kelompokHari`, `perJenis`, `perJam` | baris rekap | Mengelompokkan data untuk grafik | Data grafik |
| `csv.ts` | `unduhCsv` | baris rekap, total, rentang | Menyusun CSV lalu mengunduh | File `.csv` |
| `cetak.ts` | `cetak` | komponen, props | Memasang komponen ke `#print-area` lalu membuka dialog cetak | Dialog cetak |
| `ui.svelte.ts` | `toast`, `konfirmasi`, `bukaForm`, `ulang` | pesan, form, fungsi | Mengatur notifikasi, dialog, dan pembaruan berkala | Tampilan atau hasil ya/tidak |
| `scene.ts` | `Scene.start`, `stop`, `setZona`, `setMouse` | canvas, zona, posisi kursor | Menggambar kota parkir 3D dengan WebGL | Animasi di canvas |

### `halaman/`

| File | Dipakai oleh | Input | Proses | Output |
|---|---|---|---|---|
| `Landing.svelte` | Semua | Kursor, username, password | Memilih pintu dari arah kursor, lalu login | User tersimpan |
| `Panel.svelte` | Semua | User, halaman | Kerangka panel, pojok layar, logout | Halaman aktif |
| `Dashboard.svelte` | Semua | `/stats`, `/area` | Memuat kondisi parkir tiap 10 detik | Angka dan lantai parkir |
| `Transaksi.svelte` | Petugas | Plat, jenis, area, kode tiket | Mencatat masuk, menghitung biaya, menerima bayar | Karcis dan struk |
| `Rekap.svelte` | Owner | Rentang tanggal | Memuat laporan dan mengolah grafik | Total, grafik, tabel, cetak, CSV |
| `Master.svelte` | Admin | Tab, isian form | CRUD area, tarif, kendaraan, user, dan baca log | Tabel dan grafik |

### `komponen/`

| File | Input | Output |
|---|---|---|
| `Struk.svelte` | Data karcis atau struk | Kertas thermal |
| `PratinjauStruk.svelte` | Judul, data | Layar pratinjau karcis atau struk |
| `LaporanA4.svelte` | Laporan, rentang, warna, detail | Laporan A4 |
| `PratinjauLaporan.svelte` | Laporan, rentang | Layar pratinjau laporan |
| `Batang3D.svelte`, `Donat3D.svelte` | Data grafik | Grafik CSS 3D |
| `Lantai.svelte` | Data area | Lantai parkir di latar panel |
| `Modal.svelte`, `FormModal.svelte` | Judul, daftar isian | Dialog dan form |
| `Ikon.svelte` | Nama ikon | SVG |

# Frontend — Aplikasi Parkir (UKK RPL Paket 2)

Frontend dibuat dengan **HTML + CSS + JavaScript vanilla**, tanpa framework dan tanpa library. Data diambil dari API backend (Node.js Express) menggunakan `fetch`.

## Cara menjalankan
1. Impor `database_spk_asli.sql`, lalu jalankan backend: `cd backend && npm install && node server.js`. API-nya ada di `http://localhost:3000/api`.
2. Buka `frontend/index.html` di browser. Bisa langsung dibuka, atau lewat Live Server di VS Code.
3. Kalau alamat backend berbeda, ubah `API_BASE` di `js/config.js`.

## Struktur folder
```
frontend/
├── index.html            Landing page dan kerangka panel
├── css/style.css         Semua tampilan (responsif, cetak struk, cetak laporan)
└── js/
    ├── config.js         Alamat API
    ├── api.js            Fungsi fetch ke backend, pesan error, data login
    ├── ui.js             Fungsi bantu: format, modal, form, toast, cetak
    ├── visual.js         Grafik CSS 3D (batang, donat) dan olah data grafik
    ├── struk.js          Karcis, struk, dan layar pratinjaunya
    ├── scene.js          Latar 3D landing page (WebGL murni, tanpa library)
    ├── landing.js        Landing page: arah kursor menentukan pintu login
    ├── panel.js          Kerangka panel: pojok layar, lantai parkir, Dashboard, navigasi
    ├── app.js            Login, logout, hak akses halaman
    └── pages/
        ├── transaksi.js  Pos Gerbang: kendaraan masuk/keluar, cetak karcis dan struk (petugas)
        ├── rekap.js      Rekap per rentang tanggal dan cetak laporan (owner)
        └── master.js     CRUD Area, Tarif, Kendaraan, User + Log Aktivitas (admin)
```

## Cara pakai
- **Landing page:** arahkan kursor ke ujung atas (Owner), pojok kiri bawah (Petugas), atau pojok kanan bawah (Admin). Tanpa mouse: tombol panah atas, kiri, kanan. Akun yang lewat pintu yang salah akan ditolak dan diberi tahu harus lewat mana.
- **Panel:** diamkan kursor di pojok kanan atas untuk Dashboard, pojok kiri bawah untuk halaman kerja. Lingkaran pojok juga bisa diklik.
- Font Sora diambil dari Google Fonts; kalau offline, otomatis pakai font bawaan sistem.

## Hak akses (sesuai SPK)
| Halaman | Admin | Petugas | Owner |
|---|:-:|:-:|:-:|
| Dashboard | V | V | V |
| CRUD User, Tarif, Area, Kendaraan | V | | |
| Log Aktivitas | V | | |
| Transaksi + cetak struk | | V | |
| Rekap Transaksi | | | V |

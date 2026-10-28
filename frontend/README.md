# Frontend — Aplikasi Parkir (UKK RPL Paket 2)

Frontend dibuat dengan **HTML + CSS + JavaScript vanilla**, tanpa framework dan tanpa library. Data diambil dari API backend (Node.js Express) menggunakan `fetch`.

## Cara menjalankan
1. Jalankan backend dulu (`node server.js` di folder utama). API-nya ada di `http://localhost:3000/api`.
2. Buka `frontend/index.html` di browser. Bisa langsung dibuka, atau lewat Live Server di VS Code.
3. Kalau alamat backend berbeda, ubah `API_BASE` di `js/config.js`.

## Struktur folder
```
frontend/
├── index.html            Landing page login dan kerangka aplikasi
├── css/style.css         Semua tampilan (responsif, cetak struk, cetak laporan)
└── js/
    ├── config.js         Alamat API
    ├── api.js            Fungsi fetch ke backend dan data login
    ├── ui.js             Fungsi bantu: format rupiah/tanggal, modal, form, toast, cetak
    ├── scene.js          Latar 3D area parkir (WebGL murni, tanpa library)
    ├── landing.js        Landing page: arah kursor menentukan pintu login per role
    ├── app.js            Login, logout, menu per role, perpindahan halaman
    ├── owner.js          Panel Owner: pojok kanan atas = Dashboard live, pojok kiri bawah = Rekap 3D
    └── pages/
        ├── dashboard.js  Ringkasan hari ini dan keterisian area (admin & petugas)
        ├── crud.js       CRUD User, Tarif, Area, Kendaraan (admin)
        ├── log.js        Log aktivitas (admin)
        └── transaksi.js  Kendaraan masuk/keluar, cetak karcis dan struk (petugas)
```

## Landing page
Arah kursor menentukan pintu login: **atas = Owner**, **kiri bawah = Petugas**, **kanan bawah = Admin**. Kamera 3D ikut berpindah ke arah itu. Akun yang login lewat pintu yang salah akan ditolak dan diberi tahu harus lewat pintu mana. Font Sora diambil dari Google Fonts; kalau offline, otomatis pakai font bawaan sistem.

## Hak akses menu (sesuai SPK)
| Menu | Admin | Petugas | Owner |
|---|:-:|:-:|:-:|
| Dashboard | V | V | V |
| Data User, Tarif, Area, Kendaraan (CRUD) | V | | |
| Log Aktivitas | V | | |
| Transaksi + cetak struk | | V | |
| Rekap Transaksi | | | V |

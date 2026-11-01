# Frontend — Aplikasi Parkir (UKK RPL Paket 2)

Frontend dibuat dengan **Svelte 5 + TypeScript**, dan dibangun memakai **Vite**. Data diambil dari API backend (Node.js Express) menggunakan `fetch`.

## Cara menjalankan

1. Jalankan backend dulu: impor `database_spk_asli.sql`, lalu `cd backend && npm install && node server.js`. API-nya ada di `http://localhost:3000/api`.
2. Di terminal lain: `cd frontend && npm install && npm run dev`.
3. Buka `http://localhost:5173`.
4. Kalau alamat backend berbeda, buat file `.env` berisi `VITE_API_BASE=http://alamat-backend/api`.

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Jalankan untuk pengembangan |
| `npm run build` | Bangun versi jadi ke folder `dist/` |
| `npm run preview` | Coba hasil build |
| `npm run cek` | Periksa tipe TypeScript dan Svelte |

## Struktur folder

```
frontend/src/
├── main.ts               Titik awal aplikasi
├── App.svelte            Hak akses halaman, modal, notifikasi
├── style.css             Semua tampilan
├── halaman/              Landing, Panel, Dashboard, Transaksi, Rekap, Master
├── komponen/             Struk, laporan, grafik 3D, lantai parkir, modal
└── lib/
    ├── api.ts            Fungsi fetch ke backend dan pesan error
    ├── auth.svelte.ts    Data user yang login
    ├── tipe.ts           Bentuk data dari backend
    ├── format.ts         Format rupiah dan tanggal
    ├── grafik.ts         Olah data grafik
    ├── csv.ts            Export rekap
    ├── cetak.ts          Cetak struk dan laporan
    ├── ui.svelte.ts      Notifikasi, konfirmasi, form
    └── scene.ts          Latar 3D landing (WebGL murni, tanpa library)
```

## Akun awal

Username `admin`, `petugas`, dan `owner`, password semua `123456`.

# Laporan Evaluasi

## Fitur yang sudah jalan

- Login dan logout 3 role dengan pintu berbeda.
- Dashboard kondisi parkir, diperbarui tiap 10 detik.
- CRUD user, tarif, area, dan kendaraan, serta log aktivitas.
- Transaksi masuk dan keluar dengan biaya dihitung di server.
- Cetak karcis dan struk thermal 72 mm.
- Rekap per rentang tanggal, cetak A4, dan export CSV.
- Tampilan responsif di HP.
- Landing tetap bisa dipakai tanpa WebGL.

## Bug dan keterbatasan yang belum diperbaiki

| Bagian | Masalah |
|---|---|
| Backend | API belum memeriksa login dan role, jadi bisa dipanggil langsung tanpa masuk |
| Backend | `status_aktif` belum bisa diubah lewat aplikasi |
| Backend | `id_user` di transaksi tertimpa petugas keluar, jadi petugas masuk tidak tersimpan |
| Frontend | Posisi slot di lantai parkir hanya gambaran, karena database menyimpan jumlah per area |
| Pengujian | Cetak baru diuji ke PDF, belum ke printer thermal asli |

## Rencana pengembangan

1. Menambahkan token login dan pemeriksaan role di backend, lalu frontend mengirim token di tiap request.
2. Menambahkan pengaturan `status_aktif` di Data Master.
3. Memisahkan kolom petugas masuk dan petugas keluar.
4. Menambahkan paginasi pada log aktivitas dan rekap.

# Debugging

Alat yang dipakai: tes otomatis Firefox lewat puppeteer, `svelte-check`, build Vite, console browser, dan terminal backend.

| No | Masalah | Penyebab | Perbaikan |
|---|---|---|---|
| 1 | Login gagal walau password benar | Backend mencocokkan teks biasa, padahal seed berisi hash bcrypt | Backend memakai `bcrypt.compare` |
| 2 | Biaya bisa diubah dari browser | Total dikirim oleh frontend | Biaya dihitung ulang di server saat bayar |
| 3 | Bisa masuk tanpa password lewat `?as=admin` | Sisa kode tes | Kode dihapus, tes memastikan tidak bisa |
| 4 | Nama petugas kosong di karcis | API masuk tidak mengirim nama petugas | Karcis memakai nama user yang login |
| 5 | Form tarif memunculkan error SQL | Jenis diisi teks bebas, padahal kolomnya enum | Isian diganti dropdown 3 pilihan |
| 6 | Error database muncul mentah ke pengguna | Pesan MySQL diteruskan apa adanya | Pesan diubah jadi kalimat mudah di `api.ts` |
| 7 | Grafik donat admin menampilkan angka salah | Nilai dipaksa minimal 1 | Grafik memakai nilai asli, abu-abu kalau kosong |
| 8 | Form petugas tereset saat data diperbarui | Seluruh halaman digambar ulang | Isian disimpan di state, data diperbarui terpisah |
| 9 | Pojok layar menutupi tombol di 1366x768 | Label selalu lebar | Label baru melebar saat kursor dekat |
| 10 | Grafik 3D tidak tampil di laptop lama | WebGL tidak tersedia | Grafik panel memakai CSS 3D, landing punya latar cadangan |

## Hasil tes terakhir

Tes otomatis 36 pemeriksaan pada frontend Svelte dengan backend dan database asli: 35 lolos, 1 gagal. Tidak ada error di console.

Pemeriksaan yang gagal adalah API `/users` yang masih terbuka tanpa login. Ini tercatat di [LAPORAN_EVALUASI.md](LAPORAN_EVALUASI.md).

# ERD Aplikasi Parkir

Database: `parkir`. Skema lengkap ada di `database_spk_asli.sql`.

```mermaid
erDiagram
    tb_user ||--o{ tb_kendaraan : mencatat
    tb_user ||--o{ tb_transaksi : melayani
    tb_user ||--o{ tb_log_aktivitas : melakukan
    tb_kendaraan ||--o{ tb_transaksi : parkir
    tb_tarif ||--o{ tb_transaksi : menentukan_biaya
    tb_area_parkir ||--o{ tb_transaksi : menampung

    tb_user {
        int id_user PK
        varchar nama_lengkap
        varchar username UK
        varchar password "hash bcrypt"
        enum role "admin, petugas, owner"
        tinyint status_aktif
    }
    tb_tarif {
        int id_tarif PK
        enum jenis_kendaraan UK "motor, mobil, lainnya"
        decimal tarif_per_jam
    }
    tb_area_parkir {
        int id_area PK
        varchar nama_area UK
        int kapasitas
        int terisi
    }
    tb_kendaraan {
        int id_kendaraan PK
        varchar plat_nomor UK
        varchar jenis_kendaraan
        varchar warna
        varchar pemilik
        int id_user FK
    }
    tb_transaksi {
        int id_parkir PK
        int id_kendaraan FK
        datetime waktu_masuk
        datetime waktu_keluar
        int id_tarif FK
        int durasi_jam
        decimal biaya_total
        enum status "masuk, keluar"
        int id_user FK
        int id_area FK
    }
    tb_log_aktivitas {
        int id_log PK
        int id_user FK
        varchar aktivitas
        datetime waktu_aktivitas
    }
```

## Penjelasan tabel

| Tabel | Fungsi |
|---|---|
| `tb_user` | Akun admin, petugas, dan owner |
| `tb_tarif` | Tarif per jam untuk tiap jenis kendaraan |
| `tb_area_parkir` | Kapasitas dan jumlah terisi tiap area |
| `tb_kendaraan` | Data kendaraan, satu baris untuk satu plat |
| `tb_transaksi` | Satu baris untuk satu kali parkir, dari masuk sampai keluar |
| `tb_log_aktivitas` | Catatan login, logout, perubahan data, dan transaksi |

## Relasi

- Satu kendaraan bisa punya banyak transaksi, tapi hanya satu yang berstatus `masuk` pada satu waktu.
- `tb_transaksi.id_user` berisi petugas yang terakhir melayani. Saat kendaraan keluar, nilainya diganti petugas keluar.
- Kalau user dihapus, `id_user` di kendaraan, transaksi, dan log menjadi `NULL`, jadi riwayatnya tetap ada.
- Tarif, area, dan kendaraan yang sudah dipakai transaksi tidak bisa dihapus.

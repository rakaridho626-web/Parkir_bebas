// Bentuk data dari backend. Dipakai di semua halaman supaya salah nama kolom ketahuan saat build.

export type Role = 'admin' | 'petugas' | 'owner';

export interface User {
    id: number;
    username: string;
    nama_lengkap: string;
    role: Role;
}

export interface Area {
    id: number;
    kode_area: string;
    nama_area: string;
    kapasitas: number;
    terisi: number;
}

export interface Tarif {
    id: number;
    jenis_kendaraan: string;
    tarif_per_jam: number;
}

export interface Kendaraan {
    id: number;
    plat_nomor: string;
    jenis_kendaraan: string;
    warna: string;
    pemilik: string;
}

export interface Log {
    waktu: string;
    username: string;
    aktivitas: string;
}

export interface Stats {
    parkir_aktif: number;
    kapasitas_total: number;
    kapasitas_terisi: number;
    transaksi_hari_ini: number;
    pendapatan_hari_ini: number;
}

// Karcis: dipakai juga untuk daftar kendaraan yang masih parkir.
export interface Tiket {
    id: number;
    kode_tiket: string;
    plat_nomor: string;
    jenis_kendaraan: string;
    tarif_per_jam: number;
    nama_area: string;
    waktu_masuk: string;
    petugas_masuk?: string;
}

export interface Struk extends Tiket {
    waktu_keluar: string;
    durasi_jam: number;
    total_bayar: number;
    petugas_keluar?: string;
}

export interface Estimasi {
    durasi_jam: number;
    total_bayar: number;
}

// Satu baris rekap transaksi selesai.
export interface BarisRekap {
    kode_tiket: string;
    plat_nomor: string;
    jenis_kendaraan: string;
    waktu_masuk: string;
    waktu_keluar: string;
    durasi_jam: number;
    total_bayar: number;
}

export interface Laporan {
    data: BarisRekap[];
    total_pendapatan: number;
}

// Satu isian di form tambah/ubah data master.
export interface Field {
    name: string;
    label: string;
    type?: 'text' | 'number' | 'password' | 'select';
    required?: boolean;
    min?: number;
    upper?: boolean;
    placeholder?: string;
    hint?: string;
    options?: { value: string; label: string }[];
}

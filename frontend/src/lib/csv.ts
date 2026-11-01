import { kapital, tanggal } from './format';
import type { BarisRekap } from './tipe';

// Satu nilai CSV. Tanda kutip digandakan, dan nilai awalan = + - @ diberi ' supaya tidak dibaca rumus oleh Excel.
function sel(nilai: string | number): string {
    const teks = String(nilai);
    return `"${(/^[=+\-@]/.test(teks) ? `'${teks}` : teks).replace(/"/g, '""')}"`;
}

// Unduh rekap sebagai file CSV. Pemisah ; supaya langsung rapi di Excel berbahasa Indonesia.
export function unduhCsv(rows: BarisRekap[], total: number, mulai: string, sampai: string) {
    const judul = ['Kode Tiket', 'Plat Nomor', 'Jenis', 'Masuk', 'Keluar', 'Durasi (jam)', 'Bayar'];
    const isi = rows.map(r => [
        r.kode_tiket, r.plat_nomor, kapital(r.jenis_kendaraan),
        tanggal(r.waktu_masuk), tanggal(r.waktu_keluar), r.durasi_jam, r.total_bayar
    ]);
    const baris = [judul, ...isi, ['Total', '', '', '', '', '', total]];
    const teks = '﻿' + baris.map(b => b.map(sel).join(';')).join('\r\n');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([teks], { type: 'text/csv;charset=utf-8' }));
    a.download = `rekap-parkir-${mulai}-sd-${sampai}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

import { kapital } from './format';
import type { BarisRekap } from './tipe';

// Olah data untuk grafik batang dan donat di Rekap dan Data Master.

export const WARNA_JENIS = ['#4d8cff', '#33d9f2', '#a98fff', '#ffb547', '#ff6b8b'];

export interface Batang { label: string; nilai: number; }
export interface Hari extends Batang { kunci: string; minggu?: boolean; }
export interface Irisan { jenis: string; jumlah: number; nilai: number; }

const tglLokal = (v: string | Date) => new Date(v).toLocaleDateString('sv-SE');

// Hitung pendapatan per hari. Hari tanpa transaksi tetap muncul dengan nilai 0.
// Rentang lebih dari 31 hari dikelompokkan per minggu supaya batang tidak terlalu rapat.
export function kelompokHari(rows: BarisRekap[], start: string, end: string): Hari[] {
    const hari: string[] = [];
    for (let d = new Date(start + 'T00:00'); d <= new Date(end + 'T00:00'); d.setDate(d.getDate() + 1)) {
        hari.push(tglLokal(d));
    }
    const total: Record<string, number> = {};
    for (const r of rows) {
        const k = tglLokal(r.waktu_keluar);
        total[k] = (total[k] || 0) + Number(r.total_bayar);
    }
    let data: Omit<Hari, 'label'>[] = hari.map(k => ({ kunci: k, nilai: total[k] || 0 }));

    if (data.length > 31) {
        const minggu: Omit<Hari, 'label'>[] = [];
        for (let i = 0; i < data.length; i += 7) {
            const potong = data.slice(i, i + 7);
            minggu.push({ kunci: potong[0].kunci, nilai: potong.reduce((a, b) => a + b.nilai, 0), minggu: true });
        }
        data = minggu;
    }
    return data.map(d => {
        const tgl = new Date(d.kunci + 'T00:00');
        return { ...d, label: (d.minggu ? 'mg ' : '') + tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) };
    });
}

// Kelompokkan baris per jenis kendaraan, lalu urutkan dari nilai terbesar.
// nilai() menentukan bobot tiap baris, misalnya total bayar.
export function perJenis<T extends { jenis_kendaraan: string }>(rows: T[], nilai: (r: T) => number): Irisan[] {
    const hasil: Record<string, Irisan> = {};
    for (const r of rows) {
        const k = kapital(r.jenis_kendaraan);
        hasil[k] ??= { jenis: k, jumlah: 0, nilai: 0 };
        hasil[k].jumlah++;
        hasil[k].nilai += nilai(r);
    }
    return Object.values(hasil).sort((a, b) => b.nilai - a.nilai);
}

// Hitung jumlah kendaraan masuk per jam (00 sampai 23).
export function perJam(rows: BarisRekap[]): Batang[] {
    const jam: number[] = Array(24).fill(0);
    rows.forEach(r => jam[new Date(r.waktu_masuk).getHours()]++);
    return jam.map((n, i) => ({ label: String(i).padStart(2, '0'), nilai: n }));
}

// Rupiah versi pendek untuk label grafik: 15000 jadi 15rb, 2500000 jadi 2.5jt.
export const rupiahSingkat = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.0', '')}jt`
    : n >= 1e3 ? `${Math.round(n / 1e3)}rb` : String(n);

// Grafik batang berputar mengikuti kursor. Dipasang sekali di pembungkus: use:putarChart.
export function putarChart(el: HTMLElement) {
    const gerak = (e: PointerEvent) => {
        const chart = (e.target as HTMLElement).closest<HTMLElement>('.chart3d');
        if (!chart) return;
        const r = chart.getBoundingClientRect();
        chart.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 50 - 18).toFixed(1)}deg`);
        chart.style.setProperty('--rx', `${(-14 - ((e.clientY - r.top) / r.height - 0.5) * 16).toFixed(1)}deg`);
    };
    el.addEventListener('pointermove', gerak);
    return { destroy: () => el.removeEventListener('pointermove', gerak) };
}

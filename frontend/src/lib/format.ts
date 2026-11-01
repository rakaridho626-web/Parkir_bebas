// Fungsi bantu format teks, angka, dan tanggal.

type Tanggal = string | number | Date;

// "mobil" jadi "Mobil" (data jenis di database huruf kecil).
export function kapital(teks: string | null | undefined): string {
    const t = String(teks ?? '');
    return t.charAt(0).toUpperCase() + t.slice(1);
}

// Format angka ke rupiah: 5000 jadi Rp 5.000.
export function rupiah(n: number | string): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(Number(n) || 0);
}

// Format tanggal Indonesia, contoh: 1 Nov 2026, 18.11.
export function tanggal(value: Tanggal | null | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

// Lama parkir dari waktu masuk sampai sekarang, contoh "2j 15m".
export function lama(dari: Tanggal): string {
    const menit = Math.max(0, Math.floor((Date.now() - new Date(dari).getTime()) / 60000));
    const jam = Math.floor(menit / 60);
    return jam ? `${jam}j ${menit % 60}m` : `${menit}m`;
}

// Tanggal format YYYY-MM-DD (waktu lokal). offsetHari -6 berarti enam hari lalu.
export function hariIni(offsetHari = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetHari);
    return d.toLocaleDateString('sv-SE');
}

// Teks periode, contoh: 26 Okt 2026 – 1 Nov 2026.
export function periode(mulai: string, sampai: string): string {
    const f = (d: string) => new Date(d + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return mulai === sampai ? f(mulai) : `${f(mulai)} – ${f(sampai)}`;
}

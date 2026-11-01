import { API_BASE } from './config';

// Ubah pesan teknis dari database jadi kalimat yang dimengerti pengguna.
function pesanMudah(teks = '', status: number): string {
    if (/Duplicate entry/i.test(teks)) return 'Data ini sudah ada.';
    if (/foreign key constraint/i.test(teks)) return 'Data masih dipakai transaksi, jadi tidak bisa dihapus.';
    if (/Data truncated|Incorrect|Data too long/i.test(teks)) return 'Isian tidak sesuai. Periksa lagi datanya.';
    return teks || `Terjadi kesalahan (${status}).`;
}

// Fungsi inti pemanggil API. Kalau gagal, melempar Error berisi pesan yang siap ditampilkan.
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const options: RequestInit = { method };
    if (body) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
    }

    let res: Response;
    try {
        res = await fetch(API_BASE + path, options);
    } catch {
        throw new Error('Server tidak bisa dihubungi. Pastikan backend sudah jalan.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(pesanMudah(data.message, res.status));
    return data as T;
}

// Semua halaman memanggil backend lewat objek ini, contoh: api.get<...>('/tarif').
export const api = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    del: <T>(path: string) => request<T>('DELETE', path)
};

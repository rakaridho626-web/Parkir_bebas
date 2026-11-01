// ========================================================
// PENGHUBUNG KE BACKEND (fetch) + DATA LOGIN
// ========================================================

// Semua komunikasi dengan backend lewat objek ini, jadi halaman lain tidak perlu menulis fetch sendiri.
const api = {
    // Fungsi inti pemanggil API. method = GET/POST/PUT/DELETE, path = alamat, body = data yang dikirim.
    // Kalau gagal, melempar Error berisi pesan yang siap ditampilkan ke pengguna.
    async request(method, path, body) {
        const options = { method, headers: {} };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        let res;
        try {
            res = await fetch(CONFIG.API_BASE + path, options);
        } catch {
            throw new Error('Server tidak bisa dihubungi. Pastikan backend sudah jalan.');
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
            throw new Error(this.pesan(data.message, res.status));
        }
        return data;
    },

    // Ubah pesan teknis dari database jadi kalimat yang dimengerti pengguna
    pesan(teks = '', status) {
        if (/Duplicate entry/i.test(teks)) return 'Data ini sudah ada.';
        if (/foreign key constraint/i.test(teks)) return 'Data masih dipakai transaksi, jadi tidak bisa dihapus.';
        if (/Data truncated|Incorrect|Data too long/i.test(teks)) return 'Isian tidak sesuai. Periksa lagi datanya.';
        return teks || `Terjadi kesalahan (${status}).`;
    },
    // Jalan pintas supaya pemanggilan lebih pendek, contoh: api.get('/tarif').
    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    del(path) { return this.request('DELETE', path); }
};

// Data user yang sedang login (disimpan di browser)
// Dipakai di semua halaman lewat Auth.user. Hilang saat logout.
const Auth = {
    KEY: 'parkir_user',
    // Baca user dari localStorage. try/catch berjaga kalau datanya rusak.
    get user() {
        try { return JSON.parse(localStorage.getItem(this.KEY)); } catch { return null; }
    },
    // Simpan user setelah login berhasil.
    save(user) { localStorage.setItem(this.KEY, JSON.stringify(user)); },
    // Hapus user saat logout.
    clear() { localStorage.removeItem(this.KEY); }
};

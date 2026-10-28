// ========================================================
// PENGHUBUNG KE BACKEND (fetch) + DATA LOGIN
// ========================================================

const api = {
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
            throw new Error(data.message || `Terjadi kesalahan (${res.status})`);
        }
        return data;
    },
    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    del(path) { return this.request('DELETE', path); }
};

// Data user yang sedang login (disimpan di browser)
const Auth = {
    KEY: 'parkir_user',
    get user() {
        try { return JSON.parse(localStorage.getItem(this.KEY)); } catch { return null; }
    },
    save(user) { localStorage.setItem(this.KEY, JSON.stringify(user)); },
    clear() { localStorage.removeItem(this.KEY); }
};

// ========================================================
// APLIKASI UTAMA: login, logout, hak akses halaman
// ========================================================

// Halaman yang boleh dibuka tiap role (sesuai SPK)
const AKSES = {
    owner: ['dashboard', 'laporan'],
    petugas: ['dashboard', 'transaksi'],
    admin: ['dashboard', 'area', 'tarif', 'kendaraan', 'users', 'log']
};

// Tampilkan landing page, tutup panel.
function tampilLogin() {
    Panel.hide();
    Landing.show();
}

// Tampilkan panel setelah login, lalu buka halaman sesuai alamat.
function tampilApp() {
    Landing.hide();
    Panel.show(logout);
    buka();
}

// Buka halaman sesuai hash URL (#/transaksi, dst)
function buka() {
    const user = Auth.user;
    if (!user) return tampilLogin();

    const id = location.hash.replace('#/', '');
    if (!AKSES[user.role].includes(id)) {
        location.hash = '#/dashboard';   // halaman tidak boleh / tidak ada → ke dashboard
        return;
    }
    return Panel.buka(id);
}

// Minta konfirmasi, catat ke log, hapus data login, lalu kembali ke landing.
async function logout() {
    if (!await UI.confirm('Keluar dari aplikasi?', 'Keluar')) return;
    api.post('/auth/logout', { username: Auth.user.username }).catch(() => {});
    Auth.clear();
    tampilLogin();
}

// Setiap bagian # di alamat berubah, buka halaman yang sesuai.
window.addEventListener('hashchange', buka);
// Saat web pertama dibuka: kalau sudah pernah login langsung ke panel, kalau belum ke landing.
Landing.init(tampilApp);
Auth.user ? tampilApp() : tampilLogin();

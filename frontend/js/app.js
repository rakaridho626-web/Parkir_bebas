// ========================================================
// APLIKASI UTAMA: login, logout, menu per role, pindah halaman
// ========================================================

// Menu & hak akses sesuai SPK (admin, petugas, owner)
const MENU = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', roles: ['admin', 'petugas', 'owner'] },
    { id: 'transaksi', label: 'Transaksi Parkir', icon: 'car', roles: ['petugas'] },
    { id: 'users', label: 'Data User', icon: 'users', roles: ['admin'] },
    { id: 'tarif', label: 'Tarif Parkir', icon: 'tag', roles: ['admin'] },
    { id: 'area', label: 'Area Parkir', icon: 'grid', roles: ['admin'] },
    { id: 'kendaraan', label: 'Data Kendaraan', icon: 'card', roles: ['admin'] },
    { id: 'log', label: 'Log Aktivitas', icon: 'list', roles: ['admin'] },
    { id: 'laporan', label: 'Rekap Transaksi', icon: 'chart', roles: ['owner'] }
];

const $ = sel => document.querySelector(sel);

function menuUntuk(role) {
    return MENU.filter(m => m.roles.includes(role));
}

function tampilLogin() {
    $('#app-view').hidden = true;
    Owner.hide();
    $('#page').innerHTML = '';   // bersihkan data halaman sebelumnya
    Landing.show();
}

function tampilApp() {
    const user = Auth.user;
    Landing.hide();
    if (user.role === 'owner') {            // owner punya tampilan sendiri (js/owner.js)
        Owner.show(logout);
        return buka();
    }
    $('#app-view').hidden = false;
    $('#user-name').textContent = user.nama_lengkap;
    $('#user-role').textContent = user.role;
    $('#user-role').className = `badge badge-${user.role}`;
    $('#menu').innerHTML = menuUntuk(user.role).map(m =>
        `<a class="menu-item" href="#/${m.id}" data-id="${m.id}">${UI.icon(m.icon)}<span>${m.label}</span></a>`
    ).join('');
    buka();
}

// Buka halaman sesuai hash URL (#/transaksi, dst)
function buka() {
    const user = Auth.user;
    if (!user) return tampilLogin();

    const daftar = menuUntuk(user.role);
    const id = location.hash.replace('#/', '');
    const menu = daftar.find(m => m.id === id);
    if (!menu) {
        location.hash = `#/${daftar[0].id}`;   // halaman tidak boleh / tidak ada → ke halaman pertama
        return;
    }

    if (user.role === 'owner') return Owner.buka(menu.id);

    document.querySelectorAll('.menu-item[data-id]').forEach(a =>
        a.classList.toggle('active', a.dataset.id === menu.id));
    $('#page-title').textContent = menu.label;
    document.title = `${menu.label} · Parkir Bebas`;
    document.body.classList.remove('menu-open');
    Pages[menu.id]($('#page'));
}

$('#btn-logout').innerHTML = `${UI.icon('logout')}<span>Keluar</span>`;
async function logout() {
    if (!await UI.confirm('Keluar dari aplikasi?', 'Keluar')) return;
    api.post('/auth/logout', { username: Auth.user.username }).catch(() => {});
    Auth.clear();
    tampilLogin();
}
$('#btn-logout').addEventListener('click', logout);

// Menu samping di HP
$('#menu-toggle').innerHTML = UI.icon('menu');
$('#menu-toggle').addEventListener('click', () => document.body.classList.toggle('menu-open'));
$('#backdrop').addEventListener('click', () => document.body.classList.remove('menu-open'));

// Jam realtime
setInterval(() => {
    const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    $('#clock').textContent = jam;
    $('#landing-clock').textContent = jam;
}, 1000);

window.addEventListener('hashchange', buka);
Landing.init(tampilApp);
Auth.user ? tampilApp() : tampilLogin();

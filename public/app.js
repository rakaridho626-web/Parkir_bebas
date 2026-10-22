// ========================================================
// FRONTEND JAVASCRIPT APLIKASI PARKIR (UKK RPL PAKET 2)
// Responsive, Smooth, Zero Lag, Native Fetch API
// ========================================================

const API_BASE = '/api';
let currentUser = JSON.parse(localStorage.getItem('user_parkir')) || null;
let currentTab = 'dashboard';

// Format Rupiah
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number || 0);
}

// Format Tanggal
function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
}

// Jam Realtime
setInterval(() => {
    const clockEl = document.getElementById('realtime-clock');
    if (clockEl) {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('id-ID');
    }
}, 1000);

// Quick Fill Login
function quickFill(role) {
    document.getElementById('login-username').value = role;
    document.getElementById('login-password').value = '123456';
}

// Inisialisasi Aplikasi
window.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        showApp();
    } else {
        showLogin();
    }
});

function showLogin() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('main-section').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('main-section').classList.remove('hidden');

    document.getElementById('user-name').innerText = currentUser.nama_lengkap;
    document.getElementById('user-avatar').innerText = currentUser.nama_lengkap.charAt(0).toUpperCase();
    const roleBadge = document.getElementById('user-role-badge');
    roleBadge.innerText = currentUser.role.toUpperCase();

    renderSidebarNav();
    switchTab(currentUser.role === 'petugas' ? 'transaksi' : (currentUser.role === 'owner' ? 'laporan' : 'dashboard'));
}

// Form Login Submit
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const alertBox = document.getElementById('login-alert');

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await res.json();

        if (result.success) {
            currentUser = result.user;
            localStorage.setItem('user_parkir', JSON.stringify(currentUser));
            alertBox.classList.add('hidden');
            showApp();
        } else {
            alertBox.innerText = result.message;
            alertBox.classList.remove('hidden');
        }
    } catch (err) {
        alertBox.innerText = 'Gagal terhubung ke server backend!';
        alertBox.classList.remove('hidden');
    }
});

async function handleLogout() {
    if (confirm('Yakin ingin keluar dari sistem?')) {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser ? currentUser.username : '' })
        });
        localStorage.removeItem('user_parkir');
        currentUser = null;
        showLogin();
    }
}

// Render Menu Sesuai Tabel Fitur Kisi-Kisi UKK Halaman 2:
// Admin: Login, Logout, CRUD User, CRUD Tarif, CRUD Area, CRUD Kendaraan, Akses Log
// Petugas: Login, Logout, Transaksi, Cetak Struk
// Owner: Login, Logout, Rekap Transaksi
function renderSidebarNav() {
    const nav = document.getElementById('nav-links');
    nav.innerHTML = '';

    const menuAdmin = [
        { id: 'dashboard', name: 'Dashboard', icon: 'fa-gauge' },
        { id: 'transaksi', name: 'Transaksi Parkir', icon: 'fa-ticket' },
        { id: 'users', name: 'CRUD User', icon: 'fa-users' },
        { id: 'tarif', name: 'CRUD Tarif Parkir', icon: 'fa-tags' },
        { id: 'area', name: 'CRUD Area Parkir', icon: 'fa-square-parking' },
        { id: 'kendaraan', name: 'CRUD Kendaraan', icon: 'fa-car' },
        { id: 'logs', name: 'Log Aktivitas', icon: 'fa-clock-rotate-left' },
        { id: 'laporan', name: 'Rekap Laporan', icon: 'fa-file-invoice-dollar' }
    ];

    const menuPetugas = [
        { id: 'transaksi', name: 'Transaksi & Struk', icon: 'fa-ticket' }
    ];

    const menuOwner = [
        { id: 'dashboard', name: 'Ringkasan Eksekutif', icon: 'fa-gauge' },
        { id: 'laporan', name: 'Rekap Transaksi', icon: 'fa-file-invoice-dollar' }
    ];

    let activeMenu = [];
    if (currentUser.role === 'admin') activeMenu = menuAdmin;
    else if (currentUser.role === 'petugas') activeMenu = menuPetugas;
    else if (currentUser.role === 'owner') activeMenu = menuOwner;

    activeMenu.forEach(item => {
        const btn = document.createElement('button');
        btn.className = `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            currentTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`;
        btn.innerHTML = `<i class="fa-solid ${item.icon} w-5 text-center"></i><span>${item.name}</span>`;
        btn.onclick = () => switchTab(item.id);
        nav.appendChild(btn);
    });
}

function switchTab(tabId) {
    currentTab = tabId;
    renderSidebarNav();
    const container = document.getElementById('view-container');
    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');

    switch (tabId) {
        case 'dashboard':
            title.innerText = 'Dashboard Utama';
            subtitle.innerText = 'Pemantauan kapasitas & statistik harian sistem';
            loadDashboard(container);
            break;
        case 'transaksi':
            title.innerText = 'Kelola Transaksi Parkir';
            subtitle.innerText = 'Proses kendaraan masuk, checkout keluar, dan cetak tiket struk';
            loadTransaksi(container);
            break;
        case 'users':
            title.innerText = 'Kelola Pengguna (CRUD User)';
            subtitle.innerText = 'Manajemen akun Admin, Petugas, dan Owner';
            loadUsers(container);
            break;
        case 'tarif':
            title.innerText = 'Kelola Tarif Parkir';
            subtitle.innerText = 'Atur skema tarif parkir berdasarkan jenis kendaraan';
            loadTarif(container);
            break;
        case 'area':
            title.innerText = 'Kelola Area Parkir';
            subtitle.innerText = 'Pengaturan blok dan kapasitas tempat parkir';
            loadArea(container);
            break;
        case 'kendaraan':
            title.innerText = 'Master Data Kendaraan';
            subtitle.innerText = 'Database plat nomor dan pemilik kendaraan';
            loadKendaraan(container);
            break;
        case 'logs':
            title.innerText = 'Log Aktivitas Sistem';
            subtitle.innerText = 'Audit trail aktivitas seluruh user di aplikasi';
            loadLogs(container);
            break;
        case 'laporan':
            title.innerText = 'Rekap Transaksi Parkir';
            subtitle.innerText = 'Laporan pendapatan dan riwayat keluar-masuk sesuai filter tanggal';
            loadLaporan(container);
            break;
    }
}

// ==========================================
// VIEW: DASHBOARD
// ==========================================
async function loadDashboard(container) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>`;
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json();

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase">Kendaraan di Dalam</p>
                        <h3 class="text-3xl font-extrabold text-slate-800 mt-2">${data.parkir_aktif}</h3>
                    </div>
                    <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl">
                        <i class="fa-solid fa-car-side"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase">Selesai Hari Ini</p>
                        <h3 class="text-3xl font-extrabold text-slate-800 mt-2">${data.transaksi_hari_ini}</h3>
                    </div>
                    <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl">
                        <i class="fa-solid fa-check-double"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase">Pendapatan Hari Ini</p>
                        <h3 class="text-2xl font-extrabold text-slate-800 mt-2">${formatRupiah(data.pendapatan_hari_ini)}</h3>
                    </div>
                    <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl">
                        <i class="fa-solid fa-wallet"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase">Kapasitas Terisi</p>
                        <h3 class="text-3xl font-extrabold text-slate-800 mt-2">${data.kapasitas_terisi} / ${data.kapasitas_total}</h3>
                    </div>
                    <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                        <i class="fa-solid fa-square-parking"></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h4 class="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-shield-halved text-indigo-600"></i>
                Status Hak Akses UKK RPL (3 Level)
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span class="font-bold text-indigo-600">Level 1: ADMIN</span>
                    <p class="text-xs text-slate-500 mt-1">Mengelola penuh: CRUD User, CRUD Tarif, CRUD Area, Master Kendaraan, & Akses Log Aktivitas.</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span class="font-bold text-emerald-600">Level 2: PETUGAS</span>
                    <p class="text-xs text-slate-500 mt-1">Operasional gate: Transaksi Masuk/Keluar, Hitung Biaya, dan Cetak Struk Karcis.</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span class="font-bold text-violet-600">Level 3: OWNER</span>
                    <p class="text-xs text-slate-500 mt-1">Manajerial: Memantau ringkasan & mengekspor rekap laporan transaksi sesuai tanggal.</p>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// VIEW: TRANSAKSI & STRUK (PETUGAS / ADMIN)
// ==========================================
async function loadTransaksi(container) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>`;
    
    // Ambil data tarif, area, dan transaksi aktif
    const [resTarif, resArea, resAktif] = await Promise.all([
        fetch(`${API_BASE}/tarif`).then(r => r.json()),
        fetch(`${API_BASE}/area`).then(r => r.json()),
        fetch(`${API_BASE}/transaksi/aktif`).then(r => r.json())
    ]);

    const tarifOptions = resTarif.data.map(t => `<option value="${t.id}">${t.jenis_kendaraan} (${formatRupiah(t.tarif_per_jam)}/jam)</option>`).join('');
    const areaOptions = resArea.data.map(a => `<option value="${a.id}">${a.kode_area} - ${a.nama_area} (Sisa: ${a.kapasitas - a.terisi})</option>`).join('');

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <!-- Form Masuk -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-arrow-right-to-bracket text-emerald-600"></i>
                    Kendaraan Masuk (Check-In)
                </h3>
                <form id="form-masuk" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Plat Nomor</label>
                        <input type="text" id="masuk-plat" required placeholder="Misal: B 1234 ABC" 
                            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 uppercase font-mono font-bold text-slate-800">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Jenis Kendaraan & Tarif</label>
                        <select id="masuk-tarif" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm">
                            ${tarifOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Pilih Area Parkir</label>
                        <select id="masuk-area" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm">
                            ${areaOptions}
                        </select>
                    </div>
                    <button type="submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2">
                        <i class="fa-solid fa-print"></i>
                        <span>Cetak Tiket Masuk</span>
                    </button>
                </form>
            </div>

            <!-- Form Keluar -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-arrow-right-from-bracket text-rose-600"></i>
                    Kendaraan Keluar (Check-Out)
                </h3>
                <form id="form-cari-keluar" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Cari Tiket / Plat Nomor</label>
                        <div class="flex gap-2">
                            <input type="text" id="keluar-search" required placeholder="Kode Tiket / Plat" 
                                class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 uppercase font-mono font-bold text-slate-800">
                            <button type="submit" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow transition">
                                <i class="fa-solid fa-magnifying-glass"></i>
                            </button>
                        </div>
                    </div>
                </form>

                <div id="checkout-result-box" class="hidden mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                    <!-- Preview Perhitungan Otomatis -->
                </div>
            </div>

            <!-- Info Petugas -->
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                    <h3 class="font-bold text-base text-slate-800 mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-circle-info text-indigo-600"></i>
                        Petugas Operasional
                    </h3>
                    <div class="space-y-2 text-xs text-slate-600">
                        <p><strong>Nama:</strong> ${currentUser.nama_lengkap}</p>
                        <p><strong>Username:</strong> ${currentUser.username}</p>
                        <p><strong>Status Gate:</strong> <span class="text-emerald-600 font-bold">ONLINE (Gate 1)</span></p>
                    </div>
                </div>
                <div class="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    <i class="fa-solid fa-lightbulb"></i> Tiket otomatis mencatat durasi parkir dengan pembulatan jam ke atas (minimal dihitung 1 jam).
                </div>
            </div>
        </div>

        <!-- Tabel Kendaraan Masih Terparkir -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-base text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-list-check text-indigo-600"></i>
                    Kendaraan Sedang Terparkir (${resAktif.data.length})
                </h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                    <thead class="bg-slate-50 uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                            <th class="p-3">Kode Tiket</th>
                            <th class="p-3">Plat Nomor</th>
                            <th class="p-3">Jenis</th>
                            <th class="p-3">Area</th>
                            <th class="p-3">Waktu Masuk</th>
                            <th class="p-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${resAktif.data.length === 0 ? '<tr><td colspan="6" class="p-4 text-center text-slate-400">Tidak ada kendaraan yang sedang terparkir</td></tr>' : ''}
                        ${resAktif.data.map(item => `
                            <tr class="hover:bg-slate-50/50">
                                <td class="p-3 font-mono font-bold text-indigo-600">${item.kode_tiket}</td>
                                <td class="p-3 font-mono font-bold text-slate-900">${item.plat_nomor}</td>
                                <td class="p-3">${item.jenis_kendaraan}</td>
                                <td class="p-3">${item.kode_area} (${item.nama_area})</td>
                                <td class="p-3">${formatDateTime(item.waktu_masuk)}</td>
                                <td class="p-3">
                                    <button onclick="prosesCheckoutLangsung('${item.kode_tiket}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg border border-rose-200 flex items-center gap-1.5">
                                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                                        <span>Proses Keluar</span>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Event Handler Check-In
    document.getElementById('form-masuk').addEventListener('submit', async (e) => {
        e.preventDefault();
        const plat_nomor = document.getElementById('masuk-plat').value.trim();
        const id_tarif = document.getElementById('masuk-tarif').value;
        const id_area = document.getElementById('masuk-area').value;

        try {
            const res = await fetch(`${API_BASE}/transaksi/masuk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plat_nomor, id_tarif, id_area, petugas: currentUser.username })
            });
            const result = await res.json();
            if (result.success) {
                printStrukMasuk(result.tiket);
                switchTab('transaksi');
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert('Gagal memproses transaksi masuk!');
        }
    });

    // Event Handler Cari Checkout
    document.getElementById('form-cari-keluar').addEventListener('submit', async (e) => {
        e.preventDefault();
        const search = document.getElementById('keluar-search').value.trim();
        cariCheckout(search);
    });
}

async function cariCheckout(search) {
    const box = document.getElementById('checkout-result-box');
    try {
        const res = await fetch(`${API_BASE}/transaksi/hitung-keluar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ search })
        });
        const result = await res.json();
        if (result.success) {
            const { transaksi, estimasi } = result;
            box.classList.remove('hidden');
            box.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between border-b pb-1">
                        <span class="text-slate-500">Tiket:</span>
                        <strong class="font-mono text-indigo-600">${transaksi.kode_tiket}</strong>
                    </div>
                    <div class="flex justify-between border-b pb-1">
                        <span class="text-slate-500">Plat Nomor:</span>
                        <strong class="font-mono">${transaksi.plat_nomor}</strong>
                    </div>
                    <div class="flex justify-between border-b pb-1">
                        <span class="text-slate-500">Jenis:</span>
                        <strong>${transaksi.jenis_kendaraan}</strong>
                    </div>
                    <div class="flex justify-between border-b pb-1">
                        <span class="text-slate-500">Durasi:</span>
                        <strong class="text-amber-600">${estimasi.durasi_jam} Jam</strong>
                    </div>
                    <div class="flex justify-between text-base font-bold text-slate-800 pt-1">
                        <span>Total Bayar:</span>
                        <span class="text-rose-600">${formatRupiah(estimasi.total_bayar)}</span>
                    </div>
                    <button onclick="bayarSelesai(${transaksi.id}, ${estimasi.durasi_jam}, ${estimasi.total_bayar})" class="w-full mt-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow transition">
                        Bayar & Cetak Struk Selesai
                    </button>
                </div>
            `;
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert('Gagal mencari transaksi!');
    }
}

function prosesCheckoutLangsung(kodeTiket) {
    const input = document.getElementById('keluar-search');
    if (input) {
        input.value = kodeTiket;
        cariCheckout(kodeTiket);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function bayarSelesai(id, durasi_jam, total_bayar) {
    try {
        const res = await fetch(`${API_BASE}/transaksi/bayar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, durasi_jam, total_bayar, petugas: currentUser.username })
        });
        const result = await res.json();
        if (result.success) {
            printStrukKeluar(result.struk);
            switchTab('transaksi');
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert('Gagal menyelesaikan pembayaran!');
    }
}

// ==========================================
// CETAK STRUK PARKIR (SESUAI POIN 7c & TABEL FITUR)
// ==========================================
function printStrukMasuk(data) {
    const printArea = document.getElementById('receipt-print-area');
    printArea.innerHTML = `
        <div style="text-align: center; font-family: monospace; padding: 10px; border: 1px dashed #000; width: 280px; margin: auto;">
            <h3 style="margin: 0; font-size: 16px; font-weight: bold;">PARKIR PRO</h3>
            <p style="margin: 2px 0; font-size: 10px;">TIKET MASUK PARKIR</p>
            <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
            <h2 style="margin: 5px 0; font-size: 20px; font-weight: bold; letter-spacing: 2px;">${data.plat_nomor}</h2>
            <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">${data.kode_tiket}</p>
            <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
            <div style="font-size: 11px; text-align: left; line-height: 1.4;">
                <div>Jenis: ${data.jenis_kendaraan}</div>
                <div>Tarif: ${formatRupiah(data.tarif_per_jam)} / jam</div>
                <div>Area : ${data.kode_area} - ${data.nama_area}</div>
                <div>Masuk: ${formatDateTime(data.waktu_masuk)}</div>
                <div>Petugas: ${data.petugas_masuk}</div>
            </div>
            <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
            <p style="margin: 4px 0; font-size: 9px;">* Simpan tiket ini dengan baik *<br/>Kehilangan tiket dikenakan denda.</p>
        </div>
    `;
    window.print();
}

function printStrukKeluar(data) {
    const printArea = document.getElementById('receipt-print-area');
    printArea.innerHTML = `
        <div style="text-align: center; font-family: monospace; padding: 10px; border: 1px dashed #000; width: 280px; margin: auto;">
            <h3 style="margin: 0; font-size: 16px; font-weight: bold;">PARKIR PRO</h3>
            <p style="margin: 2px 0; font-size: 10px;">BUKTI PEMBAYARAN PARKIR</p>
            <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
            <h2 style="margin: 5px 0; font-size: 18px; font-weight: bold;">${data.plat_nomor}</h2>
            <p style="margin: 2px 0; font-size: 11px;">${data.kode_tiket}</p>
            <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
            <div style="font-size: 11px; text-align: left; line-height: 1.4;">
                <div>Jenis    : ${data.jenis_kendaraan}</div>
                <div>Masuk    : ${formatDateTime(data.waktu_masuk)}</div>
                <div>Keluar   : ${formatDateTime(data.waktu_keluar)}</div>
                <div>Durasi   : ${data.durasi_jam} Jam</div>
                <div>Petugas  : ${data.petugas_keluar}</div>
            </div>
            <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
            <div style="font-size: 14px; font-weight: bold; display: flex; justify-content: space-between;">
                <span>TOTAL:</span>
                <span>${formatRupiah(data.total_bayar)}</span>
            </div>
            <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;" />
            <p style="margin: 4px 0; font-size: 9px;">Terima kasih atas kunjungan Anda.<br/>Semoga selamat sampai tujuan.</p>
        </div>
    `;
    window.print();
}

// ==========================================
// VIEW: CRUD USERS (ADMIN)
// ==========================================
async function loadUsers(container) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>`;
    const res = await fetch(`${API_BASE}/users`);
    const data = await res.json();

    container.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-base text-slate-800">Daftar Pengguna Aplikasi</h3>
                <button onclick="openModalUser()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow">
                    <i class="fa-solid fa-plus"></i>
                    <span>Tambah Pengguna</span>
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                    <thead class="bg-slate-50 uppercase font-bold text-slate-500 border-b">
                        <tr>
                            <th class="p-3">Nama Lengkap</th>
                            <th class="p-3">Username</th>
                            <th class="p-3">Role Hak Akses</th>
                            <th class="p-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${data.data.map(u => `
                            <tr>
                                <td class="p-3 font-bold text-slate-800">${u.nama_lengkap}</td>
                                <td class="p-3 font-mono">${u.username}</td>
                                <td class="p-3">
                                    <span class="px-2 py-0.5 rounded font-bold uppercase ${
                                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                                        u.role === 'petugas' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                                    }">${u.role}</span>
                                </td>
                                <td class="p-3 flex gap-2">
                                    <button onclick='openModalUser(${JSON.stringify(u)})' class="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold border border-amber-200">Edit</button>
                                    ${u.username !== 'admin' ? `<button onclick="deleteUser(${u.id})" class="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold border border-rose-200">Hapus</button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function openModalUser(user = null) {
    const isEdit = !!user;
    showModal(`
        <h3 class="font-bold text-lg text-slate-800 mb-4">${isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
        <form id="form-user-modal" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Lengkap</label>
                <input type="text" id="modal-nama" required value="${isEdit ? user.nama_lengkap : ''}" class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Username</label>
                <input type="text" id="modal-username" required value="${isEdit ? user.username : ''}" class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Password ${isEdit ? '(Kosongkan jika tidak diubah)' : ''}</label>
                <input type="password" id="modal-password" ${isEdit ? '' : 'required'} class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Role / Hak Akses</label>
                <select id="modal-role" class="w-full px-3 py-2 border rounded-xl font-bold">
                    <option value="admin" ${isEdit && user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="petugas" ${isEdit && user.role === 'petugas' ? 'selected' : ''}>Petugas</option>
                    <option value="owner" ${isEdit && user.role === 'owner' ? 'selected' : ''}>Owner</option>
                </select>
            </div>
            <div class="flex justify-end gap-2 pt-3">
                <button type="button" onclick="closeModal()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Batal</button>
                <button type="submit" class="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">Simpan</button>
            </div>
        </form>
    `);

    document.getElementById('form-user-modal').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            nama_lengkap: document.getElementById('modal-nama').value,
            username: document.getElementById('modal-username').value,
            password: document.getElementById('modal-password').value,
            role: document.getElementById('modal-role').value,
            adminUser: currentUser.username
        };

        const res = await fetch(`${API_BASE}/users${isEdit ? `/${user.id}` : ''}`, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (result.success) {
            closeModal();
            switchTab('users');
        } else {
            alert(result.message);
        }
    });
}

async function deleteUser(id) {
    if (confirm('Yakin ingin menghapus user ini?')) {
        await fetch(`${API_BASE}/users/${id}?adminUser=${currentUser.username}`, { method: 'DELETE' });
        switchTab('users');
    }
}

// ==========================================
// VIEW: CRUD TARIF (ADMIN)
// ==========================================
async function loadTarif(container) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>`;
    const res = await fetch(`${API_BASE}/tarif`);
    const data = await res.json();

    container.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-base text-slate-800">Daftar Tarif Parkir Kendaraan</h3>
                <button onclick="openModalTarif()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow">
                    <i class="fa-solid fa-plus"></i>
                    <span>Tambah Tarif</span>
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                    <thead class="bg-slate-50 uppercase font-bold text-slate-500 border-b">
                        <tr>
                            <th class="p-3">Jenis Kendaraan</th>
                            <th class="p-3">Tarif / Jam</th>
                            <th class="p-3">Tarif Maksimal (Per Hari)</th>
                            <th class="p-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${data.data.map(t => `
                            <tr>
                                <td class="p-3 font-bold text-slate-800">${t.jenis_kendaraan}</td>
                                <td class="p-3 font-semibold text-emerald-600">${formatRupiah(t.tarif_per_jam)}</td>
                                <td class="p-3">${t.tarif_maksimal > 0 ? formatRupiah(t.tarif_maksimal) : 'Tidak ada batas'}</td>
                                <td class="p-3 flex gap-2">
                                    <button onclick='openModalTarif(${JSON.stringify(t)})' class="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold border border-amber-200">Edit</button>
                                    <button onclick="deleteTarif(${t.id})" class="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold border border-rose-200">Hapus</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function openModalTarif(tarif = null) {
    const isEdit = !!tarif;
    showModal(`
        <h3 class="font-bold text-lg text-slate-800 mb-4">${isEdit ? 'Edit Tarif Parkir' : 'Tambah Tarif Parkir'}</h3>
        <form id="form-tarif-modal" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Jenis Kendaraan</label>
                <input type="text" id="modal-jenis" required value="${isEdit ? tarif.jenis_kendaraan : ''}" placeholder="Contoh: Sepeda Listrik" class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Tarif Per Jam (Rp)</label>
                <input type="number" id="modal-perjam" required value="${isEdit ? tarif.tarif_per_jam : ''}" placeholder="Contoh: 3000" class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Tarif Maksimal Per Hari (Rp)</label>
                <input type="number" id="modal-maks" value="${isEdit ? tarif.tarif_maksimal : 0}" placeholder="0 jika tidak ada batas" class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div class="flex justify-end gap-2 pt-3">
                <button type="button" onclick="closeModal()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Batal</button>
                <button type="submit" class="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">Simpan</button>
            </div>
        </form>
    `);

    document.getElementById('form-tarif-modal').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            jenis_kendaraan: document.getElementById('modal-jenis').value,
            tarif_per_jam: parseInt(document.getElementById('modal-perjam').value),
            tarif_maksimal: parseInt(document.getElementById('modal-maks').value) || 0,
            adminUser: currentUser.username
        };

        const res = await fetch(`${API_BASE}/tarif${isEdit ? `/${tarif.id}` : ''}`, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (result.success) {
            closeModal();
            switchTab('tarif');
        } else {
            alert(result.message);
        }
    });
}

async function deleteTarif(id) {
    if (confirm('Yakin ingin menghapus tarif ini?')) {
        const res = await fetch(`${API_BASE}/tarif/${id}?adminUser=${currentUser.username}`, { method: 'DELETE' });
        const result = await res.json();
        if (!result.success) alert(result.message);
        switchTab('tarif');
    }
}

// ==========================================
// VIEW: CRUD AREA PARKIR (ADMIN)
// ==========================================
async function loadArea(container) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>`;
    const res = await fetch(`${API_BASE}/area`);
    const data = await res.json();

    container.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-base text-slate-800">Daftar Blok & Area Parkir</h3>
                <button onclick="openModalArea()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow">
                    <i class="fa-solid fa-plus"></i>
                    <span>Tambah Area</span>
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                    <thead class="bg-slate-50 uppercase font-bold text-slate-500 border-b">
                        <tr>
                            <th class="p-3">Kode Area</th>
                            <th class="p-3">Nama Area</th>
                            <th class="p-3">Kapasitas</th>
                            <th class="p-3">Terisi</th>
                            <th class="p-3">Status</th>
                            <th class="p-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${data.data.map(a => `
                            <tr>
                                <td class="p-3 font-mono font-bold text-indigo-600">${a.kode_area}</td>
                                <td class="p-3 font-bold text-slate-800">${a.nama_area}</td>
                                <td class="p-3">${a.kapasitas} Slot</td>
                                <td class="p-3 font-semibold text-amber-600">${a.terisi} Slot</td>
                                <td class="p-3">
                                    <span class="px-2 py-0.5 rounded font-bold ${a.terisi >= a.kapasitas ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
                                        ${a.terisi >= a.kapasitas ? 'PENUH' : 'TERSEDIA'}
                                    </span>
                                </td>
                                <td class="p-3 flex gap-2">
                                    <button onclick='openModalArea(${JSON.stringify(a)})' class="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold border border-amber-200">Edit</button>
                                    <button onclick="deleteArea(${a.id})" class="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold border border-rose-200">Hapus</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function openModalArea(area = null) {
    const isEdit = !!area;
    showModal(`
        <h3 class="font-bold text-lg text-slate-800 mb-4">${isEdit ? 'Edit Area Parkir' : 'Tambah Area Parkir'}</h3>
        <form id="form-area-modal" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Kode Area</label>
                <input type="text" id="modal-kode" required value="${isEdit ? area.kode_area : ''}" placeholder="Contoh: D1" class="w-full px-3 py-2 border rounded-xl uppercase font-mono">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Area</label>
                <input type="text" id="modal-namaarea" required value="${isEdit ? area.nama_area : ''}" placeholder="Contoh: Gedung Timur Lt. 2" class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Total Kapasitas Slot</label>
                <input type="number" id="modal-kapasitas" required value="${isEdit ? area.kapasitas : 50}" class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div class="flex justify-end gap-2 pt-3">
                <button type="button" onclick="closeModal()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Batal</button>
                <button type="submit" class="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">Simpan</button>
            </div>
        </form>
    `);

    document.getElementById('form-area-modal').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            kode_area: document.getElementById('modal-kode').value.toUpperCase(),
            nama_area: document.getElementById('modal-namaarea').value,
            kapasitas: parseInt(document.getElementById('modal-kapasitas').value),
            adminUser: currentUser.username
        };

        const res = await fetch(`${API_BASE}/area${isEdit ? `/${area.id}` : ''}`, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (result.success) {
            closeModal();
            switchTab('area');
        } else {
            alert(result.message);
        }
    });
}

async function deleteArea(id) {
    if (confirm('Yakin ingin menghapus area ini?')) {
        const res = await fetch(`${API_BASE}/area/${id}?adminUser=${currentUser.username}`, { method: 'DELETE' });
        const result = await res.json();
        if (!result.success) alert(result.message);
        switchTab('area');
    }
}

// ==========================================
// VIEW: CRUD KENDARAAN (ADMIN)
// ==========================================
async function loadKendaraan(container) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>`;
    const res = await fetch(`${API_BASE}/kendaraan`);
    const data = await res.json();

    container.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-base text-slate-800">Master Data Kendaraan Terdaftar</h3>
                <button onclick="openModalKendaraan()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow">
                    <i class="fa-solid fa-plus"></i>
                    <span>Tambah Kendaraan</span>
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                    <thead class="bg-slate-50 uppercase font-bold text-slate-500 border-b">
                        <tr>
                            <th class="p-3">Plat Nomor</th>
                            <th class="p-3">Jenis Kendaraan</th>
                            <th class="p-3">Nama Pemilik</th>
                            <th class="p-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${data.data.map(k => `
                            <tr>
                                <td class="p-3 font-mono font-bold text-slate-900">${k.plat_nomor}</td>
                                <td class="p-3">${k.jenis_kendaraan}</td>
                                <td class="p-3 font-semibold text-slate-700">${k.pemilik}</td>
                                <td class="p-3 flex gap-2">
                                    <button onclick='openModalKendaraan(${JSON.stringify(k)})' class="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold border border-amber-200">Edit</button>
                                    <button onclick="deleteKendaraan(${k.id})" class="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold border border-rose-200">Hapus</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function openModalKendaraan(k = null) {
    const isEdit = !!k;
    showModal(`
        <h3 class="font-bold text-lg text-slate-800 mb-4">${isEdit ? 'Edit Data Kendaraan' : 'Tambah Data Kendaraan'}</h3>
        <form id="form-kendaraan-modal" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Plat Nomor</label>
                <input type="text" id="modal-plat" required value="${isEdit ? k.plat_nomor : ''}" placeholder="B 1234 XYZ" class="w-full px-3 py-2 border rounded-xl uppercase font-mono">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Jenis Kendaraan</label>
                <input type="text" id="modal-jenis-k" required value="${isEdit ? k.jenis_kendaraan : ''}" placeholder="Motor / Mobil / Lainnya" class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Pemilik / Pengemudi</label>
                <input type="text" id="modal-pemilik" value="${isEdit ? k.pemilik : ''}" placeholder="Nama Pemilik" class="w-full px-3 py-2 border rounded-xl">
            </div>
            <div class="flex justify-end gap-2 pt-3">
                <button type="button" onclick="closeModal()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Batal</button>
                <button type="submit" class="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">Simpan</button>
            </div>
        </form>
    `);

    document.getElementById('form-kendaraan-modal').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            plat_nomor: document.getElementById('modal-plat').value.toUpperCase(),
            jenis_kendaraan: document.getElementById('modal-jenis-k').value,
            pemilik: document.getElementById('modal-pemilik').value,
            adminUser: currentUser.username
        };

        const res = await fetch(`${API_BASE}/kendaraan${isEdit ? `/${k.id}` : ''}`, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        if (result.success) {
            closeModal();
            switchTab('kendaraan');
        } else {
            alert(result.message);
        }
    });
}

async function deleteKendaraan(id) {
    if (confirm('Yakin ingin menghapus data kendaraan ini?')) {
        await fetch(`${API_BASE}/kendaraan/${id}?adminUser=${currentUser.username}`, { method: 'DELETE' });
        switchTab('kendaraan');
    }
}

// ==========================================
// VIEW: LOG AKTIVITAS (ADMIN)
// ==========================================
async function loadLogs(container) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>`;
    const res = await fetch(`${API_BASE}/logs`);
    const data = await res.json();

    container.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 class="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-clock-rotate-left text-indigo-600"></i>
                Audit Log Aktivitas Terakhir
            </h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                    <thead class="bg-slate-50 uppercase font-bold text-slate-500 border-b">
                        <tr>
                            <th class="p-3">Waktu</th>
                            <th class="p-3">Pengguna</th>
                            <th class="p-3">Aktivitas / Kejadian</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${data.data.map(l => `
                            <tr>
                                <td class="p-3 font-mono text-slate-500">${formatDateTime(l.waktu)}</td>
                                <td class="p-3 font-bold text-indigo-600">${l.username}</td>
                                <td class="p-3">${l.aktivitas}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==========================================
// VIEW: REKAP LAPORAN (OWNER & ADMIN)
// ==========================================
async function loadLaporan(container) {
    container.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
            <h3 class="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-filter text-indigo-600"></i>
                Filter Rekap Transaksi
            </h3>
            <form id="form-filter-laporan" class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Dari Tanggal</label>
                    <input type="date" id="lap-start" class="w-full px-3 py-2 border rounded-xl text-sm">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Sampai Tanggal</label>
                    <input type="date" id="lap-end" class="w-full px-3 py-2 border rounded-xl text-sm">
                </div>
                <div class="flex gap-2">
                    <button type="submit" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition">
                        Filter Laporan
                    </button>
                    <button type="button" onclick="printLaporanTabel()" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5">
                        <i class="fa-solid fa-print"></i>
                        <span>Cetak</span>
                    </button>
                </div>
            </form>
        </div>

        <div id="laporan-result-container">
            <!-- Data laporan dimuat di sini -->
        </div>
    `;

    document.getElementById('form-filter-laporan').addEventListener('submit', (e) => {
        e.preventDefault();
        const start = document.getElementById('lap-start').value;
        const end = document.getElementById('lap-end').value;
        fetchLaporanData(start, end);
    });

    // Default load all
    fetchLaporanData('', '');
}

async function fetchLaporanData(start, end) {
    const resBox = document.getElementById('laporan-result-container');
    resBox.innerHTML = `<div class="p-8 text-center text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>`;

    let url = `${API_BASE}/laporan`;
    if (start && end) url += `?start_date=${start}&end_date=${end}`;

    const res = await fetch(url);
    const result = await res.json();

    resBox.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div class="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
                <span class="text-xs font-bold text-indigo-700 uppercase">Total Kendaraan Keluar Selesai</span>
                <h4 class="text-3xl font-extrabold text-indigo-950 mt-1">${result.total_kendaraan} Unit</h4>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                <span class="text-xs font-bold text-emerald-700 uppercase">Total Pendapatan Terkumpul</span>
                <h4 class="text-3xl font-extrabold text-emerald-950 mt-1">${formatRupiah(result.total_pendapatan)}</h4>
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" id="print-laporan-content">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                    <thead class="bg-slate-50 uppercase font-bold text-slate-500 border-b">
                        <tr>
                            <th class="p-3">Kode Tiket</th>
                            <th class="p-3">Plat Nomor</th>
                            <th class="p-3">Jenis Kendaraan</th>
                            <th class="p-3">Waktu Masuk</th>
                            <th class="p-3">Waktu Keluar</th>
                            <th class="p-3">Durasi</th>
                            <th class="p-3">Petugas</th>
                            <th class="p-3">Total Bayar</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${result.data.length === 0 ? '<tr><td colspan="8" class="p-4 text-center text-slate-400">Tidak ada data transaksi pada rentang waktu ini</td></tr>' : ''}
                        ${result.data.map(item => `
                            <tr>
                                <td class="p-3 font-mono font-bold text-indigo-600">${item.kode_tiket}</td>
                                <td class="p-3 font-mono font-bold text-slate-900">${item.plat_nomor}</td>
                                <td class="p-3">${item.jenis_kendaraan}</td>
                                <td class="p-3">${formatDateTime(item.waktu_masuk)}</td>
                                <td class="p-3">${formatDateTime(item.waktu_keluar)}</td>
                                <td class="p-3">${item.durasi_jam} Jam</td>
                                <td class="p-3">${item.petugas_keluar || '-'}</td>
                                <td class="p-3 font-bold text-emerald-600">${formatRupiah(item.total_bayar)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function printLaporanTabel() {
    const content = document.getElementById('print-laporan-content');
    if (!content) return;
    const printArea = document.getElementById('receipt-print-area');
    printArea.innerHTML = `
        <div style="padding: 20px;">
            <h2 style="text-align: center; margin-bottom: 5px;">REKAPITULASI LAPORAN TRANSAKSI PARKIR</h2>
            <p style="text-align: center; font-size: 11px; margin-bottom: 20px;">Dicetak oleh: ${currentUser.nama_lengkap} (${currentUser.role}) pada ${new Date().toLocaleString('id-ID')}</p>
            ${content.innerHTML}
        </div>
    `;
    window.print();
}

// ==========================================
// MODAL HELPER
// ==========================================
function showModal(contentHtml) {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    content.innerHTML = contentHtml;
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('modal-container');
    modal.classList.add('hidden');
}

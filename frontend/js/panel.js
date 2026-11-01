// ========================================================
// PANEL UTAMA (SEMUA ROLE, tanpa sidebar)
// Pojok kanan atas = Dashboard (kondisi sekarang, lantai parkir sesuai data)
// Pojok kiri bawah = Halaman kerja (Owner: Rekap, Petugas: Pos Gerbang, Admin: Data Master)
// ========================================================

// Judul tab browser tiap halaman.
const JUDUL = { dashboard: 'Dashboard', laporan: 'Rekap Transaksi', transaksi: 'Pos Gerbang' };

// Pola IIFE: variabel di dalam tertutup, yang bisa dipakai file lain hanya yang ada di return.
const Panel = (() => {
    const view = document.getElementById('owner-view');
    const page = document.getElementById('owner-page');
    const plane = document.getElementById('lot-plane');
    const cornerTR = document.getElementById('corner-tr');
    const cornerBL = document.getElementById('corner-bl');
    const userChip = document.getElementById('owner-user');
    const DWELL = 400;           // ms kursor harus diam di pojok
    const POJOK = 44;            // ukuran area pojok (px)
    const DEKAT = 170;           // jarak kursor ke pojok agar labelnya muncul (px)
    const REFRESH = 10000;       // dashboard diperbarui tiap 10 detik
    let halaman = null, timerRefresh = null, timerPojok = null, timerSambut = null, pojokAktif = null;

    // ---------- Pojok layar (hot corner) ----------
    // Cek kursor sedang di pojok mana. Hasilnya nama halaman tujuan, atau null.
    function pojokDari(x, y) {
        const w = view.clientWidth, h = view.clientHeight;
        if (x >= w - POJOK && y <= POJOK) return cornerTR.dataset.go;
        if (x <= POJOK && y >= h - POJOK) return cornerBL.dataset.go;
        return null;
    }

    // Label pojok baru melebar saat kursor mendekat, supaya tidak menutupi isi halaman
    function tandaiDekat(x, y) {
        const w = view.clientWidth, h = view.clientHeight;
        cornerTR.classList.toggle('dekat', x > w - DEKAT && y < DEKAT);
        cornerBL.classList.toggle('dekat', x < DEKAT && y > h - DEKAT);
        userChip.classList.toggle('dekat', x > w - DEKAT * 1.6 && y > h - DEKAT);
    }

    // Dijalankan tiap kursor bergerak. Halaman baru pindah kalau kursor diam di pojok selama DWELL,
    // jadi tidak pindah gara-gara kursor cuma lewat.
    function onMove(e) {
        // Parallax lantai parkir
        view.style.setProperty('--mx', (e.clientX / view.clientWidth * 2 - 1).toFixed(3));
        view.style.setProperty('--my', (e.clientY / view.clientHeight * 2 - 1).toFixed(3));

        tandaiDekat(e.clientX, e.clientY);
        if (view.querySelector('.pv')) return;      // sedang pratinjau cetak
        const p = pojokDari(e.clientX, e.clientY);
        if (p === pojokAktif) return;
        batalPojok();
        if (!p || p === halaman) return;
        pojokAktif = p;
        const el = view.querySelector(`.corner[data-go="${p}"]`);
        if (el) el.classList.add('isi');
        timerPojok = setTimeout(() => { batalPojok(); location.hash = `#/${p}`; }, DWELL);
    }

    // Batalkan hitungan kalau kursor keluar dari pojok.
    function batalPojok() {
        clearTimeout(timerPojok);
        pojokAktif = null;
        view.querySelectorAll('.corner.isi').forEach(c => c.classList.remove('isi'));
    }

    // ---------- Lantai parkir isometrik (sesuai data area) ----------
    // Acak urutan slot, tapi hasilnya selalu sama untuk seed yang sama,
    // supaya slot yang menyala tidak berpindah-pindah tiap data diperbarui.
    function urutanAcak(n, seed) {
        const idx = [...Array(n).keys()];
        let s = seed * 9301 + 49297;
        for (let i = n - 1; i > 0; i--) {
            s = (s * 9301 + 49297) % 233280;
            const j = Math.floor(s / 233280 * (i + 1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        return idx;
    }

    // Gambar lantai parkir sesuai data. Jumlah kotak menyala = kendaraan yang parkir.
    // Area sangat besar (di atas 120 slot) digambar 1 kotak mewakili beberapa slot.
    function gambarLot(areas) {
        plane.innerHTML = areas.map((a, k) => {
            const per = Math.max(1, Math.ceil(a.kapasitas / 120));
            const kotak = Math.ceil(a.kapasitas / per);
            let nyala = Math.min(kotak, Math.round(a.terisi / per));
            if (a.terisi > 0 && nyala === 0) nyala = 1;
            const penuh = a.terisi >= a.kapasitas;
            const urut = urutanAcak(kotak, a.id || k + 1);
            const on = new Set(urut.slice(0, nyala));
            return `<div class="lot ${penuh ? 'penuh' : ''}" style="--cols:${Math.min(10, kotak)}">
                <div class="lot-label">
                    <b>${UI.esc(a.kode_area)}</b>
                    <span>${a.terisi}/${a.kapasitas}${penuh ? ' · PENUH' : ''}</span>
                    ${per > 1 ? `<small>1 kotak = ${per} slot</small>` : ''}
                </div>
                <div class="lot-grid">${[...Array(kotak).keys()].map(i =>
                    `<i class="${on.has(i) ? 'on' : ''}" style="--d:${Math.min(i, 60)}"></i>`).join('')}</div>
            </div>`;
        }).join('') + '<span class="lot-streak s1"></span><span class="lot-streak s2"></span>';
    }

    // ---------- Halaman Dashboard (Dipakai Owner, Petugas, & Admin) ----------
    async function dashboard() {
        // Tombol pintas ke halaman kerja, berbeda untuk tiap role.
        const lanjut = {
            owner: ['#/laporan', 'Buka rekap transaksi'],
            petugas: ['#/transaksi', 'Buka pos gerbang'],
            admin: ['#/area', 'Buka data master']
        }[Auth.user.role];

        page.innerHTML = `
            <section class="o-dash">
                <p class="o-eyebrow"><span class="live-dot"></span> Kondisi sekarang</p>
                <h1 class="o-big" id="o-aktif">–</h1>
                <p class="o-sub">kendaraan sedang parkir</p>
                <div class="o-meter"><span id="o-meter-isi"></span></div>
                <p class="o-sub small" id="o-kap">&nbsp;</p>
                <div class="o-areas" id="o-areas"></div>
                <div class="o-legend">
                    <span><i class="lg-off"></i> Kosong</span>
                    <span><i class="lg-on"></i> Terisi</span>
                    <span><i class="lg-full"></i> Area penuh</span>
                </div>
                <a class="o-btn o-lanjut" href="${lanjut[0]}">${lanjut[1]} →</a>
                <p class="o-note" id="o-update">Memuat data...</p>
            </section>`;

        // Ambil data terbaru lalu perbarui angka dan lantai parkir. Dijalankan ulang tiap 10 detik.
        async function muat() {
            try {
                const [s, a] = await Promise.all([api.get('/stats'), api.get('/area')]);
                if (halaman !== 'dashboard') return;
                const persen = s.kapasitas_total ? Math.round(s.kapasitas_terisi / s.kapasitas_total * 100) : 0;
                page.querySelector('#o-aktif').textContent = s.parkir_aktif;
                page.querySelector('#o-kap').textContent = `${s.kapasitas_terisi} dari ${s.kapasitas_total} slot terisi · ${persen}%`;
                page.querySelector('#o-meter-isi').style.width = `${Math.min(100, persen)}%`;
                page.querySelector('#o-areas').innerHTML = a.data.map(x => {
                    const p = x.kapasitas ? Math.round(x.terisi / x.kapasitas * 100) : 0;
                    return `<div class="o-area ${p >= 100 ? 'penuh' : ''}">
                        <b>${UI.esc(x.nama_area)}</b>
                        <span>${x.terisi}/${x.kapasitas}</span>
                        <em>${p}%</em>
                    </div>`;
                }).join('');
                gambarLot(a.data);
                page.querySelector('#o-update').textContent =
                    `Diperbarui ${new Date().toLocaleTimeString('id-ID')} · otomatis tiap 10 detik`;
            } catch (err) {
                page.querySelector('#o-update').textContent = err.message;
            }
        }

        await muat();
        ulang(muat, REFRESH);
    }

    // Jalankan ulang berkala, berhenti saat tab browser tidak dilihat
    function ulang(fn, ms) {
        clearInterval(timerRefresh);
        timerRefresh = setInterval(() => { if (!document.hidden) fn(); }, ms);
    }

    // ---------- Navigasi ----------
    // Pindah halaman. id = nama halaman dari alamat, contoh 'laporan'.
    function buka(id) {
        clearInterval(timerRefresh);
        batalPojok();
        halaman = id;
        view.dataset.halaman = id === 'dashboard' ? 'dashboard' : 'laporan';   // selain dashboard, lantai parkir jadi latar redup
        const pojokKerja = cornerBL.dataset.go;
        cornerTR.classList.toggle('di-sini', id === 'dashboard');
        cornerBL.classList.toggle('di-sini', id === pojokKerja || (Auth.user.role === 'admin' && id !== 'dashboard'));
        document.title = `${JUDUL[id] || 'Data Master'} · Parkir Bebas`;
        page.scrollTop = 0;
        page.classList.remove('masuk');
        void page.offsetWidth;
        page.classList.add('masuk');

        if (id === 'dashboard') return dashboard();
        if (id === 'laporan') return Pages.rekap(page);
        if (id === 'transaksi') return Pages.transaksi(page);
        return Pages.master(page, id);
    }

    view.addEventListener('pointermove', onMove);
    view.addEventListener('pointerleave', batalPojok);

    return {
        view, buka, ulang, gambarLot,
        get halaman() { return halaman; },
        // Dipanggil setelah login. Mengisi nama user dan mengatur pojok kiri bawah sesuai role.
        show(onLogout) {
            const role = Auth.user.role;
            view.hidden = false;
            view.dataset.role = role;
            document.getElementById('owner-name').textContent = Auth.user.nama_lengkap;
            document.getElementById('owner-inisial').textContent = Auth.user.nama_lengkap.trim()[0].toUpperCase();
            document.getElementById('owner-logout').onclick = onLogout;

            const [go, judul, sub] = {
                owner: ['laporan', 'Rekap', 'analisis transaksi'],
                petugas: ['transaksi', 'Pos Gerbang', 'kendaraan masuk & keluar'],
                admin: ['area', 'Data Master', 'area, tarif, user, log']
            }[role];
            cornerBL.dataset.go = go;
            cornerBL.href = `#/${go}`;
            document.getElementById('corner-bl-b').textContent = judul;
            document.getElementById('corner-bl-s').textContent = sub;

            // Label pojok tampil sebentar setelah login, supaya pengguna tahu tempatnya
            view.classList.add('sambut');
            clearTimeout(timerSambut);
            timerSambut = setTimeout(() => view.classList.remove('sambut'), 4500);
        },
        // Tutup panel dan hentikan pembaruan otomatis.
        hide() {
            view.hidden = true;
            clearInterval(timerRefresh);
            halaman = null;
            page.innerHTML = '';
            view.querySelector('.pv')?.remove();
        }
    };
})();

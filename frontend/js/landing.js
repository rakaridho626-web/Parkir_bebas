// ========================================================
// LANDING PAGE + LOGIN EMBUN DI UJUNG LAYAR
// Kursor ke ujung atas = Owner, pojok kiri bawah = Petugas, pojok kanan bawah = Admin.
// Tanpa blok/pil tombol kaku & tanpa judul.
// ========================================================

// Tiga pintu masuk: nama role, label, dan posisi di layar untuk pesan error.
const PINTU = [
    { role: 'owner', label: 'Owner', posisi: 'ujung atas' },
    { role: 'petugas', label: 'Petugas', posisi: 'ujung kiri bawah' },
    { role: 'admin', label: 'Admin', posisi: 'ujung kanan bawah' }
];

const Landing = (() => {
    const view = document.getElementById('login-view');
    const canvas = document.getElementById('scene');
    let zona = null;
    let onLogin = () => {};

    const portal = role => view.querySelector(`.portal[data-role="${role}"]`);

    // Bikin form login untuk tiap pintu.
    function bangun() {
        view.querySelector('#portals').innerHTML = PINTU.map(p => `
            <section class="portal portal-${p.role}" data-role="${p.role}">
                <span class="embun-tepi" aria-hidden="true"></span>
                <span class="portal-embun" aria-hidden="true"></span>
                <span class="portal-glow" aria-hidden="true"></span>
                <form class="portal-card" autocomplete="on" novalidate>
                    <p class="embun-role">${p.label}</p>
                    <label><span>Username</span><input name="username" placeholder="ketik username..." autocomplete="username" required></label>
                    <label><span>Password</span><input name="password" type="password" placeholder="ketik password..." autocomplete="current-password" required></label>
                    <p class="form-error" hidden></p>
                    <button class="embun-submit" type="submit">Masuk ${p.label} →</button>
                </form>
            </section>`).join('');
    }

    // Aktifkan satu pintu: form muncul, kamera 3D ikut berpindah. z = null berarti tidak ada yang aktif.
    function setZona(z) {
        if (z === zona) return;
        zona = z;
        view.dataset.zona = z || '';
        view.querySelectorAll('.portal').forEach(el => el.classList.toggle('aktif', el.dataset.role === z));
        Scene.setZona(z);
    }

    // Zona dari posisi kursor: muncul saat kursor mendekati ujung layar (atas, kiri bawah, kanan bawah)
    function zonaDari(x, y) {
        const w = view.clientWidth, h = view.clientHeight;
        const dx = x - w / 2, dy = y - h / 2;
        if (Math.hypot(dx / (w / 2), dy / (h / 2)) < 0.32) return null;   // area tengah = bersih (netral)
        const a = Math.atan2(dy, dx) * 180 / Math.PI;
        if (a > -150 && a < -30) return 'owner';
        if (a >= -30 && a <= 90) return 'admin';
        return 'petugas';
    }

    // Form yang sedang diisi tidak boleh tertutup karena kursor bergeser
    function terkunci() {
        if (!zona) return false;
        const form = portal(zona).querySelector('form');
        return form.contains(document.activeElement) || [...form.elements].some(el => el.value && el.tagName === 'INPUT');
    }

    // Kosongkan semua form dan hilangkan pesan error.
    function reset() {
        view.querySelectorAll('.portal form').forEach(f => {
            f.reset();
            f.querySelector('.form-error').hidden = true;
        });
        document.activeElement?.blur();
    }

    // Dijalankan tiap kursor bergerak: gerakkan kamera lalu tentukan pintu yang aktif.
    function onMove(e) {
        Scene.setMouse(e.clientX / view.clientWidth * 2 - 1, e.clientY / view.clientHeight * 2 - 1);
        if (e.target.closest('.portal-card') || terkunci()) return;
        setZona(zonaDari(e.clientX, e.clientY));
    }

    // Embun di kaca bereaksi lembut terhadap kursor
    function tilt(e) {
        const card = e.currentTarget;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
        card.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
        card.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
    }

    // Kirim login ke backend. Kalau akunnya benar tapi pintunya salah, tolak dan beri tahu pintu yang benar.
    async function login(e, role) {
        e.preventDefault();
        const form = e.target;
        const errorEl = form.querySelector('.form-error');
        const btn = form.querySelector('[type=submit]');
        if (!form.reportValidity()) return;
        errorEl.hidden = true;
        btn.disabled = true;
        try {
            const res = await api.post('/auth/login', {
                username: form.username.value.trim(),
                password: form.password.value
            });
            if (res.user.role !== role) {
                const p = PINTU.find(x => x.role === res.user.role);
                throw new Error(`Akun ini terdaftar sebagai ${p ? p.label : res.user.role}. Silakan arahkan kursor ke ${p ? p.posisi : ''}.`);
            }
            Auth.save(res.user);
            reset();
            setZona(null);
            onLogin();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.hidden = false;
        } finally {
            btn.disabled = false;
        }
    }

    // Pasang semua event. callback = fungsi yang dijalankan setelah login berhasil.
    function init(callback) {
        onLogin = callback;
        bangun();
        view.addEventListener('pointermove', onMove);
        view.addEventListener('pointerdown', e => {
            if (e.target.closest('.portal-card')) return;
            reset();
            setZona(zonaDari(e.clientX, e.clientY));
        });
        document.addEventListener('keydown', e => {
            if (view.hidden) return;
            if (e.key === 'Escape') { reset(); setZona(null); return; }
            // Tanpa mouse: panah atas = Owner, kiri = Petugas, kanan = Admin
            const role = { ArrowUp: 'owner', ArrowLeft: 'petugas', ArrowRight: 'admin' }[e.key];
            if (role && !terkunci()) {
                setZona(role);
                setTimeout(() => portal(role).querySelector('input').focus(), 60);
            }
        });

        PINTU.forEach(p => {
            const el = portal(p.role);
            const card = el.querySelector('.portal-card');
            card.addEventListener('pointermove', tilt);
            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
            });
            card.addEventListener('submit', e => login(e, p.role));
        });
    }

    return {
        init,
        // Tampilkan landing dan nyalakan latar 3D. Kalau WebGL tidak ada, pakai latar cadangan.
        show() {
            view.hidden = false;
            setZona(null);
            if (!Scene.start(canvas)) view.classList.add('no-webgl');
        },
        // Sembunyikan landing dan hentikan animasi supaya hemat CPU.
        hide() {
            view.hidden = true;
            Scene.stop();
        }
    };
})();

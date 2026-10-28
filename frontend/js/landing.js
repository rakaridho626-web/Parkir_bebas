// ========================================================
// LANDING PAGE + LOGIN PER ROLE
// Kursor ke atas = Owner, kiri bawah = Petugas, kanan bawah = Admin.
// ========================================================

const PINTU = [
    { role: 'owner', label: 'Owner', arah: '↑', posisi: 'atas', desc: 'Pantau rekap transaksi dan pendapatan parkir.' },
    { role: 'petugas', label: 'Petugas', arah: '↙', posisi: 'kiri bawah', desc: 'Catat kendaraan masuk dan keluar, cetak karcis & struk.' },
    { role: 'admin', label: 'Admin', arah: '↘', posisi: 'kanan bawah', desc: 'Kelola user, tarif, area, kendaraan, dan log aktivitas.' }
];

const Landing = (() => {
    const view = document.getElementById('login-view');
    const canvas = document.getElementById('scene');
    let zona = null;
    let onLogin = () => {};

    const portal = role => view.querySelector(`.portal[data-role="${role}"]`);

    function bangun() {
        view.querySelector('#portals').innerHTML = PINTU.map(p => `
            <section class="portal portal-${p.role}" data-role="${p.role}">
                <button class="portal-tag" type="button">
                    <span class="portal-arah">${p.arah}</span>
                    <span><b>${p.label}</b><small>${p.posisi}</small></span>
                </button>
                <form class="portal-card" autocomplete="on" novalidate>
                    <span class="portal-glow"></span>
                    <p class="eyebrow">Masuk sebagai</p>
                    <h2>${p.label}</h2>
                    <p class="portal-desc">${p.desc}</p>
                    <label>Username <input name="username" autocomplete="username" required></label>
                    <label>Password <input name="password" type="password" autocomplete="current-password" required></label>
                    <p class="form-error" hidden></p>
                    <button class="btn btn-glow btn-block" type="submit">Masuk ${p.label} →</button>
                </form>
            </section>`).join('');
    }

    function setZona(z) {
        if (z === zona) return;
        zona = z;
        view.dataset.zona = z || '';
        view.querySelectorAll('.portal').forEach(el => el.classList.toggle('aktif', el.dataset.role === z));
        Scene.setZona(z);
    }

    // Zona dari posisi kursor: dibagi 3 sektor 120° dari tengah layar
    function zonaDari(x, y) {
        const w = view.clientWidth, h = view.clientHeight;
        const dx = x - w / 2, dy = y - h / 2;
        if (Math.hypot(dx / (w / 2), dy / (h / 2)) < 0.22) return null;   // area tengah = netral
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

    function reset() {
        view.querySelectorAll('.portal form').forEach(f => {
            f.reset();
            f.querySelector('.form-error').hidden = true;
        });
        document.activeElement?.blur();
    }

    function onMove(e) {
        Scene.setMouse(e.clientX / view.clientWidth * 2 - 1, e.clientY / view.clientHeight * 2 - 1);
        if (e.target.closest('.portal-card') || terkunci()) return;
        setZona(zonaDari(e.clientX, e.clientY));
    }

    // Kartu login miring 3D mengikuti kursor
    function tilt(e) {
        const card = e.currentTarget;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--rx', `${(-py * 10).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(px * 12).toFixed(2)}deg`);
        card.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
        card.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
    }

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
                throw new Error(`Akun ini terdaftar sebagai ${p ? p.label : res.user.role}. Silakan masuk lewat sisi ${p ? p.label : ''} (${p ? p.posisi : ''}).`);
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

    function init(callback) {
        onLogin = callback;
        bangun();
        view.addEventListener('pointermove', onMove);
        view.addEventListener('pointerdown', e => {
            if (e.target.closest('.portal')) return;
            reset();                                   // klik area kosong = batal
            setZona(zonaDari(e.clientX, e.clientY));
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !view.hidden) { reset(); setZona(null); }
        });

        PINTU.forEach(p => {
            const el = portal(p.role);
            el.querySelector('.portal-tag').addEventListener('click', () => {
                reset();
                setZona(p.role);
                el.querySelector('input').focus();
            });
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
        show() {
            view.hidden = false;
            setZona(null);
            if (!Scene.start(canvas)) view.classList.add('no-webgl');
        },
        hide() {
            view.hidden = true;
            Scene.stop();
        }
    };
})();

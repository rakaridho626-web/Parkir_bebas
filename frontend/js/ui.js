// ========================================================
// FUNGSI BANTU TAMPILAN: format, ikon, toast, modal, form, cetak
// ========================================================

const Pages = {};

const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    car: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><path d="M5 11h14"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h4M7 11h10"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 16v-4M13 16V8M18 16v-7"/>',
    logout: '<path d="M14 4h5v16h-5"/><path d="M9 8l-4 4 4 4"/><path d="M5 12h11"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
};

const UI = {
    icon(name) {
        return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    },

    // Cegah teks dari database dibaca sebagai HTML
    esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    },

    rupiah(n) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', maximumFractionDigits: 0
        }).format(Number(n) || 0);
    },

    tanggal(value) {
        if (!value) return '-';
        return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    },

    // Lama parkir dari waktu masuk sampai sekarang, contoh "2j 15m"
    lama(dari) {
        const menit = Math.max(0, Math.floor((Date.now() - new Date(dari)) / 60000));
        const jam = Math.floor(menit / 60);
        return jam ? `${jam}j ${menit % 60}m` : `${menit}m`;
    },

    // Tanggal hari ini format YYYY-MM-DD (waktu lokal)
    hariIni(offsetHari = 0) {
        const d = new Date();
        d.setDate(d.getDate() + offsetHari);
        return d.toLocaleDateString('sv-SE');
    },

    toast(message, type = 'ok') {
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = message;
        document.getElementById('toast-root').appendChild(el);
        setTimeout(() => el.classList.add('hide'), 2800);
        setTimeout(() => el.remove(), 3200);
    },

    // Modal umum. Mengembalikan elemen modal + fungsi close.
    modal({ title, body, footer = '', size = '', onClose }) {
        const root = document.getElementById('modal-root');
        const wrap = document.createElement('div');
        wrap.className = 'modal-wrap';
        wrap.innerHTML = `
            <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${UI.esc(title)}">
                <div class="modal-head">
                    <h3>${UI.esc(title)}</h3>
                    <button class="icon-btn" data-close type="button" aria-label="Tutup">${UI.icon('x')}</button>
                </div>
                <div class="modal-body">${body}</div>
                ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
            </div>`;
        root.appendChild(wrap);

        const onKey = e => { if (e.key === 'Escape') close(); };
        function close() {
            document.removeEventListener('keydown', onKey);
            wrap.remove();
            if (onClose) onClose();
        }
        wrap.addEventListener('click', e => {
            if (e.target === wrap || e.target.closest('[data-close]')) close();
        });
        document.addEventListener('keydown', onKey);
        return { el: wrap, close };
    },

    confirm(message, okLabel = 'Hapus') {
        return new Promise(resolve => {
            let jawab = false;
            const m = UI.modal({
                title: 'Konfirmasi',
                onClose: () => resolve(jawab),
                body: `<p>${UI.esc(message)}</p>`,
                footer: `<button class="btn" data-close type="button">Batal</button>
                         <button class="btn btn-danger" data-ok type="button">${UI.esc(okLabel)}</button>`
            });
            m.el.querySelector('[data-ok]').addEventListener('click', () => { jawab = true; m.close(); });
        });
    },

    // Bikin input form dari daftar field (array)
    field(f, value) {
        const v = value ?? '';
        const req = f.required ? 'required' : '';
        const extra = `${req} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.placeholder ? `placeholder="${UI.esc(f.placeholder)}"` : ''}`;
        let input;
        if (f.type === 'select') {
            input = `<select name="${f.name}" ${req}>
                <option value="">— Pilih —</option>
                ${f.options.map(o => `<option value="${UI.esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${UI.esc(o.label)}</option>`).join('')}
            </select>`;
        } else {
            input = `<input name="${f.name}" type="${f.type || 'text'}" value="${UI.esc(v)}" ${extra} ${f.upper ? 'class="upper"' : ''} autocomplete="off">`;
        }
        return `<label>${UI.esc(f.label)}${input}${f.hint ? `<small class="muted">${UI.esc(f.hint)}</small>` : ''}</label>`;
    },

    // Modal berisi form. onSubmit(values) boleh async; kalau error, pesan tampil di form.
    formModal({ title, fields, data = {}, submitLabel = 'Simpan', onSubmit }) {
        const m = UI.modal({
            title,
            body: `<form class="form" id="modal-form" novalidate>
                    ${fields.map(f => UI.field(f, data[f.name])).join('')}
                    <p class="form-error" hidden></p>
                   </form>`,
            footer: `<button class="btn" data-close type="button">Batal</button>
                     <button class="btn btn-primary" type="submit" form="modal-form">${UI.esc(submitLabel)}</button>`
        });
        const form = m.el.querySelector('form');
        const errorEl = form.querySelector('.form-error');
        form.querySelector('input, select')?.focus();

        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!form.reportValidity()) return;
            const values = {};
            fields.forEach(f => {
                let val = form.elements[f.name].value.trim();
                if (f.type === 'number') val = Number(val);
                if (f.upper) val = val.toUpperCase();
                values[f.name] = val;
            });
            const btn = m.el.querySelector('[type=submit]');
            btn.disabled = true;
            try {
                await onSubmit(values);
                m.close();
            } catch (err) {
                errorEl.textContent = err.message;
                errorEl.hidden = false;
                btn.disabled = false;
            }
        });
        return m;
    },

    // Cetak isi HTML tertentu saja (struk / laporan)
    print(html) {
        const area = document.getElementById('print-area');
        area.innerHTML = html;
        document.body.classList.add('printing');
        const selesai = () => {
            document.body.classList.remove('printing');
            area.innerHTML = '';
        };
        window.addEventListener('afterprint', selesai, { once: true });
        window.print();
    },

    loading(el) {
        el.innerHTML = '<div class="empty"><span class="spinner"></span> Memuat data...</div>';
    },

    error(el, err) {
        el.innerHTML = `<div class="empty error-box">${UI.esc(err.message)}</div>`;
    },

    // Generator urutan slot deterministik agar kotak 3D yang menyala konsisten
    urutanSlot(n, seed) {
        const idx = [...Array(n).keys()];
        let s = seed * 9301 + 49297;
        for (let i = n - 1; i > 0; i--) {
            s = (s * 9301 + 49297) % 233280;
            const j = Math.floor(s / 233280 * (i + 1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        return idx;
    },

    // Visualisasi Panggung Parkir Isometrik 3D (dipakai di Dashboard, Transaksi Petugas, & Area Admin)
    lot3D(areas, { interaktif = false, dipilih = '' } = {}) {
        if (!areas || !areas.length) return '<div class="empty">Belum ada area parkir.</div>';
        return `
            <div class="stage3d-wrap">
                <div class="stage3d-head">
                    <div>
                        <span class="eyebrow-sm">DIGITAL TWIN · 3D ISOMETRIK</span>
                        <h4>Peta Ruang Slot Parkir Real-Time</h4>
                    </div>
                    <div class="o-legend">
                        <span><i class="lg-off"></i> Kosong</span>
                        <span><i class="lg-on"></i> Terisi</span>
                        <span><i class="lg-full"></i> Penuh</span>
                        ${interaktif ? '<span class="stage3d-hint">· Klik dek area untuk memilih</span>' : '<span class="stage3d-hint">· Gerakkan kursor untuk memutar 3D</span>'}
                    </div>
                </div>
                <div class="stage3d-viewport" data-stage3d>
                    <div class="stage3d-tilt">
                        <div class="lot-plane stage3d-plane">
                            ${areas.map((a, k) => {
                                const per = Math.max(1, Math.ceil(a.kapasitas / 60));
                                const kotak = Math.max(1, Math.ceil(a.kapasitas / per));
                                let nyala = Math.min(kotak, Math.round(a.terisi / per));
                                if (a.terisi > 0 && nyala === 0) nyala = 1;
                                const penuh = a.terisi >= a.kapasitas;
                                const aktif = String(a.id) === String(dipilih);
                                const urut = UI.urutanSlot(kotak, a.id || k + 1);
                                const on = new Set(urut.slice(0, nyala));
                                return `<div class="lot ${penuh ? 'penuh' : ''} ${interaktif ? 'lot-klik' : ''} ${aktif ? 'lot-dipilih' : ''}"
                                             data-pilih-area="${a.id}" data-penuh="${penuh ? '1' : '0'}"
                                             style="--cols:${Math.min(8, kotak)}">
                                    <div class="lot-label">
                                        <b>${UI.esc(a.kode_area)}</b>
                                        <span>${UI.esc(a.nama_area)} · ${a.terisi}/${a.kapasitas}${penuh ? ' PENUH' : ''}</span>
                                        ${per > 1 ? `<small>1 balok = ${per} slot</small>` : ''}
                                    </div>
                                    <div class="lot-grid">${[...Array(kotak).keys()].map(i =>
                                        `<i class="${on.has(i) ? 'on' : ''}" style="--d:${Math.min(i, 45)}"></i>`).join('')}</div>
                                </div>`;
                            }).join('')}
                            <span class="lot-scan"></span>
                            <span class="lot-streak s1"></span>
                            <span class="lot-streak s2"></span>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    // Aktifkan interaksi putar kursor pada elemen [data-stage3d]
    pasangStage3D(root, onPilihArea) {
        const vp = root.querySelector('[data-stage3d]');
        if (!vp) return;
        vp.addEventListener('pointermove', e => {
            const r = vp.getBoundingClientRect();
            const mx = ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3);
            const my = ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3);
            vp.style.setProperty('--mx', mx);
            vp.style.setProperty('--my', my);
        });
        vp.addEventListener('pointerleave', () => {
            vp.style.setProperty('--mx', '0');
            vp.style.setProperty('--my', '0');
        });
        if (onPilihArea) {
            vp.addEventListener('click', e => {
                const lot = e.target.closest('[data-pilih-area]');
                if (!lot || lot.dataset.penuh === '1') return;
                vp.querySelectorAll('.lot').forEach(x => x.classList.toggle('lot-dipilih', x === lot));
                onPilihArea(lot.dataset.pilihArea);
            });
        }
    }
};

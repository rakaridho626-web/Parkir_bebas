// ========================================================
// KARCIS & STRUK: template thermal + layar pratinjau cetak
// ========================================================

const Struk = {
    // Satu baris struk: label di kiri, nilai di kanan.
    baris(label, nilai) {
        return `<div class="struk-row"><span>${label}</span><b>${UI.esc(nilai)}</b></div>`;
    },

    // Karcis saat kendaraan masuk. Nama petugas memakai user yang login, karena API masuk tidak mengirimnya.
    karcis(t) {
        return `<div class="struk">
            <div class="struk-head"><b>PARKIR BEBAS</b><small>KARCIS MASUK</small></div>
            <div class="struk-kode">${UI.esc(t.kode_tiket)}</div>
            ${this.baris('Plat Nomor', t.plat_nomor)}
            ${this.baris('Jenis', UI.kapital(t.jenis_kendaraan))}
            ${this.baris('Area', t.nama_area)}
            ${this.baris('Masuk', UI.tanggal(t.waktu_masuk))}
            ${this.baris('Tarif', `${UI.rupiah(t.tarif_per_jam)}/jam`)}
            ${this.baris('Petugas', t.petugas_masuk || Auth.user.nama_lengkap)}
            <p class="struk-foot">Simpan karcis ini.<br>Kehilangan karcis menjadi tanggung jawab pemilik.</p>
        </div>`;
    },

    // Struk saat pembayaran selesai.
    bayar(s) {
        return `<div class="struk">
            <div class="struk-head"><b>PARKIR BEBAS</b><small>STRUK PEMBAYARAN</small></div>
            <div class="struk-kode">${UI.esc(s.kode_tiket)}</div>
            ${this.baris('Plat Nomor', s.plat_nomor)}
            ${this.baris('Jenis', UI.kapital(s.jenis_kendaraan))}
            ${this.baris('Area', s.nama_area)}
            ${this.baris('Masuk', UI.tanggal(s.waktu_masuk))}
            ${this.baris('Keluar', UI.tanggal(s.waktu_keluar))}
            ${this.baris('Durasi', `${s.durasi_jam} jam`)}
            ${this.baris('Tarif', `${UI.rupiah(s.tarif_per_jam)}/jam`)}
            <div class="struk-total"><span>TOTAL</span><b>${UI.rupiah(s.total_bayar)}</b></div>
            ${this.baris('Petugas', s.petugas_keluar || Auth.user.nama_lengkap)}
            <p class="struk-foot">Terima kasih.<br>Hati-hati di jalan!</p>
        </div>`;
    },

    // Layar pratinjau: kertas melayang di kiri, ringkasan + tombol cetak di kanan
    tampil(judul, html, data) {
        const el = document.createElement('div');
        el.className = 'pv';
        el.innerHTML = `
            <div class="pv-meja pv-meja-struk">
                <div class="pv-kertas-wrap pv-wrap-struk">
                    <div class="pv-kertas pv-kertas-struk">${html}</div>
                </div>
            </div>
            <aside class="pv-panel">
                <p class="o-eyebrow">Pratinjau cetak</p>
                <h2>${UI.esc(judul)}</h2>
                <p class="pv-periode">${UI.esc(data.kode_tiket)}</p>
                <dl class="pv-info">
                    <dt>Plat Nomor</dt><dd>${UI.esc(data.plat_nomor)}</dd>
                    <dt>Jenis</dt><dd>${UI.esc(UI.kapital(data.jenis_kendaraan))}</dd>
                    <dt>Area</dt><dd>${UI.esc(data.nama_area)}</dd>
                    <dt>Kertas</dt><dd>Thermal 72 mm</dd>
                </dl>
                <button class="btn-glow pv-cetak" type="button" id="pv-cetak">${UI.icon('print')} Cetak sekarang</button>
                <button class="pv-batal" type="button" id="pv-batal">Tutup</button>
            </aside>`;
        Panel.view.appendChild(el);

        // Tutup lewat tombol atau Esc. Kertas miring mengikuti kursor.
        const wrap = el.querySelector('.pv-kertas-wrap');
        const onKey = e => { if (e.key === 'Escape') tutup(); };
        function tutup() {
            document.removeEventListener('keydown', onKey);
            el.classList.add('keluar');
            setTimeout(() => el.remove(), 250);
        }
        document.addEventListener('keydown', onKey);
        el.querySelector('.pv-meja').addEventListener('pointermove', e => {
            const r = e.currentTarget.getBoundingClientRect();
            wrap.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 20).toFixed(2)}deg`);
            wrap.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 14).toFixed(2)}deg`);
        });
        el.querySelector('#pv-batal').addEventListener('click', tutup);
        el.querySelector('#pv-cetak').addEventListener('click', () => UI.print(html));
        el.querySelector('#pv-cetak').focus();
    }
};

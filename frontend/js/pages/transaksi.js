// ========================================================
// HALAMAN TRANSAKSI (PETUGAS): kendaraan masuk, keluar, cetak struk
// ========================================================

// Template struk thermal (dipakai untuk karcis masuk & bukti bayar)
const Struk = {
    baris(label, nilai) {
        return `<div class="struk-row"><span>${label}</span><b>${UI.esc(nilai)}</b></div>`;
    },

    karcis(t) {
        return `<div class="struk">
            <div class="struk-head"><b>PARKIR BEBAS</b><small>KARCIS MASUK</small></div>
            <div class="struk-kode">${UI.esc(t.kode_tiket)}</div>
            ${this.baris('Plat Nomor', t.plat_nomor)}
            ${this.baris('Jenis', t.jenis_kendaraan)}
            ${this.baris('Area', `${t.kode_area || ''} ${t.nama_area}`)}
            ${this.baris('Masuk', UI.tanggal(t.waktu_masuk))}
            ${this.baris('Tarif', `${UI.rupiah(t.tarif_per_jam)}/jam`)}
            ${this.baris('Petugas', t.petugas_masuk)}
            <p class="struk-foot">Simpan karcis ini.<br>Kehilangan karcis menjadi tanggung jawab pemilik.</p>
        </div>`;
    },

    bayar(s) {
        return `<div class="struk">
            <div class="struk-head"><b>PARKIR BEBAS</b><small>STRUK PEMBAYARAN</small></div>
            <div class="struk-kode">${UI.esc(s.kode_tiket)}</div>
            ${this.baris('Plat Nomor', s.plat_nomor)}
            ${this.baris('Jenis', s.jenis_kendaraan)}
            ${this.baris('Area', s.nama_area)}
            ${this.baris('Masuk', UI.tanggal(s.waktu_masuk))}
            ${this.baris('Keluar', UI.tanggal(s.waktu_keluar))}
            ${this.baris('Durasi', `${s.durasi_jam} jam`)}
            ${this.baris('Tarif', `${UI.rupiah(s.tarif_per_jam)}/jam`)}
            <div class="struk-total"><span>TOTAL</span><b>${UI.rupiah(s.total_bayar)}</b></div>
            ${this.baris('Petugas', s.petugas_keluar)}
            <p class="struk-foot">Terima kasih.<br>Hati-hati di jalan!</p>
        </div>`;
    },

    // Tampilkan struk di modal 3D + tombol cetak
    tampil(judul, html) {
        const m = UI.modal({
            title: judul,
            size: 'modal-sm',
            body: `<div class="struk-3d-stage"><div class="struk-3d-paper">${html}</div></div>`,
            footer: `<button class="btn" data-close type="button">Tutup</button>
                     <button class="btn btn-primary" data-cetak type="button">${UI.icon('print')} Cetak</button>`
        });
        const stage = m.el.querySelector('.struk-3d-stage');
        const paper = m.el.querySelector('.struk-3d-paper');
        stage.addEventListener('pointermove', e => {
            const r = stage.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            paper.style.setProperty('--rx', `${(-py * 14).toFixed(2)}deg`);
            paper.style.setProperty('--ry', `${(px * 18).toFixed(2)}deg`);
        });
        stage.addEventListener('pointerleave', () => {
            paper.style.setProperty('--rx', '0deg');
            paper.style.setProperty('--ry', '0deg');
        });
        m.el.querySelector('[data-cetak]').addEventListener('click', () => UI.print(html));
        m.el.querySelector('[data-cetak]').focus();
    }
};

Pages.transaksi = async function (page) {
    page.innerHTML = `
        <div id="peta-transaksi-3d"></div>

        <div class="grid-2">
            <section class="card card-3d">
                <div class="card-head">
                    <div>
                        <span class="eyebrow-sm">GATE CHECK-IN</span>
                        <h3>Kendaraan Masuk</h3>
                    </div>
                    <span class="muted small">Catat lalu cetak karcis</span>
                </div>
                <div class="holo-preview">
                    <div class="holo-plat-3d" id="prv-plat">PLAT NOMOR</div>
                    <div class="holo-meta">
                        <span id="prv-jenis">Pilih jenis kendaraan</span>
                        <b id="prv-area">Pilih atau klik dek 3D area</b>
                    </div>
                </div>
                <form id="form-masuk" class="form">
                    <label>Plat Nomor
                        <input name="plat_nomor" list="dl-plat" class="upper" placeholder="Contoh: B 1234 ABC" required autocomplete="off">
                    </label>
                    <datalist id="dl-plat"></datalist>
                    <div class="form-row-2">
                        <label>Jenis Kendaraan <select name="id_tarif" required></select></label>
                        <label>Area Parkir <select name="id_area" required></select></label>
                    </div>
                    <button class="btn btn-primary btn-block" type="submit">${UI.icon('print')} Simpan & Cetak Karcis</button>
                </form>
            </section>

            <section class="card card-3d">
                <div class="card-head">
                    <div>
                        <span class="eyebrow-sm">GATE CHECK-OUT</span>
                        <h3>Kendaraan Keluar</h3>
                    </div>
                    <span class="muted small">Hitung biaya lalu bayar</span>
                </div>
                <form id="form-cari" class="form-inline">
                    <input name="search" placeholder="Ketik kode tiket / plat atau pilih dari tabel..." required autocomplete="off">
                    <button class="btn btn-primary" type="submit">Cek Biaya</button>
                </form>
                <div id="hasil-keluar" class="empty">Masukkan kode tiket atau klik tombol <b>Proses Keluar</b> di tabel bawah.</div>
            </section>
        </div>

        <section class="card">
            <div class="toolbar">
                <div>
                    <span class="eyebrow-sm">MONITORING SLOT AKTIF</span>
                    <h3>Kendaraan Sedang Parkir <span class="badge" id="jml-aktif">0</span></h3>
                </div>
                <div class="search">${UI.icon('search')}<input type="search" id="cari-aktif" placeholder="Cari plat / tiket..."></div>
            </div>
            <div id="tabel-aktif"></div>
        </section>`;

    const petaEl = page.querySelector('#peta-transaksi-3d');
    const formMasuk = page.querySelector('#form-masuk');
    const formCari = page.querySelector('#form-cari');
    const hasil = page.querySelector('#hasil-keluar');
    const tabelAktif = page.querySelector('#tabel-aktif');
    const cariAktif = page.querySelector('#cari-aktif');
    let tarif = [], areas = [], kendaraan = [], aktif = [];

    function updatePreview() {
        const plat = formMasuk.plat_nomor.value.trim().toUpperCase() || 'PLAT NOMOR';
        const t = tarif.find(x => String(x.id) === String(formMasuk.id_tarif.value));
        const a = areas.find(x => String(x.id) === String(formMasuk.id_area.value));
        page.querySelector('#prv-plat').textContent = plat;
        page.querySelector('#prv-jenis').textContent = t ? `${t.jenis_kendaraan} · ${UI.rupiah(t.tarif_per_jam)}/jam` : 'Pilih jenis kendaraan';
        page.querySelector('#prv-area').textContent = a ? `Area ${a.kode_area} (${a.nama_area})` : 'Pilih atau klik dek 3D area';
    }

    // ---------- Data pilihan form masuk ----------
    async function loadPilihan() {
        try {
            const [t, a, k] = await Promise.all([
                api.get('/tarif'), api.get('/area'), api.get('/kendaraan').catch(() => ({ data: [] }))
            ]);
            tarif = t.data;
            areas = a.data;
            kendaraan = k.data;

            const tarifDipilih = formMasuk.id_tarif.value;
            formMasuk.id_tarif.innerHTML = '<option value="">— Pilih jenis —</option>' + tarif.map(x =>
                `<option value="${x.id}">${UI.esc(x.jenis_kendaraan)} (${UI.rupiah(x.tarif_per_jam)}/jam)</option>`).join('');
            formMasuk.id_tarif.value = tarifDipilih;

            const areaDipilih = formMasuk.id_area.value;
            formMasuk.id_area.innerHTML = '<option value="">— Pilih area —</option>' + areas.map(x => {
                const sisa = x.kapasitas - x.terisi;
                return `<option value="${x.id}" ${sisa <= 0 ? 'disabled' : ''}>${UI.esc(x.kode_area)} · ${UI.esc(x.nama_area)} (sisa ${Math.max(0, sisa)})</option>`;
            }).join('');
            formMasuk.id_area.value = areaDipilih;

            petaEl.innerHTML = UI.lot3D(areas, { interaktif: true, dipilih: formMasuk.id_area.value });
            UI.pasangStage3D(petaEl, idArea => {
                formMasuk.id_area.value = idArea;
                updatePreview();
            });

            page.querySelector('#dl-plat').innerHTML = kendaraan.map(x =>
                `<option value="${UI.esc(x.plat_nomor)}">${UI.esc(x.jenis_kendaraan)} · ${UI.esc(x.pemilik)}</option>`).join('');
            updatePreview();
        } catch (err) {
            UI.toast(err.message, 'err');
        }
    }

    // Kalau plat terdaftar di master kendaraan, jenisnya dipilih otomatis
    formMasuk.plat_nomor.addEventListener('input', () => {
        const plat = formMasuk.plat_nomor.value.trim().toUpperCase();
        const k = kendaraan.find(x => x.plat_nomor === plat);
        if (k) {
            const t = tarif.find(x => x.jenis_kendaraan.toLowerCase() === k.jenis_kendaraan.toLowerCase());
            if (t) formMasuk.id_tarif.value = t.id;
        }
        updatePreview();
    });
    formMasuk.id_tarif.addEventListener('change', updatePreview);
    formMasuk.id_area.addEventListener('change', () => {
        petaEl.querySelectorAll('.lot').forEach(el =>
            el.classList.toggle('lot-dipilih', el.dataset.pilihArea === formMasuk.id_area.value));
        updatePreview();
    });

    formMasuk.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = formMasuk.querySelector('[type=submit]');
        btn.disabled = true;
        try {
            const res = await api.post('/transaksi/masuk', {
                plat_nomor: formMasuk.plat_nomor.value.trim().toUpperCase(),
                id_tarif: Number(formMasuk.id_tarif.value),
                id_area: Number(formMasuk.id_area.value),
                petugas: Auth.user.username
            });
            UI.toast(res.message);
            formMasuk.reset();
            Struk.tampil('Karcis Masuk', Struk.karcis(res.tiket));
            loadPilihan();
            loadAktif();
        } catch (err) {
            UI.toast(err.message, 'err');
        } finally {
            btn.disabled = false;
        }
    });

    // ---------- Kendaraan keluar ----------
    async function cekBiaya(search) {
        hasil.className = '';
        UI.loading(hasil);
        try {
            const { transaksi: t, estimasi: est } = await api.post('/transaksi/hitung-keluar', { search });
            hasil.innerHTML = `
                <div class="detail">
                    <div class="detail-head">
                        <span class="plat">${UI.esc(t.plat_nomor)}</span>
                        <span class="muted small">${UI.esc(t.kode_tiket)}</span>
                    </div>
                    <dl>
                        <dt>Jenis</dt><dd>${UI.esc(t.jenis_kendaraan)}</dd>
                        <dt>Area</dt><dd>${UI.esc(t.kode_area)} · ${UI.esc(t.nama_area)}</dd>
                        <dt>Masuk</dt><dd>${UI.tanggal(t.waktu_masuk)}</dd>
                        <dt>Durasi</dt><dd>${est.durasi_jam} jam <span class="muted">(${UI.lama(t.waktu_masuk)})</span></dd>
                        <dt>Tarif</dt><dd>${UI.rupiah(t.tarif_per_jam)}/jam${t.tarif_maksimal > 0 ? ` · maks ${UI.rupiah(t.tarif_maksimal)}` : ''}</dd>
                    </dl>
                    <div class="total"><span>Total Bayar</span><b>${UI.rupiah(est.total_bayar)}</b></div>
                    <button class="btn btn-primary btn-block" id="btn-bayar" type="button">Terima Pembayaran & Cetak Struk</button>
                </div>`;

            hasil.querySelector('#btn-bayar').addEventListener('click', async ev => {
                ev.target.disabled = true;
                try {
                    const res = await api.post('/transaksi/bayar', {
                        id: t.id,
                        durasi_jam: est.durasi_jam,
                        total_bayar: est.total_bayar,
                        petugas: Auth.user.username
                    });
                    UI.toast(res.message);
                    Struk.tampil('Struk Pembayaran', Struk.bayar(res.struk));
                    formCari.reset();
                    hasil.className = 'empty';
                    hasil.textContent = 'Masukkan kode tiket atau plat nomor kendaraan.';
                    loadPilihan();
                    loadAktif();
                } catch (err) {
                    UI.toast(err.message, 'err');
                    ev.target.disabled = false;
                }
            });
        } catch (err) {
            hasil.className = 'empty error-box';
            hasil.textContent = err.message;
        }
    }

    formCari.addEventListener('submit', e => {
        e.preventDefault();
        cekBiaya(formCari.search.value.trim());
    });

    // ---------- Daftar kendaraan di dalam ----------
    async function loadAktif() {
        try {
            aktif = (await api.get('/transaksi/aktif')).data;
            drawAktif();
        } catch (err) {
            UI.error(tabelAktif, err);
        }
    }

    function drawAktif() {
        page.querySelector('#jml-aktif').textContent = aktif.length;
        const q = cariAktif.value.trim().toLowerCase();
        const list = q ? aktif.filter(x => (x.plat_nomor + ' ' + x.kode_tiket).toLowerCase().includes(q)) : aktif;

        if (!list.length) {
            tabelAktif.innerHTML = `<div class="empty">${q ? 'Tidak ditemukan.' : 'Tidak ada kendaraan di dalam.'}</div>`;
            return;
        }
        tabelAktif.innerHTML = `
            <div class="table-wrap"><table>
                <thead><tr><th>Kode Tiket</th><th>Plat</th><th>Jenis</th><th>Area</th><th>Masuk</th><th>Lama</th><th class="aksi"></th></tr></thead>
                <tbody>${list.map(x => `<tr>
                    <td data-label="Kode Tiket" class="mono">${UI.esc(x.kode_tiket)}</td>
                    <td data-label="Plat"><span class="plat">${UI.esc(x.plat_nomor)}</span></td>
                    <td data-label="Jenis">${UI.esc(x.jenis_kendaraan)}</td>
                    <td data-label="Area">${UI.esc(x.kode_area)}</td>
                    <td data-label="Masuk">${UI.tanggal(x.waktu_masuk)}</td>
                    <td data-label="Lama">${UI.lama(x.waktu_masuk)}</td>
                    <td class="aksi"><button class="btn btn-sm" data-keluar="${UI.esc(x.kode_tiket)}" type="button">Proses Keluar</button></td>
                </tr>`).join('')}</tbody>
            </table></div>`;
    }

    cariAktif.addEventListener('input', drawAktif);
    tabelAktif.addEventListener('click', e => {
        const btn = e.target.closest('[data-keluar]');
        if (!btn) return;
        formCari.search.value = btn.dataset.keluar;
        cekBiaya(btn.dataset.keluar);
        formCari.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    loadPilihan();
    loadAktif();
};

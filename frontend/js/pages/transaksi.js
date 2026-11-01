// ========================================================
// HALAMAN TRANSAKSI (PETUGAS): kendaraan masuk, keluar, cetak karcis & struk
// Isi form tidak ikut hilang saat data diperbarui otomatis.
// ========================================================

Pages.transaksi = async function (page) {
    const SAPA_KELUAR = 'Cari kode tiket atau plat, atau pilih kendaraan dari daftar di bawah.';

    page.innerHTML = `
        <section class="o-rekap o-kerja">
            <header class="o-head-kecil">
                <div>
                    <p class="o-eyebrow"><span class="live-dot"></span> Pos gerbang</p>
                    <h1 class="o-judul"><b id="t-aktif">–</b> kendaraan di dalam</h1>
                </div>
                <dl class="o-ringkas">
                    <div><dt>Slot kosong</dt><dd id="t-kosong">–</dd></div>
                    <div><dt>Keluar hari ini</dt><dd id="t-keluar">–</dd></div>
                    <div><dt>Pendapatan hari ini</dt><dd id="t-pendapatan">–</dd></div>
                </dl>
            </header>

            <div class="o-dua">
                <article class="o-card">
                    <header><h3>Kendaraan masuk</h3><span>catat lalu cetak karcis</span></header>
                    <form id="f-masuk" class="form o-form">
                        <label>Plat nomor
                            <input name="plat_nomor" list="dl-plat" class="upper" placeholder="Contoh: B 1234 ABC" required autocomplete="off">
                        </label>
                        <datalist id="dl-plat"></datalist>
                        <div class="o-form-dua">
                            <label>Jenis kendaraan <select name="id_tarif" required></select></label>
                            <label>Area parkir <select name="id_area" required></select></label>
                        </div>
                        <button class="btn-glow" type="submit">${UI.icon('print')} Simpan & cetak karcis</button>
                    </form>
                </article>

                <article class="o-card">
                    <header><h3>Kendaraan keluar</h3><span>hitung biaya lalu bayar</span></header>
                    <form id="f-keluar" class="form-inline o-form">
                        <input name="q" placeholder="Kode tiket atau plat nomor" required autocomplete="off" aria-label="Kode tiket atau plat nomor">
                        <button class="o-btn" type="submit">Cek biaya</button>
                    </form>
                    <div id="box-keluar"><p class="o-note">${SAPA_KELUAR}</p></div>
                </article>
            </div>

            <article class="o-card o-card-tabel">
                <header>
                    <h3>Daftar kendaraan di dalam</h3>
                    <input type="search" id="cari-aktif" class="o-cari" placeholder="Saring plat / tiket..." aria-label="Saring kendaraan">
                </header>
                <div class="o-table" id="tabel-aktif"></div>
            </article>
        </section>`;

    const fMasuk = page.querySelector('#f-masuk');
    const fKeluar = page.querySelector('#f-keluar');
    const box = page.querySelector('#box-keluar');
    const tabel = page.querySelector('#tabel-aktif');
    const cari = page.querySelector('#cari-aktif');
    let tarif = [], kendaraan = [], aktif = [];

    // Ganti isi dropdown tanpa menghilangkan pilihan yang sedang dipilih petugas.
    function isiPilihan(select, kosong, html) {
        const nilai = select.value;
        select.innerHTML = `<option value="">${kosong}</option>${html}`;
        select.value = nilai;
    }

    // Gambar daftar kendaraan di dalam, sesuai kata di kotak saring.
    function gambarTabel() {
        const q = cari.value.trim().toLowerCase();
        const list = q ? aktif.filter(x => `${x.plat_nomor} ${x.kode_tiket} ${x.nama_area}`.toLowerCase().includes(q)) : aktif;
        tabel.innerHTML = list.length ? `<table>
            <thead><tr><th>Plat</th><th>Kode Tiket</th><th>Jenis</th><th>Area</th><th>Masuk</th><th>Lama</th><th class="right">Aksi</th></tr></thead>
            <tbody>${list.map(x => `<tr>
                <td><span class="plat">${UI.esc(x.plat_nomor)}</span></td>
                <td class="mono">${UI.esc(x.kode_tiket)}</td>
                <td>${UI.esc(UI.kapital(x.jenis_kendaraan))}</td>
                <td>${UI.esc(x.nama_area)}</td>
                <td>${UI.tanggal(x.waktu_masuk)}</td>
                <td>${UI.lama(x.waktu_masuk)}</td>
                <td class="right"><button class="o-btn o-btn-kecil" data-keluar="${UI.esc(x.kode_tiket)}" type="button">Proses keluar</button></td>
            </tr>`).join('')}</tbody>
        </table>` : `<p class="o-kosong">${q ? 'Tidak ada yang cocok.' : 'Belum ada kendaraan di dalam.'}</p>`;
    }

    // Ambil data terbaru. Hanya angka, dropdown, dan tabel yang diperbarui, jadi form yang sedang diisi aman.
    async function muat() {
        try {
            const [s, t, a, k, m] = await Promise.all([
                api.get('/stats'), api.get('/tarif'), api.get('/area'),
                api.get('/kendaraan').catch(() => ({ data: [] })), api.get('/transaksi/aktif')
            ]);
            if (Panel.halaman !== 'transaksi') return;
            tarif = t.data; kendaraan = k.data; aktif = m.data;

            page.querySelector('#t-aktif').textContent = s.parkir_aktif;
            page.querySelector('#t-kosong').textContent = Math.max(0, s.kapasitas_total - s.kapasitas_terisi);
            page.querySelector('#t-keluar').textContent = s.transaksi_hari_ini;
            page.querySelector('#t-pendapatan').textContent = UI.rupiah(s.pendapatan_hari_ini);

            isiPilihan(fMasuk.id_tarif, 'Pilih jenis', tarif.map(x =>
                `<option value="${x.id}">${UI.esc(UI.kapital(x.jenis_kendaraan))} · ${UI.rupiah(x.tarif_per_jam)}/jam</option>`).join(''));
            isiPilihan(fMasuk.id_area, 'Pilih area', a.data.map(x => {
                const sisa = Math.max(0, x.kapasitas - x.terisi);
                return `<option value="${x.id}" ${sisa === 0 ? 'disabled' : ''}>${UI.esc(x.nama_area)} · ${sisa ? `sisa ${sisa}` : 'penuh'}</option>`;
            }).join(''));
            page.querySelector('#dl-plat').innerHTML = kendaraan.map(x =>
                `<option value="${UI.esc(x.plat_nomor)}">${UI.esc(UI.kapital(x.jenis_kendaraan))} · ${UI.esc(x.pemilik)}</option>`).join('');

            Panel.gambarLot(a.data);
            gambarTabel();
        } catch (err) {
            tabel.innerHTML = `<p class="o-note err">${UI.esc(err.message)}</p>`;
        }
    }

    // Plat yang terdaftar langsung memilih jenis kendaraannya
    fMasuk.plat_nomor.addEventListener('input', () => {
        const plat = fMasuk.plat_nomor.value.trim().toUpperCase();
        const k = kendaraan.find(x => x.plat_nomor === plat);
        const t = k && tarif.find(x => x.jenis_kendaraan.toLowerCase() === k.jenis_kendaraan.toLowerCase());
        if (t) fMasuk.id_tarif.value = t.id;
    });

    // Simpan kendaraan masuk. Tombol dimatikan sementara supaya tidak terkirim dua kali.
    fMasuk.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = fMasuk.querySelector('[type=submit]');
        btn.disabled = true;
        try {
            const res = await api.post('/transaksi/masuk', {
                plat_nomor: fMasuk.plat_nomor.value.trim().toUpperCase(),
                id_tarif: Number(fMasuk.id_tarif.value),
                id_area: Number(fMasuk.id_area.value),
                id_user: Auth.user.id
            });
            UI.toast(res.message);
            fMasuk.reset();
            Struk.tampil('Karcis masuk', Struk.karcis(res.tiket), res.tiket);
            muat();
        } catch (err) {
            UI.toast(err.message, 'err');
        } finally {
            btn.disabled = false;
        }
    });

    // Kembalikan kotak kendaraan keluar ke kondisi awal.
    function bersihkanKeluar() {
        fKeluar.reset();
        box.innerHTML = `<p class="o-note">${SAPA_KELUAR}</p>`;
    }

    // Tampilkan rincian biaya. Pembayaran baru terjadi setelah petugas menekan tombol bayar.
    async function cekBiaya(search) {
        box.innerHTML = '<p class="o-note"><span class="spinner"></span> Menghitung biaya...</p>';
        try {
            const { transaksi: t, estimasi: est } = await api.post('/transaksi/hitung-keluar', { search });
            box.innerHTML = `
                <div class="detail">
                    <div class="detail-head">
                        <span class="plat">${UI.esc(t.plat_nomor)}</span>
                        <span class="mono small">${UI.esc(t.kode_tiket)}</span>
                    </div>
                    <dl>
                        <dt>Jenis</dt><dd>${UI.esc(UI.kapital(t.jenis_kendaraan))}</dd>
                        <dt>Area</dt><dd>${UI.esc(t.nama_area)}</dd>
                        <dt>Masuk</dt><dd>${UI.tanggal(t.waktu_masuk)}</dd>
                        <dt>Lama</dt><dd>${UI.lama(t.waktu_masuk)} · dihitung ${est.durasi_jam} jam</dd>
                    </dl>
                    <div class="total"><span>Total bayar</span><b>${UI.rupiah(est.total_bayar)}</b></div>
                    <div class="detail-aksi">
                        <button class="o-btn ghost" id="btn-batal-bayar" type="button">Batal</button>
                        <button class="btn-glow" id="btn-bayar" type="button">${UI.icon('print')} Terima bayar & cetak struk</button>
                    </div>
                </div>`;
            box.querySelector('#btn-batal-bayar').addEventListener('click', bersihkanKeluar);
            box.querySelector('#btn-bayar').addEventListener('click', async ev => {
                const btn = ev.currentTarget;
                btn.disabled = true;
                try {
                    const res = await api.post('/transaksi/bayar', { id: t.id, id_user: Auth.user.id });
                    UI.toast(res.message);
                    bersihkanKeluar();
                    Struk.tampil('Struk pembayaran', Struk.bayar(res.struk), res.struk);
                    muat();
                } catch (err) {
                    UI.toast(err.message, 'err');
                    btn.disabled = false;
                }
            });
        } catch (err) {
            box.innerHTML = `<p class="o-note err">${UI.esc(err.message)}</p>`;
        }
    }

    // Cari kendaraan lewat kode tiket atau plat.
    fKeluar.addEventListener('submit', e => {
        e.preventDefault();
        cekBiaya(fKeluar.q.value.trim());
    });
    // Satu event di tabel untuk semua tombol Proses keluar, cukup cek tombol mana yang ditekan.
    tabel.addEventListener('click', e => {
        const b = e.target.closest('[data-keluar]');
        if (!b) return;
        fKeluar.q.value = b.dataset.keluar;
        cekBiaya(b.dataset.keluar);
        fKeluar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    cari.addEventListener('input', gambarTabel);

    // Muat data pertama, fokus ke kolom plat, lalu perbarui otomatis tiap 15 detik.
    await muat();
    fMasuk.plat_nomor.focus();
    Panel.ulang(muat, 15000);
};

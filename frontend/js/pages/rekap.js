// ========================================================
// HALAMAN REKAP TRANSAKSI (OWNER): analisis periode + cetak laporan
// ========================================================

Pages.rekap = async function (page) {
    page.innerHTML = `
        <section class="o-rekap">
            <header class="o-rekap-head">
                <div>
                    <p class="o-eyebrow">Rekap transaksi · <span id="r-periode"></span></p>
                    <h1 class="o-big rp" id="r-total">–</h1>
                    <p class="o-sub">total pendapatan</p>
                </div>
                <form class="o-filter" id="r-form">
                    <div class="o-chips">
                        <button type="button" data-rentang="0">Hari ini</button>
                        <button type="button" data-rentang="6" class="on">7 hari</button>
                        <button type="button" data-rentang="29">30 hari</button>
                    </div>
                    <div class="o-range">
                        <input type="date" name="start_date" required aria-label="Dari tanggal">
                        <span>–</span>
                        <input type="date" name="end_date" required aria-label="Sampai tanggal">
                        <button class="o-btn" type="submit">Tampilkan</button>
                        <button class="o-btn ghost" type="button" id="r-cetak" disabled>${UI.icon('print')} Cetak</button>
                    </div>
                </form>
            </header>
            <div id="r-isi"></div>
        </section>`;

    const form = page.querySelector('#r-form');
    const isi = page.querySelector('#r-isi');
    const chips = [...page.querySelectorAll('[data-rentang]')];
    let laporan = null;
    form.start_date.value = UI.hariIni(-6);
    form.end_date.value = UI.hariIni();

    // Teks periode, contoh: 26 Okt 2026 – 1 Nov 2026.
    const periode = () => {
        const f = d => new Date(d + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        return form.start_date.value === form.end_date.value ? f(form.start_date.value) : `${f(form.start_date.value)} – ${f(form.end_date.value)}`;
    };

    // Ambil laporan dari backend sesuai tanggal, hitung analisisnya, lalu gambar semua kartu dan grafik.
    async function tampilkan() {
        if (form.start_date.value > form.end_date.value) {
            UI.toast('Tanggal awal tidak boleh setelah tanggal akhir.', 'err');
            return;
        }
        isi.innerHTML = '<p class="o-note"><span class="spinner"></span> Menghitung rekap...</p>';
        page.querySelector('#r-cetak').disabled = true;
        try {
            const q = new URLSearchParams({ start_date: form.start_date.value, end_date: form.end_date.value });
            laporan = await api.get(`/laporan?${q}`);
            if (Panel.halaman !== 'laporan') return;
            const rows = laporan.data;
            const n = rows.length;
            const hari = kelompokHari(rows, form.start_date.value, form.end_date.value);
            const jenis = perJenis(rows);
            const jam = perJam(rows);
            const rataDurasi = n ? rows.reduce((a, r) => a + Number(r.durasi_jam), 0) / n : 0;
            const tersibuk = hari.reduce((a, b) => b.nilai > a.nilai ? b : a, { nilai: 0, label: '-' });
            const jamRamai = jam.reduce((a, b) => b.nilai > a.nilai ? b : a, { nilai: 0, label: '-' });

            page.querySelector('#r-total').textContent = UI.rupiah(laporan.total_pendapatan);
            page.querySelector('#r-periode').textContent = periode();
            page.querySelector('#r-cetak').disabled = !n;

            isi.innerHTML = `
                <div class="o-kpis">
                    <div class="o-kpi"><small>Transaksi selesai</small><b>${n}</b></div>
                    <div class="o-kpi"><small>Rata-rata per kendaraan</small><b>${UI.rupiah(n ? laporan.total_pendapatan / n : 0)}</b></div>
                    <div class="o-kpi"><small>Rata-rata lama parkir</small><b>${rataDurasi.toFixed(1).replace('.', ',')} jam</b></div>
                    <div class="o-kpi"><small>Hari terbaik</small><b>${tersibuk.nilai ? UI.esc(tersibuk.label) : '-'}</b>${tersibuk.nilai ? `<em>${UI.rupiah(tersibuk.nilai)}</em>` : ''}</div>
                </div>

                <div class="o-grid">
                    <article class="o-card o-wide">
                        <header><h3>Pendapatan per ${hari[0]?.minggu ? 'minggu' : 'hari'}</h3><span>gerakkan kursor untuk memutar</span></header>
                        ${batang3D(hari, { format: rupiahSingkat, lebar: Math.max(14, Math.min(40, 520 / hari.length)) })}
                    </article>

                    <article class="o-card">
                        <header><h3>Pendapatan per jenis</h3></header>
                        ${jenis.length ? `
                            ${donat3D(jenis)}
                            <ul class="o-legend-list">${jenis.map((j, i) => `
                                <li><i style="background:${WARNA_JENIS[i % WARNA_JENIS.length]}"></i>
                                    <span>${UI.esc(j.jenis)}<small>${j.jumlah} kendaraan</small></span>
                                    <b>${UI.rupiah(j.nilai)}<small>${Math.round(j.nilai / (laporan.total_pendapatan || 1) * 100)}%</small></b>
                                </li>`).join('')}
                            </ul>` : '<p class="o-note">Belum ada transaksi.</p>'}
                    </article>

                    <article class="o-card o-wide">
                        <header><h3>Jam kendaraan masuk</h3><span>${jamRamai.nilai ? `paling ramai jam ${jamRamai.label}.00` : 'belum ada data'}</span></header>
                        ${batang3D(jam, { tinggi: 110, lebar: 14, dalam: 12, kelas: 'kecil' })}
                    </article>

                    <article class="o-card o-full">
                        <header><h3>Detail transaksi</h3><span>${n} transaksi</span></header>
                        ${n ? `<div class="o-table"><table>
                            <thead><tr><th>Kode Tiket</th><th>Plat</th><th>Jenis</th><th>Masuk</th><th>Keluar</th><th class="right">Durasi</th><th class="right">Bayar</th></tr></thead>
                            <tbody>${rows.map(r => `<tr>
                                <td class="mono">${UI.esc(r.kode_tiket)}</td>
                                <td><span class="plat">${UI.esc(r.plat_nomor)}</span></td>
                                <td>${UI.esc(UI.kapital(r.jenis_kendaraan))}</td>
                                <td>${UI.tanggal(r.waktu_masuk)}</td>
                                <td>${UI.tanggal(r.waktu_keluar)}</td>
                                <td class="right">${r.durasi_jam} jam</td>
                                <td class="right"><b>${UI.rupiah(r.total_bayar)}</b></td>
                            </tr>`).join('')}</tbody>
                        </table></div>` : '<p class="o-note">Tidak ada transaksi selesai di periode ini.</p>'}
                    </article>
                </div>`;

            requestAnimationFrame(() => requestAnimationFrame(() => isi.classList.add('tumbuh')));
        } catch (err) {
            isi.innerHTML = `<p class="o-note err">${UI.esc(err.message)}</p>`;
        }
    }

    // Hasilkan HTML laporan A4. bw = hitam-putih, detail = sertakan tabel detail transaksi.
    function laporanHTML({ bw = false, detail = true } = {}) {
        const rows = [...laporan.data].sort((x, y) => new Date(x.waktu_keluar) - new Date(y.waktu_keluar));
        const total = Number(laporan.total_pendapatan) || 0;
        const n = rows.length;
        const jenis = perJenis(rows);
        const hari = kelompokHari(rows, form.start_date.value, form.end_date.value);
        // Hitung jumlah transaksi per tanggal.
        const jmlHari = rows.reduce((acc, r) => {
            const k = new Date(r.waktu_keluar).toLocaleDateString('sv-SE');
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {});
        const maxHari = Math.max(1, ...hari.map(h => h.nilai));
        const rataDurasi = n ? rows.reduce((a, r) => a + Number(r.durasi_jam), 0) / n : 0;
        const sekarang = new Date();
        const nomor = `LAP-${sekarang.toLocaleDateString('sv-SE').replace(/-/g, '')}-${String(sekarang.getHours()).padStart(2, '0')}${String(sekarang.getMinutes()).padStart(2, '0')}`;
        const tgl = d => new Date(d).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
        const persen = v => `${(v / (total || 1) * 100).toFixed(1).replace('.', ',')}%`;

        return `<div class="lp ${bw ? 'bw' : ''}">
            <header class="lp-kop">
                <div class="lp-brand">
                    <span class="lp-logo">P</span>
                    <div><b>PARKIR BEBAS</b><small>Sistem Manajemen Parkir</small></div>
                </div>
                <div class="lp-judul">
                    <h1>Laporan Rekap Transaksi</h1>
                    <p>Periode ${periode()}</p>
                    <p class="lp-no">No. ${nomor}</p>
                </div>
            </header>

            <section class="lp-kpi">
                <div class="utama"><small>Total pendapatan</small><b>${UI.rupiah(total)}</b></div>
                <div><small>Transaksi selesai</small><b>${n}</b></div>
                <div><small>Rata-rata / kendaraan</small><b>${UI.rupiah(n ? total / n : 0)}</b></div>
                <div><small>Rata-rata lama parkir</small><b>${rataDurasi.toFixed(1).replace('.', ',')} jam</b></div>
            </section>

            <section class="lp-dua">
                <div>
                    <h2>Ringkasan per jenis kendaraan</h2>
                    <table class="lp-tabel">
                        <thead><tr><th>Jenis</th><th class="r">Kendaraan</th><th class="r">Pendapatan</th><th class="r">Porsi</th></tr></thead>
                        <tbody>${jenis.map(j => `<tr>
                            <td>${UI.esc(j.jenis)}</td><td class="r">${j.jumlah}</td><td class="r">${UI.rupiah(j.nilai)}</td>
                            <td class="r">${persen(j.nilai)}<span class="lp-bar"><i style="width:${j.nilai / (total || 1) * 100}%"></i></span></td>
                        </tr>`).join('')}</tbody>
                        <tfoot><tr><td>Total</td><td class="r">${n}</td><td class="r">${UI.rupiah(total)}</td><td class="r">100%</td></tr></tfoot>
                    </table>
                </div>
                <div>
                    <h2>Pendapatan per ${hari[0]?.minggu ? 'minggu' : 'hari'}</h2>
                    <table class="lp-tabel">
                        <thead><tr><th>${hari[0]?.minggu ? 'Minggu mulai' : 'Tanggal'}</th>${hari[0]?.minggu ? '' : '<th class="r">Transaksi</th>'}<th class="r">Pendapatan</th></tr></thead>
                        <tbody>${hari.map(h => `<tr>
                            <td>${new Date(h.kunci + 'T00:00').toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                            ${h.minggu ? '' : `<td class="r">${jmlHari[h.kunci] || 0}</td>`}
                            <td class="r">${UI.rupiah(h.nilai)}<span class="lp-bar"><i style="width:${h.nilai / maxHari * 100}%"></i></span></td>
                        </tr>`).join('')}</tbody>
                    </table>
                </div>
            </section>

            ${detail ? `<h2>Detail transaksi</h2>
            <table class="lp-tabel lp-detail">
                <thead><tr><th class="r">No</th><th>Kode Tiket</th><th>Plat Nomor</th><th>Jenis</th><th>Masuk</th><th>Keluar</th><th class="r">Durasi</th><th class="r">Bayar</th></tr></thead>
                <tbody>${rows.map((r, i) => `<tr>
                    <td class="r">${i + 1}</td><td class="mono">${UI.esc(r.kode_tiket)}</td><td class="mono">${UI.esc(r.plat_nomor)}</td>
                    <td>${UI.esc(UI.kapital(r.jenis_kendaraan))}</td><td>${tgl(r.waktu_masuk)}</td><td>${tgl(r.waktu_keluar)}</td>
                    <td class="r">${r.durasi_jam} jam</td><td class="r">${UI.rupiah(r.total_bayar)}</td>
                </tr>`).join('')}</tbody>
                <tfoot><tr><td colspan="7">Total ${n} transaksi</td><td class="r">${UI.rupiah(total)}</td></tr></tfoot>
            </table>` : ''}

            <footer class="lp-kaki">
                <p class="lp-info">Dicetak oleh ${UI.esc(Auth.user.nama_lengkap)} pada ${UI.tanggal(sekarang)}.<br>
                    Laporan ini dibuat otomatis oleh sistem Parkir Bebas.</p>
                <div class="lp-ttd">
                    <p>Mengetahui,<br>Owner</p>
                    <span></span>
                    <p><b>${UI.esc(Auth.user.nama_lengkap)}</b></p>
                </div>
            </footer>
        </div>`;
    }

    function pratinjau() {
        const opsi = { bw: false, detail: true };
        const el = document.createElement('div');
        el.className = 'pv';
        el.innerHTML = `
            <div class="pv-meja" id="pv-meja">
                <div class="pv-kertas-wrap" id="pv-wrap">
                    <span class="pv-tumpuk t2"></span><span class="pv-tumpuk t1"></span>
                    <div class="pv-kertas" id="pv-kertas"></div>
                </div>
            </div>
            <aside class="pv-panel">
                <p class="o-eyebrow">Pratinjau cetak</p>
                <h2>Laporan Rekap</h2>
                <p class="pv-periode">${periode()}</p>

                <div class="pv-grup">
                    <span class="pv-label">Warna</span>
                    <div class="pv-seg" data-opsi="bw">
                        <button type="button" data-nilai="0" class="on"><i class="sw-warna"></i>Berwarna</button>
                        <button type="button" data-nilai="1"><i class="sw-bw"></i>Hitam-putih</button>
                    </div>
                </div>
                <div class="pv-grup">
                    <span class="pv-label">Isi laporan</span>
                    <div class="pv-seg" data-opsi="detail">
                        <button type="button" data-nilai="1" class="on">Lengkap</button>
                        <button type="button" data-nilai="0">Ringkasan saja</button>
                    </div>
                </div>

                <dl class="pv-info">
                    <dt>Transaksi</dt><dd>${laporan.data.length}</dd>
                    <dt>Total</dt><dd>${UI.rupiah(laporan.total_pendapatan)}</dd>
                    <dt>Kertas</dt><dd>A4 · tegak</dd>
                    <dt>Perkiraan</dt><dd id="pv-hal">–</dd>
                </dl>

                <button class="btn-glow pv-cetak" type="button" id="pv-cetak">${UI.icon('print')} Cetak sekarang</button>
                <button class="pv-batal" type="button" id="pv-batal">Batal</button>
                <p class="pv-tip">Tip: pilih "Simpan sebagai PDF" di dialog cetak untuk menyimpan file.</p>
            </aside>`;
        Panel.view.appendChild(el);

        const kertas = el.querySelector('#pv-kertas');
        const wrap = el.querySelector('#pv-wrap');
        const meja = el.querySelector('#pv-meja');
        const pas = () => { wrap.style.zoom = Math.min(0.8, (meja.clientWidth - 100) / 794).toFixed(3); };
        window.addEventListener('resize', pas);

        // Gambar ulang kertas tiap pilihan berubah, lalu perkirakan jumlah halaman.
        function render() {
            kertas.innerHTML = laporanHTML(opsi);
            const hal = Math.max(1, Math.ceil(kertas.firstElementChild.offsetHeight / 1024));
            el.querySelector('#pv-hal').textContent = `${hal} halaman`;
            wrap.dataset.hal = Math.min(hal, 3);
        }

        // Tutup pratinjau dan lepas event supaya tidak menumpuk.
        function tutup() {
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', pas);
            el.classList.add('keluar');
            setTimeout(() => el.remove(), 250);
        }
        const onKey = e => { if (e.key === 'Escape') tutup(); };
        document.addEventListener('keydown', onKey);

        el.querySelectorAll('.pv-seg').forEach(seg => seg.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
            opsi[seg.dataset.opsi] = b.dataset.nilai === '1';
            render();
        }));

        el.querySelector('#pv-meja').addEventListener('pointermove', e => {
            const r = e.currentTarget.getBoundingClientRect();
            wrap.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(2)}deg`);
            wrap.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(2)}deg`);
        });

        el.querySelector('#pv-batal').addEventListener('click', tutup);
        el.querySelector('#pv-cetak').addEventListener('click', () => UI.print(laporanHTML(opsi)));
        pas();
        render();
        el.querySelector('#pv-cetak').focus();
    }

    // Tombol Tampilkan: pakai tanggal yang dipilih sendiri.
    form.addEventListener('submit', e => {
        e.preventDefault();
        chips.forEach(c => c.classList.remove('on'));
        tampilkan();
    });
    // Tombol cepat: Hari ini, 7 hari, 30 hari.
    chips.forEach(c => c.addEventListener('click', () => {
        chips.forEach(x => x.classList.toggle('on', x === c));
        form.start_date.value = UI.hariIni(-Number(c.dataset.rentang));
        form.end_date.value = UI.hariIni();
        tampilkan();
    }));
    page.querySelector('#r-cetak').addEventListener('click', pratinjau);
    pasangPutarChart(isi);

    tampilkan();
    api.get('/area').then(a => Panel.gambarLot(a.data)).catch(() => {});
};

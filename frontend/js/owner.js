// ========================================================
// PANEL OWNER (tampilan khusus, tanpa sidebar)
// Pojok kanan atas = Dashboard (kondisi sekarang, live)
// Pojok kiri bawah  = Rekap (analisis per periode)
// Semua visual 3D memakai CSS 3D (tanpa WebGL, tanpa library).
// ========================================================

const Owner = (() => {
    const view = document.getElementById('owner-view');
    const page = document.getElementById('owner-page');
    const plane = document.getElementById('lot-plane');
    const DWELL = 400;           // ms kursor harus diam di pojok
    const POJOK = 44;            // ukuran area pojok (px)
    const REFRESH = 10000;       // dashboard diperbarui tiap 10 detik
    let halaman = null, timerRefresh = null, timerPojok = null, pojokAktif = null;

    // ---------- Pojok layar (hot corner) ----------
    function pojokDari(x, y) {
        const w = view.clientWidth, h = view.clientHeight;
        if (x >= w - POJOK && y <= POJOK) return 'dashboard';
        if (x <= POJOK && y >= h - POJOK) return 'laporan';
        return null;
    }

    function onMove(e) {
        // Parallax lantai parkir
        view.style.setProperty('--mx', (e.clientX / view.clientWidth * 2 - 1).toFixed(3));
        view.style.setProperty('--my', (e.clientY / view.clientHeight * 2 - 1).toFixed(3));

        if (view.querySelector('.pv')) return;      // sedang pratinjau cetak
        const p = pojokDari(e.clientX, e.clientY);
        if (p === pojokAktif) return;
        batalPojok();
        if (!p || p === halaman) return;
        pojokAktif = p;
        view.querySelector(`.corner[data-go="${p}"]`).classList.add('isi');
        timerPojok = setTimeout(() => { batalPojok(); location.hash = `#/${p}`; }, DWELL);
    }

    function batalPojok() {
        clearTimeout(timerPojok);
        pojokAktif = null;
        view.querySelectorAll('.corner.isi').forEach(c => c.classList.remove('isi'));
    }

    // ---------- Lantai parkir isometrik (sesuai data area) ----------
    // Urutan slot acak tapi tetap (seed per area), supaya slot yang nyala tidak loncat-loncat
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

    function gambarLot(areas) {
        plane.innerHTML = areas.map((a, k) => {
            const per = Math.max(1, Math.ceil(a.kapasitas / 120));    // 1 kotak = per slot (kalau area sangat besar)
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
        }).join('') + '<span class="lot-scan"></span><span class="lot-streak s1"></span><span class="lot-streak s2"></span>';
    }

    // ---------- Halaman Dashboard ----------
    async function dashboard() {
        page.innerHTML = `
            <section class="o-dash">
                <p class="o-eyebrow"><span class="live-dot"></span> Kondisi sekarang · live</p>
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
                <p class="o-note" id="o-update">Memuat data...</p>
            </section>`;

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
                        <b>${UI.esc(x.kode_area)}</b><span>${UI.esc(x.nama_area)}</span>
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
        timerRefresh = setInterval(muat, REFRESH);
    }

    // ---------- Visual 3D: batang (CSS 3D cuboid) ----------
    function batang3D(data, { tinggi = 200, lebar = 34, dalam = 26, format = x => x, kelas = '' } = {}) {
        const max = Math.max(1, ...data.map(d => d.nilai));
        if (data.length > 12) kelas += ' banyak';
        return `<div class="chart3d ${kelas}" style="--H:${tinggi}px;--W:${lebar}px;--D:${dalam}px">
            <div class="bars3d">
                <div class="bars-floor"></div>
                ${data.map((d, i) => `
                    <div class="bar3d ${d.nilai === max && d.nilai > 0 ? 'max' : ''}" style="--i:${i};--hp:${(d.nilai / max * tinggi).toFixed(1)}px" title="${UI.esc(d.label)}: ${UI.esc(format(d.nilai))}">
                        <i class="f-front"></i><i class="f-side"></i><i class="f-top"></i>
                        ${d.nilai > 0 ? `<span class="bar-val">${UI.esc(format(d.nilai))}</span>` : ''}
                        <span class="bar-label">${UI.esc(d.label)}</span>
                    </div>`).join('')}
            </div>
        </div>`;
    }

    // ---------- Visual 3D: donat bertumpuk ----------
    const WARNA_JENIS = ['#4d8cff', '#33d9f2', '#a98fff', '#ffb547', '#ff6b8b'];

    function donat3D(items) {
        const total = items.reduce((a, b) => a + b.nilai, 0) || 1;
        let sudut = 0;
        const stops = items.map((it, i) => {
            const awal = sudut;
            sudut += it.nilai / total * 360;
            return `${WARNA_JENIS[i % WARNA_JENIS.length]} ${awal}deg ${sudut}deg`;
        }).join(', ');
        const lapis = 14;
        return `<div class="donut3d">
            <div class="donut-stack" style="--g:conic-gradient(${stops || '#1c2b55 0deg 360deg'})">
                ${[...Array(lapis).keys()].map(i =>
                    `<i style="--z:${i * 2}px;--b:${(0.35 + i / lapis * 0.65).toFixed(2)}"></i>`).join('')}
            </div>
            <div class="donut-center"><b>${items.reduce((a, b) => a + b.jumlah, 0)}</b><small>kendaraan</small></div>
        </div>`;
    }

    // ---------- Olah data rekap ----------
    function kelompokHari(rows, start, end) {
        const hari = [];
        for (let d = new Date(start + 'T00:00'); d <= new Date(end + 'T00:00'); d.setDate(d.getDate() + 1)) {
            hari.push(d.toLocaleDateString('sv-SE'));
        }
        const total = rows.reduce((acc, r) => {
            const k = new Date(r.waktu_keluar).toLocaleDateString('sv-SE');
            acc[k] = (acc[k] || 0) + Number(r.total_bayar);
            return acc;
        }, {});
        let data = hari.map(k => ({ kunci: k, nilai: total[k] || 0 }));

        // Rentang panjang → dikelompokkan per minggu supaya batang tidak terlalu banyak
        if (data.length > 31) {
            const minggu = [];
            for (let i = 0; i < data.length; i += 7) {
                const potong = data.slice(i, i + 7);
                minggu.push({ kunci: potong[0].kunci, nilai: potong.reduce((a, b) => a + b.nilai, 0), minggu: true });
            }
            data = minggu;
        }
        return data.map(d => {
            const tgl = new Date(d.kunci + 'T00:00');
            return { ...d, label: (d.minggu ? 'mg ' : '') + tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) };
        });
    }

    function perJenis(rows) {
        return Object.values(rows.reduce((acc, r) => {
            const k = r.jenis_kendaraan;
            acc[k] = acc[k] || { jenis: k, jumlah: 0, nilai: 0 };
            acc[k].jumlah++;
            acc[k].nilai += Number(r.total_bayar) || 0;
            return acc;
        }, {})).sort((a, b) => b.nilai - a.nilai);
    }

    function perJam(rows) {
        const jam = Array(24).fill(0);
        rows.forEach(r => jam[new Date(r.waktu_masuk).getHours()]++);
        return jam.map((n, i) => ({ label: String(i).padStart(2, '0'), nilai: n }));
    }

    const rupiahSingkat = n => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.0', '')}jt`
        : n >= 1e3 ? `${Math.round(n / 1e3)}rb` : String(n);

    // ---------- Halaman Rekap ----------
    async function rekap() {
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

        const periode = () => {
            const f = d => new Date(d + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            return form.start_date.value === form.end_date.value ? f(form.start_date.value) : `${f(form.start_date.value)} – ${f(form.end_date.value)}`;
        };

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
                if (halaman !== 'laporan') return;
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
                                    <td>${UI.esc(r.jenis_kendaraan)}</td>
                                    <td>${UI.tanggal(r.waktu_masuk)}</td>
                                    <td>${UI.tanggal(r.waktu_keluar)}</td>
                                    <td class="right">${r.durasi_jam} jam</td>
                                    <td class="right"><b>${UI.rupiah(r.total_bayar)}</b></td>
                                </tr>`).join('')}</tbody>
                            </table></div>` : '<p class="o-note">Tidak ada transaksi selesai di periode ini.</p>'}
                        </article>
                    </div>`;

                // Batang tumbuh dari nol
                requestAnimationFrame(() => requestAnimationFrame(() => isi.classList.add('tumbuh')));
            } catch (err) {
                isi.innerHTML = `<p class="o-note err">${UI.esc(err.message)}</p>`;
            }
        }

        // Laporan cetak A4: kop, ringkasan, per jenis, per hari, detail, tanda tangan
        function laporanHTML({ bw = false, detail = true } = {}) {
            const rows = [...laporan.data].sort((x, y) => new Date(x.waktu_keluar) - new Date(y.waktu_keluar));
            const total = Number(laporan.total_pendapatan) || 0;
            const n = rows.length;
            const jenis = perJenis(rows);
            const hari = kelompokHari(rows, form.start_date.value, form.end_date.value);
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
                        <td>${UI.esc(r.jenis_kendaraan)}</td><td>${tgl(r.waktu_masuk)}</td><td>${tgl(r.waktu_keluar)}</td>
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

        // Layar pratinjau sebelum cetak: kertas A4 melayang 3D + panel pilihan
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
            view.appendChild(el);

            const kertas = el.querySelector('#pv-kertas');
            const wrap = el.querySelector('#pv-wrap');
            const meja = el.querySelector('#pv-meja');
            const pas = () => { wrap.style.zoom = Math.min(0.8, (meja.clientWidth - 100) / 794).toFixed(3); };
            window.addEventListener('resize', pas);

            function render() {
                kertas.innerHTML = laporanHTML(opsi);
                // perkiraan halaman: tinggi isi dibagi tinggi area cetak A4 (297mm - margin 26mm ≈ 1024px)
                const hal = Math.max(1, Math.ceil(kertas.firstElementChild.offsetHeight / 1024));
                el.querySelector('#pv-hal').textContent = `${hal} halaman`;
                wrap.dataset.hal = Math.min(hal, 3);
            }

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

            // Kertas miring mengikuti kursor
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

        form.addEventListener('submit', e => {
            e.preventDefault();
            chips.forEach(c => c.classList.remove('on'));
            tampilkan();
        });
        chips.forEach(c => c.addEventListener('click', () => {
            chips.forEach(x => x.classList.toggle('on', x === c));
            form.start_date.value = UI.hariIni(-Number(c.dataset.rentang));
            form.end_date.value = UI.hariIni();
            tampilkan();
        }));
        page.querySelector('#r-cetak').addEventListener('click', pratinjau);

        // Grafik 3D ikut berputar mengikuti kursor
        isi.addEventListener('pointermove', e => {
            const chart = e.target.closest('.chart3d');
            if (!chart) return;
            const r = chart.getBoundingClientRect();
            chart.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 50 - 18).toFixed(1)}deg`);
            chart.style.setProperty('--rx', `${(-14 - ((e.clientY - r.top) / r.height - 0.5) * 16).toFixed(1)}deg`);
        });

        tampilkan();
        // lantai parkir latar tetap sesuai data
        api.get('/area').then(a => gambarLot(a.data)).catch(() => {});
    }

    // ---------- Navigasi ----------
    function buka(id) {
        clearInterval(timerRefresh);
        batalPojok();
        halaman = id;
        view.dataset.halaman = id;
        view.querySelectorAll('.corner').forEach(c => c.classList.toggle('di-sini', c.dataset.go === id));
        document.title = `${id === 'dashboard' ? 'Dashboard' : 'Rekap Transaksi'} · Parkir Bebas`;
        page.scrollTop = 0;
        page.classList.remove('masuk');
        void page.offsetWidth;            // ulang animasi masuk
        page.classList.add('masuk');
        (id === 'dashboard' ? dashboard : rekap)();
    }

    view.addEventListener('pointermove', onMove);
    view.addEventListener('pointerleave', batalPojok);

    return {
        buka,
        show(onLogout) {
            view.hidden = false;
            document.getElementById('owner-name').textContent = Auth.user.nama_lengkap;
            document.getElementById('owner-logout').onclick = onLogout;
        },
        hide() {
            view.hidden = true;
            clearInterval(timerRefresh);
            halaman = null;
            page.innerHTML = '';
        }
    };
})();

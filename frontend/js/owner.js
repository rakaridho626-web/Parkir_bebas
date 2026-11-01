// ========================================================
// PANEL SPASIAL 3D (OWNER, PETUGAS, & ADMIN — tanpa sidebar)
// Pojok kanan atas = Dashboard (kondisi sekarang + lantai parkir 3D live)
// Pojok kiri bawah  = Panel Kerja 3D (Owner: Rekap, Petugas: Transaksi, Admin: Master & Log)
// Semua visual 3D memakai CSS 3D (batang cuboid 3D, donat 3D 14 lapis, meja cetak 3D).
// ========================================================

const Owner = (() => {
    const view = document.getElementById('owner-view');
    const page = document.getElementById('owner-page');
    const plane = document.getElementById('lot-plane');
    const cornerTR = document.getElementById('corner-tr');
    const cornerBL = document.getElementById('corner-bl');
    const DWELL = 400;           // ms kursor harus diam di pojok
    const POJOK = 44;            // ukuran area pojok (px)
    const REFRESH = 10000;       // dashboard diperbarui tiap 10 detik
    let halaman = null, timerRefresh = null, timerPojok = null, pojokAktif = null;

    // ---------- Pojok layar (hot corner) ----------
    function pojokDari(x, y) {
        const w = view.clientWidth, h = view.clientHeight;
        if (x >= w - POJOK && y <= POJOK) return cornerTR.dataset.go;
        if (x <= POJOK && y >= h - POJOK) return cornerBL.dataset.go;
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
        const el = view.querySelector(`.corner[data-go="${p}"]`);
        if (el) el.classList.add('isi');
        timerPojok = setTimeout(() => { batalPojok(); location.hash = `#/${p}`; }, DWELL);
    }

    function batalPojok() {
        clearTimeout(timerPojok);
        pojokAktif = null;
        view.querySelectorAll('.corner.isi').forEach(c => c.classList.remove('isi'));
    }

    // ---------- Lantai parkir isometrik (sesuai data area) ----------
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
        }).join('') + '<span class="lot-scan"></span><span class="lot-streak s1"></span><span class="lot-streak s2"></span>';
    }

    // ---------- Halaman Dashboard (Dipakai Owner, Petugas, & Admin) ----------
    async function dashboard() {
        const role = Auth.user?.role || 'owner';
        const labelBawah = role === 'owner'
            ? { href: '#/laporan', teks: '↙ Buka Rekap & Analisis 3D' }
            : role === 'petugas'
            ? { href: '#/transaksi', teks: '↙ Buka Pos Transaksi & Struk 3D' }
            : { href: '#/area', teks: '↙ Buka Master Data & Audit 3D' };

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
                <div style="margin-top:18px">
                    <a class="o-btn" href="${labelBawah.href}" style="text-decoration:none;height:38px;padding:0 18px">${labelBawah.teks}</a>
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

    function donat3D(items, labelTengah = 'kendaraan') {
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
            <div class="donut-center"><b>${items.reduce((a, b) => a + b.jumlah, 0)}</b><small>${UI.esc(labelTengah)}</small></div>
        </div>`;
    }

    function pasangPutarChart(container) {
        container.addEventListener('pointermove', e => {
            const chart = e.target.closest('.chart3d');
            if (!chart) return;
            const r = chart.getBoundingClientRect();
            chart.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 50 - 18).toFixed(1)}deg`);
            chart.style.setProperty('--rx', `${(-14 - ((e.clientY - r.top) / r.height - 0.5) * 16).toFixed(1)}deg`);
        });
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
            acc[k].nilai += Number(r.total_bayar || r.tarif_per_jam || 1);
            return acc;
        }, {})).sort((a, b) => b.nilai - a.nilai);
    }

    function perJam(rows) {
        const jam = Array(24).fill(0);
        rows.forEach(r => jam[new Date(r.waktu_masuk || r.waktu).getHours()]++);
        return jam.map((n, i) => ({ label: String(i).padStart(2, '0'), nilai: n }));
    }

    const rupiahSingkat = n => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.0', '')}jt`
        : n >= 1e3 ? `${Math.round(n / 1e3)}rb` : String(n);

    // ========================================================
    // 1. HALAMAN REKAP (OWNER)
    // ========================================================
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

                requestAnimationFrame(() => requestAnimationFrame(() => isi.classList.add('tumbuh')));
            } catch (err) {
                isi.innerHTML = `<p class="o-note err">${UI.esc(err.message)}</p>`;
            }
        }

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
        pasangPutarChart(isi);

        tampilkan();
        api.get('/area').then(a => gambarLot(a.data)).catch(() => {});
    }

    // ========================================================
    // 2. HALAMAN TRANSAKSI 3D (PETUGAS — Gaya Spasial 3D Owner)
    // ========================================================
    function pratinjauStruk3D(judul, htmlStruk, meta) {
        const el = document.createElement('div');
        el.className = 'pv';
        el.innerHTML = `
            <div class="pv-meja" id="pv-meja" style="display:grid;place-items:center">
                <div class="pv-kertas-wrap" id="pv-wrap" style="width:360px">
                    <span class="pv-tumpuk t1"></span>
                    <div class="pv-kertas" id="pv-kertas" style="min-height:auto;padding:34px 28px;border-radius:10px">${htmlStruk}</div>
                </div>
            </div>
            <aside class="pv-panel">
                <p class="o-eyebrow">Pratinjau Cetak 3D</p>
                <h2>${UI.esc(judul)}</h2>
                <p class="pv-periode">${UI.esc(meta.kode || '')}</p>
                <dl class="pv-info">
                    <dt>Plat Nomor</dt><dd>${UI.esc(meta.plat || '-')}</dd>
                    <dt>Jenis</dt><dd>${UI.esc(meta.jenis || '-')}</dd>
                    <dt>Area</dt><dd>${UI.esc(meta.area || '-')}</dd>
                    <dt>Ukuran</dt><dd>Thermal 72mm</dd>
                </dl>
                <button class="btn-glow pv-cetak" type="button" id="pv-cetak">${UI.icon('print')} Cetak Sekarang</button>
                <button class="pv-batal" type="button" id="pv-batal">Tutup</button>
                <p class="pv-tip">Gerakkan kursor di atas meja untuk memutar struk 3D.</p>
            </aside>`;
        view.appendChild(el);
        const wrap = el.querySelector('#pv-wrap');
        const tutup = () => { el.classList.add('keluar'); setTimeout(() => el.remove(), 250); };
        el.querySelector('#pv-meja').addEventListener('pointermove', e => {
            const r = e.currentTarget.getBoundingClientRect();
            wrap.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 20).toFixed(2)}deg`);
            wrap.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 14).toFixed(2)}deg`);
        });
        el.querySelector('#pv-batal').addEventListener('click', tutup);
        el.querySelector('#pv-cetak').addEventListener('click', () => UI.print(htmlStruk));
        el.querySelector('#pv-cetak').focus();
    }

    async function transaksiPetugas() {
        page.innerHTML = `
            <section class="o-rekap">
                <header class="o-rekap-head">
                    <div>
                        <p class="o-eyebrow"><span class="live-dot"></span> Pos Gerbang & Transaksi · Petugas</p>
                        <h1 class="o-big rp" id="t-hero">–</h1>
                        <p class="o-sub" id="t-sub">kendaraan sedang parkir aktif</p>
                    </div>
                    <form class="o-filter" id="t-cari-cepat">
                        <div class="o-range">
                            <input type="text" name="q" placeholder="Ketik Plat / Kode Tiket..." style="width:220px" required>
                            <button class="o-btn" type="submit">Hitung Keluar</button>
                        </div>
                    </form>
                </header>
                <div id="t-isi"></div>
            </section>`;

        const isi = page.querySelector('#t-isi');
        pasangPutarChart(isi);

        async function muatTransaksi(searchKeluar = '') {
            try {
                const [s, tRes, aRes, kRes, aktifRes] = await Promise.all([
                    api.get('/stats'),
                    api.get('/tarif'),
                    api.get('/area'),
                    api.get('/kendaraan').catch(() => ({ data: [] })),
                    api.get('/transaksi/aktif')
                ]);
                if (halaman !== 'transaksi') return;

                const tarif = tRes.data;
                const areas = aRes.data;
                const kendaraan = kRes.data;
                const aktif = aktifRes.data;
                const jenisAktif = perJenis(aktif);
                const jamSibuk = perJam(aktif).filter(x => x.nilai > 0);
                const batangAktif = jamSibuk.length >= 4
                    ? jamSibuk
                    : [
                        ...areas.map(a => ({ label: a.kode_area, nilai: Number(a.terisi) })),
                        ...jenisAktif.map(j => ({ label: j.jenis.toUpperCase(), nilai: j.jumlah }))
                    ];
                const sisaSlot = Math.max(0, s.kapasitas_total - s.kapasitas_terisi);

                gambarLot(areas);
                page.querySelector('#t-hero').textContent = `${s.parkir_aktif} Aktif`;
                page.querySelector('#t-sub').textContent = `${s.transaksi_hari_ini} selesai hari ini · pendapatan ${UI.rupiah(s.pendapatan_hari_ini)}`;

                isi.innerHTML = `
                    <div class="o-kpis">
                        <div class="o-kpi"><small>Sedang parkir di dalam</small><b>${s.parkir_aktif}</b><em>${s.kapasitas_terisi}/${s.kapasitas_total} slot terisi</em></div>
                        <div class="o-kpi"><small>Transaksi selesai hari ini</small><b>${s.transaksi_hari_ini}</b><em>kendaraan keluar</em></div>
                        <div class="o-kpi"><small>Pendapatan hari ini</small><b>${UI.rupiah(s.pendapatan_hari_ini)}</b><em>kas terkumpul</em></div>
                        <div class="o-kpi"><small>Slot kosong tersedia</small><b>${sisaSlot}</b><em>siap ditempati</em></div>
                    </div>

                    <div class="o-grid">
                        <article class="o-card">
                            <header><h3>Gate Check-In (Masuk)</h3><span>cetak karcis 3D</span></header>
                            <form id="f-masuk" class="form" style="margin-top:10px">
                                <label>Plat Nomor
                                    <input name="plat_nomor" list="dl-plat-3d" class="upper" placeholder="Contoh: B 1234 ABC" required autocomplete="off">
                                </label>
                                <datalist id="dl-plat-3d">${kendaraan.map(x => `<option value="${UI.esc(x.plat_nomor)}">${UI.esc(x.jenis_kendaraan)} · ${UI.esc(x.pemilik)}</option>`).join('')}</datalist>
                                <label>Jenis Kendaraan
                                    <select name="id_tarif" required>
                                        <option value="">— Pilih jenis —</option>
                                        ${tarif.map(x => `<option value="${x.id}">${UI.esc(x.jenis_kendaraan)} (${UI.rupiah(x.tarif_per_jam)}/jam)</option>`).join('')}
                                    </select>
                                </label>
                                <label>Area Parkir
                                    <select name="id_area" required>
                                        <option value="">— Pilih area —</option>
                                        ${areas.map(x => {
                                            const sisa = x.kapasitas - x.terisi;
                                            return `<option value="${x.id}" ${sisa <= 0 ? 'disabled' : ''}>${UI.esc(x.kode_area)} · ${UI.esc(x.nama_area)} (sisa ${Math.max(0, sisa)})</option>`;
                                        }).join('')}
                                    </select>
                                </label>
                                <button class="btn-glow" type="submit" style="width:100%;cursor:pointer">${UI.icon('print')} Simpan & Karcis 3D</button>
                            </form>
                        </article>

                        <article class="o-card">
                            <header><h3>Gate Check-Out (Keluar)</h3><span>hitung & bayar</span></header>
                            <div id="box-keluar" style="margin-top:10px">
                                <p class="o-note">Pilih kendaraan dari tabel di bawah atau ketik plat nomor di pojok kanan atas untuk menghitung tarif keluar.</p>
                            </div>
                        </article>

                        <article class="o-card">
                            <header><h3>Komposisi parkir aktif</h3><span>3D donat live</span></header>
                            ${jenisAktif.length ? `
                                ${donat3D(jenisAktif, 'aktif')}
                                <ul class="o-legend-list">${jenisAktif.map((j, i) => `
                                    <li><i style="background:${WARNA_JENIS[i % WARNA_JENIS.length]}"></i>
                                        <span>${UI.esc(j.jenis)}<small>sedang parkir</small></span>
                                        <b>${j.jumlah} unit<small>${Math.round(j.jumlah / (aktif.length || 1) * 100)}%</small></b>
                                    </li>`).join('')}
                                </ul>` : '<p class="o-note">Belum ada kendaraan aktif.</p>'}
                        </article>

                        <article class="o-card o-wide">
                            <header><h3>Volume kendaraan aktif per area & jenis (3D)</h3><span>gerakkan kursor untuk memutar balok 3D</span></header>
                            ${batang3D(batangAktif, { tinggi: 180, lebar: 36, dalam: 26 })}
                        </article>

                        <article class="o-card">
                            <header><h3>Keterisian per area</h3><span>status real-time</span></header>
                            <div class="o-areas" style="margin-top:12px">
                                ${areas.map(x => {
                                    const p = x.kapasitas ? Math.round(x.terisi / x.kapasitas * 100) : 0;
                                    return `<div class="o-area ${p >= 100 ? 'penuh' : ''}">
                                        <b>${UI.esc(x.kode_area)}</b><span>${UI.esc(x.nama_area)} (${x.terisi}/${x.kapasitas})</span>
                                        <em>${p}%</em>
                                    </div>`;
                                }).join('')}
                            </div>
                        </article>

                        <article class="o-card o-full">
                            <header>
                                <h3>Kendaraan sedang di dalam (${aktif.length})</h3>
                                <input type="search" id="cari-aktif-3d" placeholder="Filter plat / kode tiket..." style="width:240px;height:34px">
                            </header>
                            <div class="o-table" id="wrap-tabel-aktif"></div>
                        </article>
                    </div>`;

                requestAnimationFrame(() => requestAnimationFrame(() => isi.classList.add('tumbuh')));

                const fMasuk = isi.querySelector('#f-masuk');
                fMasuk.plat_nomor.addEventListener('input', () => {
                    const plat = fMasuk.plat_nomor.value.trim().toUpperCase();
                    const k = kendaraan.find(x => x.plat_nomor === plat);
                    if (k) {
                        const t = tarif.find(x => x.jenis_kendaraan.toLowerCase() === k.jenis_kendaraan.toLowerCase());
                        if (t) fMasuk.id_tarif.value = t.id;
                    }
                });

                fMasuk.addEventListener('submit', async e => {
                    e.preventDefault();
                    try {
                        const res = await api.post('/transaksi/masuk', {
                            plat_nomor: fMasuk.plat_nomor.value.trim().toUpperCase(),
                            id_tarif: Number(fMasuk.id_tarif.value),
                            id_area: Number(fMasuk.id_area.value),
                            id_user: Auth.user.id
                        });
                        UI.toast(res.message);
                        pratinjauStruk3D('Karcis Parkir Masuk', Struk.karcis(res.tiket), {
                            kode: res.tiket.kode_tiket,
                            plat: res.tiket.plat_nomor,
                            jenis: res.tiket.jenis_kendaraan,
                            area: res.tiket.nama_area
                        });
                        muatTransaksi();
                    } catch (err) {
                        UI.toast(err.message, 'err');
                    }
                });

                async function prosesHitungKeluar(kodeAtauPlat) {
                    const box = isi.querySelector('#box-keluar');
                    box.innerHTML = '<p class="o-note"><span class="spinner"></span> Menghitung tarif...</p>';
                    try {
                        const { transaksi: t, estimasi: est } = await api.post('/transaksi/hitung-keluar', { search: kodeAtauPlat });
                        box.innerHTML = `
                            <div class="detail" style="margin-top:4px">
                                <div class="detail-head">
                                    <span class="plat">${UI.esc(t.plat_nomor)}</span>
                                    <span class="mono small">${UI.esc(t.kode_tiket)}</span>
                                </div>
                                <dl>
                                    <dt>Jenis</dt><dd>${UI.esc(t.jenis_kendaraan)}</dd>
                                    <dt>Area</dt><dd>${UI.esc(t.nama_area)}</dd>
                                    <dt>Masuk</dt><dd>${UI.tanggal(t.waktu_masuk)}</dd>
                                    <dt>Durasi</dt><dd>${est.durasi_jam} jam (${UI.lama(t.waktu_masuk)})</dd>
                                </dl>
                                <div class="total"><span>Total Bayar</span><b>${UI.rupiah(est.total_bayar)}</b></div>
                                <button class="btn-glow" id="btn-bayar-3d" type="button" style="width:100%;cursor:pointer">${UI.icon('print')} Terima Bayar & Struk 3D</button>
                            </div>`;
                        box.querySelector('#btn-bayar-3d').addEventListener('click', async () => {
                            try {
                                const res = await api.post('/transaksi/bayar', { id: t.id, id_user: Auth.user.id });
                                UI.toast(res.message);
                                pratinjauStruk3D('Struk Pembayaran Parkir', Struk.bayar(res.struk), {
                                    kode: res.struk.kode_tiket,
                                    plat: res.struk.plat_nomor,
                                    jenis: res.struk.jenis_kendaraan,
                                    area: res.struk.nama_area
                                });
                                muatTransaksi();
                            } catch (err) {
                                UI.toast(err.message, 'err');
                            }
                        });
                    } catch (err) {
                        box.innerHTML = `<p class="o-note err">${UI.esc(err.message)}</p>`;
                    }
                }

                function gambarTabelAktif() {
                    const q = (isi.querySelector('#cari-aktif-3d')?.value || '').trim().toLowerCase();
                    const list = q ? aktif.filter(x => (x.plat_nomor + ' ' + x.kode_tiket + ' ' + x.nama_area).toLowerCase().includes(q)) : aktif;
                    const wrap = isi.querySelector('#wrap-tabel-aktif');
                    wrap.innerHTML = list.length ? `<table>
                        <thead><tr><th>Kode Tiket</th><th>Plat Nomor</th><th>Jenis</th><th>Area</th><th>Waktu Masuk</th><th>Durasi</th><th class="right">Aksi</th></tr></thead>
                        <tbody>${list.map(x => `<tr>
                            <td class="mono">${UI.esc(x.kode_tiket)}</td>
                            <td><span class="plat">${UI.esc(x.plat_nomor)}</span></td>
                            <td>${UI.esc(x.jenis_kendaraan)}</td>
                            <td>${UI.esc(x.kode_area)} · ${UI.esc(x.nama_area)}</td>
                            <td>${UI.tanggal(x.waktu_masuk)}</td>
                            <td>${UI.lama(x.waktu_masuk)}</td>
                            <td class="right">
                                <button class="o-btn" data-checkout="${UI.esc(x.kode_tiket)}" type="button" style="height:28px;font-size:11.5px">Proses Keluar →</button>
                            </td>
                        </tr>`).join('')}</tbody>
                    </table>` : '<p class="o-note" style="padding:18px">Tidak ada kendaraan ditemukan.</p>';
                }

                gambarTabelAktif();
                isi.querySelector('#cari-aktif-3d').addEventListener('input', gambarTabelAktif);
                isi.querySelector('#wrap-tabel-aktif').addEventListener('click', e => {
                    const b = e.target.closest('[data-checkout]');
                    if (b) prosesHitungKeluar(b.dataset.checkout);
                });

                if (searchKeluar) prosesHitungKeluar(searchKeluar);
                else if (aktif.length) prosesHitungKeluar(aktif[0].kode_tiket);
            } catch (err) {
                isi.innerHTML = `<p class="o-note err">${UI.esc(err.message)}</p>`;
            }
        }

        page.querySelector('#t-cari-cepat').addEventListener('submit', e => {
            e.preventDefault();
            muatTransaksi(e.target.q.value.trim());
        });

        muatTransaksi();
    }

    // ========================================================
    // 3. HALAMAN MASTER DATA & AUDIT 3D (ADMIN — Gaya Spasial 3D Owner)
    // ========================================================
    const TAB_ADMIN = [
        { id: 'area', label: 'Area Parkir' },
        { id: 'tarif', label: 'Tarif Parkir' },
        { id: 'kendaraan', label: 'Data Kendaraan' },
        { id: 'users', label: 'Data User' },
        { id: 'log', label: 'Log Aktivitas' }
    ];

    async function masterAdmin(tabAktif = 'area') {
        if (!TAB_ADMIN.some(t => t.id === tabAktif)) tabAktif = 'area';
        page.innerHTML = `
            <section class="o-rekap">
                <header class="o-rekap-head">
                    <div>
                        <p class="o-eyebrow"><span class="live-dot"></span> Panel Master & Audit 3D · Admin</p>
                        <h1 class="o-big rp" id="a-hero">–</h1>
                        <p class="o-sub" id="a-sub">kelola seluruh entitas parkir dalam ruang 3D</p>
                    </div>
                    <div class="o-filter">
                        <div class="o-chips" id="a-tabs">
                            ${TAB_ADMIN.map(t => `<button type="button" data-tab="${t.id}" class="${t.id === tabAktif ? 'on' : ''}">${t.label}</button>`).join('')}
                        </div>
                        <div class="o-range">
                            <input type="search" id="a-cari" placeholder="Cari data di tabel..." style="width:210px">
                            <button class="o-btn" type="button" id="a-tambah">${UI.icon('plus')} Tambah Data</button>
                        </div>
                    </div>
                </header>
                <div id="a-isi"></div>
            </section>`;

        const isi = page.querySelector('#a-isi');
        const btnTambah = page.querySelector('#a-tambah');
        const inputCari = page.querySelector('#a-cari');
        pasangPutarChart(isi);

        page.querySelector('#a-tabs').addEventListener('click', e => {
            const b = e.target.closest('[data-tab]');
            if (!b) return;
            location.hash = `#/${b.dataset.tab}`;
        });

        async function muatAdmin() {
            isi.innerHTML = '<p class="o-note"><span class="spinner"></span> Memuat data 3D...</p>';
            try {
                const [uRes, tRes, aRes, kRes, lRes] = await Promise.all([
                    api.get('/users'),
                    api.get('/tarif'),
                    api.get('/area'),
                    api.get('/kendaraan'),
                    api.get('/logs')
                ]);
                const users = uRes.data, tarif = tRes.data, areas = aRes.data, kendaraan = kRes.data, logs = lRes.data;
                gambarLot(areas);

                const totalKap = areas.reduce((s, x) => s + Number(x.kapasitas), 0);
                const totalTerisi = areas.reduce((s, x) => s + Number(x.terisi), 0);

                // Konfigurasi per tab
                const judulHero = {
                    area: [`${areas.length} Area`, `${totalTerisi} dari ${totalKap} slot terisi saat ini`],
                    tarif: [`${tarif.length} Tarif`, 'skema harga parkir per jam aktif'],
                    kendaraan: [`${kendaraan.length} Unit`, 'kendaraan terdaftar di database'],
                    users: [`${users.length} Akun`, 'operator admin, petugas, & owner'],
                    log: [`${logs.length} Audit`, 'rekaman aktivitas terbaru sistem']
                }[tabAktif];

                page.querySelector('#a-hero').textContent = judulHero[0];
                page.querySelector('#a-sub').textContent = judulHero[1];
                btnTambah.style.display = tabAktif === 'log' ? 'none' : '';
                btnTambah.innerHTML = `${UI.icon('plus')} Tambah ${TAB_ADMIN.find(t => t.id === tabAktif).label.replace('Data ', '')}`;

                // Data grafik batang 3D & donat 3D sesuai tab
                let dataBatang = [], judulBatang = '', fmtBatang = x => x;
                let dataDonat = [], labelDonat = 'unit', judulDonat = '';

                if (tabAktif === 'area') {
                    judulBatang = 'Kapasitas & keterisian per area (3D)';
                    dataBatang = areas.map(a => ({ label: a.kode_area, nilai: Number(a.kapasitas) }));
                    judulDonat = 'Proporsi kendaraan terparkir';
                    labelDonat = 'terisi';
                    dataDonat = areas.map(a => ({ jenis: `${a.kode_area} (${a.nama_area})`, jumlah: Number(a.terisi), nilai: Math.max(1, Number(a.terisi)) }));
                } else if (tabAktif === 'tarif') {
                    judulBatang = 'Perbandingan tarif per jam (3D)';
                    fmtBatang = rupiahSingkat;
                    dataBatang = tarif.map(t => ({ label: t.jenis_kendaraan, nilai: Number(t.tarif_per_jam) }));
                    judulDonat = 'Struktur tarif parkir';
                    labelDonat = 'tarif';
                    dataDonat = tarif.map(t => ({ jenis: t.jenis_kendaraan, jumlah: 1, nilai: Number(t.tarif_per_jam) }));
                } else if (tabAktif === 'users') {
                    judulBatang = 'Jumlah akun per hak akses (3D)';
                    const roles = ['admin', 'petugas', 'owner'];
                    dataBatang = roles.map(r => ({ label: r.toUpperCase(), nilai: users.filter(u => u.role === r).length }));
                    judulDonat = 'Komposisi role pengguna';
                    labelDonat = 'akun';
                    dataDonat = dataBatang.map(d => ({ jenis: d.label, jumlah: d.nilai, nilai: Math.max(1, d.nilai) }));
                } else if (tabAktif === 'kendaraan') {
                    judulBatang = 'Volume kendaraan per jenis & area (3D)';
                    const jData = perJenis(kendaraan);
                    dataBatang = [
                        ...jData.map(j => ({ label: j.jenis.toUpperCase(), nilai: j.jumlah })),
                        ...areas.map(a => ({ label: a.kode_area, nilai: Number(a.terisi) }))
                    ];
                    judulDonat = 'Proporsi kendaraan per jenis';
                    labelDonat = 'kendaraan';
                    dataDonat = jData;
                } else {
                    judulBatang = 'Volume aktivitas audit per operator & aksi (3D)';
                    const byUser = {};
                    logs.forEach(l => {
                        const k = (l.username || 'sistem').toUpperCase();
                        byUser[k] = (byUser[k] || 0) + 1;
                    });
                    dataBatang = Object.entries(byUser).map(([label, nilai]) => ({ label, nilai }));
                    judulDonat = 'Proporsi log per operator';
                    labelDonat = 'log';
                    dataDonat = dataBatang.map(d => ({ jenis: d.label, jumlah: d.nilai, nilai: Math.max(1, d.nilai) }));
                }

                isi.innerHTML = `
                    <div class="o-kpis">
                        <div class="o-kpi"><small>Kapasitas ruang parkir</small><b>${totalTerisi} / ${totalKap}</b><em>${areas.length} area aktif</em></div>
                        <div class="o-kpi"><small>Kategori tarif</small><b>${tarif.length} Jenis</b><em>mulai ${UI.rupiah(Math.min(...tarif.map(t => t.tarif_per_jam)))}/jam</em></div>
                        <div class="o-kpi"><small>Kendaraan tercatat</small><b>${kendaraan.length} Unit</b><em>database plat nomor</em></div>
                        <div class="o-kpi"><small>Pengguna & log audit</small><b>${users.length} User</b><em>${logs.length} aktivitas terekam</em></div>
                    </div>

                    <div class="o-grid">
                        <article class="o-card o-wide">
                            <header><h3>${judulBatang}</h3><span>gerakkan kursor untuk memutar</span></header>
                            ${batang3D(dataBatang, {
                                format: fmtBatang,
                                tinggi: dataBatang.length > 12 ? 120 : 185,
                                lebar: dataBatang.length > 12 ? 14 : 42,
                                dalam: dataBatang.length > 12 ? 12 : 28,
                                kelas: dataBatang.length > 12 ? 'kecil' : ''
                            })}
                        </article>

                        <article class="o-card">
                            <header><h3>${judulDonat}</h3></header>
                            ${donat3D(dataDonat, labelDonat)}
                            <ul class="o-legend-list">${dataDonat.map((j, i) => `
                                <li><i style="background:${WARNA_JENIS[i % WARNA_JENIS.length]}"></i>
                                    <span>${UI.esc(j.jenis)}</span>
                                    <b>${j.jumlah} ${labelDonat}</b>
                                </li>`).join('')}
                            </ul>
                        </article>

                        <article class="o-card o-full">
                            <header>
                                <h3>Daftar ${TAB_ADMIN.find(t => t.id === tabAktif).label}</h3>
                                <span id="a-jml-baris"></span>
                            </header>
                            <div class="o-table" id="a-tabel-wrap"></div>
                        </article>
                    </div>`;

                requestAnimationFrame(() => requestAnimationFrame(() => isi.classList.add('tumbuh')));

                function gambarTabelAdmin() {
                    const q = inputCari.value.trim().toLowerCase();
                    const wrap = isi.querySelector('#a-tabel-wrap');
                    const jmlSpan = isi.querySelector('#a-jml-baris');

                    if (tabAktif === 'area') {
                        const list = areas.filter(r => !q || (r.kode_area + ' ' + r.nama_area).toLowerCase().includes(q));
                        jmlSpan.textContent = `${list.length} area`;
                        wrap.innerHTML = `<table>
                            <thead><tr><th>Kode</th><th>Nama Area</th><th>Terisi / Kapasitas</th><th>Status 3D</th><th class="right">Aksi</th></tr></thead>
                            <tbody>${list.map(r => {
                                const p = r.kapasitas ? Math.round(r.terisi / r.kapasitas * 100) : 0;
                                return `<tr>
                                    <td><b>${UI.esc(r.kode_area)}</b></td>
                                    <td>${UI.esc(r.nama_area)}</td>
                                    <td>${r.terisi} / ${r.kapasitas} slot (${p}%)</td>
                                    <td><div class="meter" style="max-width:160px"><span style="width:${Math.min(100, p)}%" class="${p >= 100 ? 'full' : ''}"></span></div></td>
                                    <td class="right">
                                        <button class="icon-btn" data-edit="${r.id}" title="Ubah">${UI.icon('edit')}</button>
                                        <button class="icon-btn danger" data-hapus="${r.id}" title="Hapus">${UI.icon('trash')}</button>
                                    </td>
                                </tr>`;
                            }).join('')}</tbody>
                        </table>`;
                    } else if (tabAktif === 'tarif') {
                        const list = tarif.filter(r => !q || r.jenis_kendaraan.toLowerCase().includes(q));
                        jmlSpan.textContent = `${list.length} tarif`;
                        wrap.innerHTML = `<table>
                            <thead><tr><th>No</th><th>Jenis Kendaraan</th><th class="right">Tarif per Jam</th><th class="right">Aksi</th></tr></thead>
                            <tbody>${list.map((r, i) => `<tr>
                                <td class="mono">${i + 1}</td>
                                <td><b>${UI.esc(r.jenis_kendaraan.toUpperCase())}</b></td>
                                <td class="right"><b>${UI.rupiah(r.tarif_per_jam)}</b></td>
                                <td class="right">
                                    <button class="icon-btn" data-edit="${r.id}" title="Ubah">${UI.icon('edit')}</button>
                                    <button class="icon-btn danger" data-hapus="${r.id}" title="Hapus">${UI.icon('trash')}</button>
                                </td>
                            </tr>`).join('')}</tbody>
                        </table>`;
                    } else if (tabAktif === 'kendaraan') {
                        const list = kendaraan.filter(r => !q || (r.plat_nomor + ' ' + r.jenis_kendaraan + ' ' + r.pemilik).toLowerCase().includes(q));
                        jmlSpan.textContent = `${list.length} kendaraan`;
                        wrap.innerHTML = `<table>
                            <thead><tr><th>No</th><th>Plat Nomor</th><th>Jenis</th><th>Warna</th><th>Pemilik</th><th class="right">Aksi</th></tr></thead>
                            <tbody>${list.map((r, i) => `<tr>
                                <td class="mono">${i + 1}</td>
                                <td><span class="plat">${UI.esc(r.plat_nomor)}</span></td>
                                <td>${UI.esc(r.jenis_kendaraan)}</td>
                                <td>${UI.esc(r.warna || '-')}</td>
                                <td>${UI.esc(r.pemilik || '-')}</td>
                                <td class="right">
                                    <button class="icon-btn" data-edit="${r.id}" title="Ubah">${UI.icon('edit')}</button>
                                    <button class="icon-btn danger" data-hapus="${r.id}" title="Hapus">${UI.icon('trash')}</button>
                                </td>
                            </tr>`).join('')}</tbody>
                        </table>`;
                    } else if (tabAktif === 'users') {
                        const list = users.filter(r => !q || (r.username + ' ' + r.nama_lengkap + ' ' + r.role).toLowerCase().includes(q));
                        jmlSpan.textContent = `${list.length} akun`;
                        wrap.innerHTML = `<table>
                            <thead><tr><th>No</th><th>Nama Lengkap</th><th>Username</th><th>Role</th><th class="right">Aksi</th></tr></thead>
                            <tbody>${list.map((r, i) => `<tr>
                                <td class="mono">${i + 1}</td>
                                <td><b>${UI.esc(r.nama_lengkap)}</b></td>
                                <td class="mono">${UI.esc(r.username)}</td>
                                <td><span class="badge badge-${UI.esc(r.role)}">${UI.esc(r.role)}</span></td>
                                <td class="right">
                                    <button class="icon-btn" data-edit="${r.id}" title="Ubah">${UI.icon('edit')}</button>
                                    ${r.id !== Auth.user.id ? `<button class="icon-btn danger" data-hapus="${r.id}" title="Hapus">${UI.icon('trash')}</button>` : ''}
                                </td>
                            </tr>`).join('')}</tbody>
                        </table>`;
                    } else if (tabAktif === 'log') {
                        const list = logs.filter(r => !q || (r.username + ' ' + r.aktivitas).toLowerCase().includes(q));
                        jmlSpan.textContent = `${list.length} aktivitas`;
                        wrap.innerHTML = `<table>
                            <thead><tr><th>Waktu</th><th>User</th><th>Aktivitas</th></tr></thead>
                            <tbody>${list.map(r => `<tr>
                                <td class="mono">${UI.tanggal(r.waktu)}</td>
                                <td><span class="badge">${UI.esc(r.username)}</span></td>
                                <td>${UI.esc(r.aktivitas)}</td>
                            </tr>`).join('')}</tbody>
                        </table>`;
                    }
                }

                gambarTabelAdmin();
                inputCari.oninput = gambarTabelAdmin;

                function bukaFormAdmin(row = null) {
                    const mapCfg = {
                        area: {
                            nama: 'Area Parkir', endpoint: '/area',
                            fields: [
                                { name: 'nama_area', label: 'Nama Area', required: true },
                                { name: 'kapasitas', label: 'Kapasitas (slot)', type: 'number', min: 1, required: true }
                            ]
                        },
                        tarif: {
                            nama: 'Tarif Parkir', endpoint: '/tarif',
                            fields: [
                                { name: 'jenis_kendaraan', label: 'Jenis Kendaraan', required: true, placeholder: 'motor / mobil / lainnya' },
                                { name: 'tarif_per_jam', label: 'Tarif per Jam (Rp)', type: 'number', min: 0, required: true }
                            ]
                        },
                        kendaraan: {
                            nama: 'Kendaraan', endpoint: '/kendaraan',
                            fields: [
                                { name: 'plat_nomor', label: 'Plat Nomor', required: true, upper: true, placeholder: 'B 1234 ABC' },
                                { name: 'jenis_kendaraan', label: 'Jenis Kendaraan', type: 'select', options: tarif.map(t => ({ value: t.jenis_kendaraan, label: t.jenis_kendaraan })), required: true },
                                { name: 'warna', label: 'Warna', placeholder: 'Hitam / Putih' },
                                { name: 'pemilik', label: 'Pemilik', placeholder: 'Nama pemilik' }
                            ]
                        },
                        users: {
                            nama: 'User', endpoint: '/users',
                            fields: [
                                { name: 'nama_lengkap', label: 'Nama Lengkap', required: true },
                                { name: 'username', label: 'Username', required: true },
                                { name: 'password', label: 'Password', type: 'password', required: !row, hint: row ? 'Kosongkan bila tidak diubah.' : '' },
                                { name: 'role', label: 'Role', type: 'select', options: [{ value: 'admin', label: 'Admin' }, { value: 'petugas', label: 'Petugas' }, { value: 'owner', label: 'Owner' }], required: true }
                            ]
                        }
                    }[tabAktif];
                    if (!mapCfg) return;

                    UI.formModal({
                        title: `${row ? 'Ubah' : 'Tambah'} ${mapCfg.nama}`,
                        fields: mapCfg.fields,
                        data: row || {},
                        onSubmit: async values => {
                            const body = { ...values, currentUserId: Auth.user.id };
                            const res = row
                                ? await api.put(`${mapCfg.endpoint}/${row.id}`, body)
                                : await api.post(mapCfg.endpoint, body);
                            UI.toast(res.message);
                            muatAdmin();
                        }
                    });
                }

                btnTambah.onclick = () => bukaFormAdmin(null);
                isi.querySelector('#a-tabel-wrap').addEventListener('click', async e => {
                    const edit = e.target.closest('[data-edit]');
                    const hapus = e.target.closest('[data-hapus]');
                    const sumber = { area: areas, tarif, kendaraan, users }[tabAktif] || [];
                    const ep = { area: '/area', tarif: '/tarif', kendaraan: '/kendaraan', users: '/users' }[tabAktif];
                    if (edit) {
                        const row = sumber.find(x => String(x.id) === edit.dataset.edit);
                        if (row) bukaFormAdmin(row);
                    }
                    if (hapus) {
                        const row = sumber.find(x => String(x.id) === hapus.dataset.hapus);
                        if (!row || !await UI.confirm('Hapus data ini dari sistem?')) return;
                        try {
                            const res = await api.del(`${ep}/${row.id}?currentUserId=${Auth.user.id}`);
                            UI.toast(res.message);
                            muatAdmin();
                        } catch (err) {
                            UI.toast(err.message, 'err');
                        }
                    }
                });
            } catch (err) {
                isi.innerHTML = `<p class="o-note err">${UI.esc(err.message)}</p>`;
            }
        }

        muatAdmin();
    }

    // ---------- Navigasi Spasial 3D ----------
    function buka(id) {
        clearInterval(timerRefresh);
        batalPojok();
        halaman = id;
        // Semua halaman selain dashboard meredupkan lantai parkir latar (.lot-stage) seperti halaman Rekap Owner
        view.dataset.halaman = id === 'dashboard' ? 'dashboard' : 'laporan';
        const targetCorner = id === 'dashboard' ? 'dashboard' : cornerBL.dataset.go;
        view.querySelectorAll('.corner').forEach(c => c.classList.toggle('di-sini', c.dataset.go === targetCorner));
        page.scrollTop = 0;
        page.classList.remove('masuk');
        void page.offsetWidth;
        page.classList.add('masuk');

        if (id === 'dashboard') return dashboard();
        if (id === 'laporan') return rekap();
        if (id === 'transaksi') return transaksiPetugas();
        return masterAdmin(id);
    }

    view.addEventListener('pointermove', onMove);
    view.addEventListener('pointerleave', batalPojok);

    return {
        buka,
        show(onLogout) {
            const role = Auth.user?.role || 'owner';
            view.hidden = false;
            view.dataset.role = role;
            document.getElementById('owner-name').textContent = `${Auth.user.nama_lengkap} (${role.toUpperCase()})`;
            document.getElementById('owner-logout').onclick = onLogout;

            const cfgPojok = {
                owner: { sub: 'Panel Owner', blGo: 'laporan', blTitle: 'Rekap', blSub: 'analisis transaksi' },
                petugas: { sub: 'Panel Petugas', blGo: 'transaksi', blTitle: 'Transaksi', blSub: 'keluar-masuk 3D' },
                admin: { sub: 'Panel Admin', blGo: 'area', blTitle: 'Master 3D', blSub: 'area, tarif, user, log' }
            }[role];

            document.getElementById('owner-sub').textContent = cfgPojok.sub;
            cornerBL.dataset.go = cfgPojok.blGo;
            cornerBL.href = `#/${cfgPojok.blGo}`;
            document.getElementById('corner-bl-b').textContent = cfgPojok.blTitle;
            document.getElementById('corner-bl-s').textContent = cfgPojok.blSub;
        },
        hide() {
            view.hidden = true;
            clearInterval(timerRefresh);
            halaman = null;
            page.innerHTML = '';
        }
    };
})();

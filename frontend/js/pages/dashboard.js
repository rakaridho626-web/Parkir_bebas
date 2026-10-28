// ========================================================
// HALAMAN DASHBOARD (SEMUA ROLE): ringkasan hari ini + isi area
// ========================================================

Pages.dashboard = async function (page) {
    const user = Auth.user;
    page.innerHTML = `
        <p class="sapaan">Halo, <b>${UI.esc(user.nama_lengkap)}</b> 👋</p>
        <div class="stats" id="stats"></div>
        <section class="card">
            <div class="card-head"><h3>Keterisian Area Parkir</h3></div>
            <div id="area"></div>
        </section>`;

    const statsEl = page.querySelector('#stats');
    const areaEl = page.querySelector('#area');
    UI.loading(statsEl);
    UI.loading(areaEl);

    try {
        const [s, a] = await Promise.all([api.get('/stats'), api.get('/area')]);
        const persen = s.kapasitas_total ? Math.round(s.kapasitas_terisi / s.kapasitas_total * 100) : 0;

        statsEl.innerHTML = [
            { label: 'Kendaraan di Dalam', nilai: s.parkir_aktif, ikon: 'car' },
            { label: 'Transaksi Hari Ini', nilai: s.transaksi_hari_ini, ikon: 'list' },
            { label: 'Pendapatan Hari Ini', nilai: UI.rupiah(s.pendapatan_hari_ini), ikon: 'chart' },
            { label: 'Slot Terisi', nilai: `${s.kapasitas_terisi} / ${s.kapasitas_total}`, ikon: 'grid', sub: `${persen}% terpakai` }
        ].map(x => `
            <div class="stat">
                <span class="stat-ic">${UI.icon(x.ikon)}</span>
                <div>
                    <small>${x.label}</small>
                    <b>${x.nilai}</b>
                    ${x.sub ? `<small class="muted">${x.sub}</small>` : ''}
                </div>
            </div>`).join('');

        areaEl.innerHTML = a.data.length ? `<div class="area-list">${a.data.map(x => {
            const p = x.kapasitas ? Math.round(x.terisi / x.kapasitas * 100) : 0;
            return `<div class="area-item">
                <div class="area-top"><b>${UI.esc(x.kode_area)}</b> <span>${UI.esc(x.nama_area)}</span>
                    <span class="muted small">${x.terisi}/${x.kapasitas}</span></div>
                <div class="meter"><span style="width:${Math.min(100, p)}%" class="${p >= 90 ? 'full' : ''}"></span></div>
            </div>`;
        }).join('')}</div>` : '<div class="empty">Belum ada area parkir.</div>';
    } catch (err) {
        UI.error(statsEl, err);
        areaEl.innerHTML = '';
    }
};

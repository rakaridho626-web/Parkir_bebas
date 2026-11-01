// ========================================================
// HALAMAN DASHBOARD (SEMUA ROLE): ringkasan hari ini + isi area
// ========================================================

Pages.dashboard = async function (page) {
    const user = Auth.user;
    page.innerHTML = `
        <div class="dash-head">
            <div>
                <span class="eyebrow-sm"><span class="live-dot"></span> PANEL KENDALI · ${UI.esc(user.role).toUpperCase()}</span>
                <p class="sapaan">Halo, <b>${UI.esc(user.nama_lengkap)}</b></p>
            </div>
            <span class="badge badge-${UI.esc(user.role)}">${UI.esc(user.role)}</span>
        </div>
        <div class="stats" id="stats"></div>
        <div id="peta-3d"></div>
        <section class="card">
            <div class="card-head">
                <h3>Detail Kuota Area Parkir</h3>
                <span class="muted small">Status keterisian tiap blok</span>
            </div>
            <div id="area"></div>
        </section>`;

    const statsEl = page.querySelector('#stats');
    const petaEl = page.querySelector('#peta-3d');
    const areaEl = page.querySelector('#area');
    UI.loading(statsEl);
    UI.loading(areaEl);

    try {
        const [s, a] = await Promise.all([api.get('/stats'), api.get('/area')]);
        const persen = s.kapasitas_total ? Math.round(s.kapasitas_terisi / s.kapasitas_total * 100) : 0;

        statsEl.innerHTML = [
            { label: 'Kendaraan di Dalam', nilai: s.parkir_aktif, ikon: 'car', sub: 'Sedang parkir aktif' },
            { label: 'Transaksi Hari Ini', nilai: s.transaksi_hari_ini, ikon: 'list', sub: 'Kendaraan selesai keluar' },
            { label: 'Pendapatan Hari Ini', nilai: UI.rupiah(s.pendapatan_hari_ini), ikon: 'chart', sub: 'Akumulasi kas hari ini' },
            { label: 'Total Slot Terisi', nilai: `${s.kapasitas_terisi} / ${s.kapasitas_total}`, ikon: 'grid', sub: `${persen}% kapasitas terpakai` }
        ].map(x => `
            <div class="stat">
                <span class="stat-ic">${UI.icon(x.ikon)}</span>
                <div>
                    <small>${x.label}</small>
                    <b>${x.nilai}</b>
                    ${x.sub ? `<small class="muted">${x.sub}</small>` : ''}
                </div>
            </div>`).join('');

        petaEl.innerHTML = UI.lot3D(a.data);
        UI.pasangStage3D(petaEl);

        areaEl.innerHTML = a.data.length ? `<div class="area-list">${a.data.map(x => {
            const p = x.kapasitas ? Math.round(x.terisi / x.kapasitas * 100) : 0;
            const sisa = Math.max(0, x.kapasitas - x.terisi);
            return `<div class="area-item">
                <div class="area-top">
                    <b>${UI.esc(x.kode_area)}</b>
                    <span>${UI.esc(x.nama_area)}</span>
                    <span class="badge-slot ${p >= 90 ? 'full' : ''}">${x.terisi}/${x.kapasitas}</span>
                </div>
                <div class="meter"><span style="width:${Math.min(100, p)}%" class="${p >= 90 ? 'full' : ''}"></span></div>
                <div class="area-foot">
                    <small class="muted">${p}% terisi</small>
                    <small class="muted">Tersedia ${sisa} slot</small>
                </div>
            </div>`;
        }).join('')}</div>` : '<div class="empty">Belum ada area parkir.</div>';
    } catch (err) {
        UI.error(statsEl, err);
        areaEl.innerHTML = '';
    }
};

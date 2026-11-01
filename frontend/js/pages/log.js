// ========================================================
// HALAMAN LOG AKTIVITAS (ADMIN)
// ========================================================

Pages.log = async function (page) {
    page.innerHTML = `
        <div class="stats" id="log-stats"></div>
        <section class="card card-3d">
            <div class="toolbar">
                <div>
                    <span class="eyebrow-sm">AUDIT TRAIL · REAL-TIME</span>
                    <h3>Log Aktivitas Sistem <span class="badge" id="jml-log">0</span></h3>
                </div>
                <div class="toolbar-kanan">
                    <div class="search">${UI.icon('search')}<input type="search" id="cari" placeholder="Cari user / aktivitas..."></div>
                    <span class="muted small">100 aktivitas terakhir</span>
                </div>
            </div>
            <div id="tabel"></div>
        </section>`;

    const statsEl = page.querySelector('#log-stats');
    const jmlEl = page.querySelector('#jml-log');
    const tabel = page.querySelector('#tabel');
    const cari = page.querySelector('#cari');
    let rows = [];

    function draw() {
        const q = cari.value.trim().toLowerCase();
        const list = q ? rows.filter(r => (r.username + ' ' + r.aktivitas).toLowerCase().includes(q)) : rows;
        jmlEl.textContent = list.length;
        tabel.innerHTML = list.length ? `
            <div class="table-wrap"><table>
                <thead><tr><th>Waktu</th><th>User</th><th>Aktivitas</th></tr></thead>
                <tbody>${list.map(r => `<tr>
                    <td data-label="Waktu" class="nowrap mono">${UI.tanggal(r.waktu)}</td>
                    <td data-label="User"><span class="badge">${UI.esc(r.username)}</span></td>
                    <td data-label="Aktivitas" class="wrap">${UI.esc(r.aktivitas)}</td>
                </tr>`).join('')}</tbody>
            </table></div>` : '<div class="empty">Tidak ada aktivitas.</div>';
    }

    cari.addEventListener('input', draw);
    UI.loading(tabel);
    try {
        rows = (await api.get('/logs')).data;
        const jmlLogin = rows.filter(r => /login/i.test(r.aktivitas)).length;
        const jmlTrans = rows.filter(r => /masuk|keluar|bayar|tiket/i.test(r.aktivitas)).length;
        const jmlMaster = rows.length - jmlLogin - jmlTrans;
        statsEl.innerHTML = [
            { label: 'Total Log Tercatat', nilai: rows.length, ikon: 'list', sub: '100 rekaman terbaru' },
            { label: 'Aktivitas Login/Sesi', nilai: jmlLogin, ikon: 'users', sub: 'Autentikasi pengguna' },
            { label: 'Aktivitas Transaksi', nilai: jmlTrans, ikon: 'car', sub: 'Kendaraan masuk & keluar' },
            { label: 'Perubahan Master Data', nilai: Math.max(0, jmlMaster), ikon: 'grid', sub: 'CRUD user, tarif, & area' }
        ].map(x => `
            <div class="stat">
                <span class="stat-ic">${UI.icon(x.ikon)}</span>
                <div><small>${x.label}</small><b>${x.nilai}</b><small class="muted">${x.sub}</small></div>
            </div>`).join('');
        draw();
    } catch (err) {
        UI.error(tabel, err);
    }
};

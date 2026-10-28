// ========================================================
// HALAMAN LOG AKTIVITAS (ADMIN)
// ========================================================

Pages.log = async function (page) {
    page.innerHTML = `
        <section class="card">
            <div class="toolbar">
                <div class="search">${UI.icon('search')}<input type="search" id="cari" placeholder="Cari user / aktivitas..."></div>
                <span class="muted small">100 aktivitas terakhir</span>
            </div>
            <div id="tabel"></div>
        </section>`;

    const tabel = page.querySelector('#tabel');
    const cari = page.querySelector('#cari');
    let rows = [];

    function draw() {
        const q = cari.value.trim().toLowerCase();
        const list = q ? rows.filter(r => (r.username + ' ' + r.aktivitas).toLowerCase().includes(q)) : rows;
        tabel.innerHTML = list.length ? `
            <div class="table-wrap"><table>
                <thead><tr><th>Waktu</th><th>User</th><th>Aktivitas</th></tr></thead>
                <tbody>${list.map(r => `<tr>
                    <td data-label="Waktu" class="nowrap">${UI.tanggal(r.waktu)}</td>
                    <td data-label="User"><b>${UI.esc(r.username)}</b></td>
                    <td data-label="Aktivitas" class="wrap">${UI.esc(r.aktivitas)}</td>
                </tr>`).join('')}</tbody>
            </table></div>` : '<div class="empty">Tidak ada aktivitas.</div>';
    }

    cari.addEventListener('input', draw);
    UI.loading(tabel);
    try {
        rows = (await api.get('/logs')).data;
        draw();
    } catch (err) {
        UI.error(tabel, err);
    }
};

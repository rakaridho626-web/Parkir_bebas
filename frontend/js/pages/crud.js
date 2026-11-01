// ========================================================
// HALAMAN CRUD MASTER DATA (ADMIN): User, Tarif, Area, Kendaraan
// Satu fungsi crudPage() dipakai ulang lewat konfigurasi.
// ========================================================

function crudPage(cfg) {
    return async function (page) {
        page.innerHTML = `
            <div id="crud-visual-3d"></div>
            <section class="card card-3d">
                <div class="toolbar">
                    <div>
                        <span class="eyebrow-sm">MASTER DATA · ${UI.esc(cfg.nama).toUpperCase()}</span>
                        <h3>Kelola Data ${UI.esc(cfg.nama)} <span class="badge" id="jml-data">0</span></h3>
                    </div>
                    <div class="toolbar-kanan">
                        <div class="search">${UI.icon('search')}<input type="search" placeholder="Cari ${UI.esc(cfg.nama)}..." id="cari"></div>
                        <button class="btn btn-primary" id="btn-tambah" type="button">${UI.icon('plus')} Tambah ${UI.esc(cfg.nama)}</button>
                    </div>
                </div>
                <div id="tabel"></div>
            </section>`;

        const visual = page.querySelector('#crud-visual-3d');
        const jmlEl = page.querySelector('#jml-data');
        const tabel = page.querySelector('#tabel');
        const cari = page.querySelector('#cari');
        let rows = [];

        async function load() {
            UI.loading(tabel);
            try {
                rows = (await api.get(cfg.endpoint)).data;
                jmlEl.textContent = rows.length;
                if (cfg.visual3D) {
                    visual.innerHTML = cfg.visual3D(rows);
                    UI.pasangStage3D(visual);
                }
                draw();
            } catch (err) {
                UI.error(tabel, err);
            }
        }

        function draw() {
            const q = cari.value.trim().toLowerCase();
            const list = q
                ? rows.filter(r => cfg.cari.some(k => String(r[k] ?? '').toLowerCase().includes(q)))
                : rows;

            if (!list.length) {
                tabel.innerHTML = `<div class="empty">${q ? 'Data tidak ditemukan.' : `Belum ada data ${UI.esc(cfg.nama)}.`}</div>`;
                return;
            }

            tabel.innerHTML = `
                <div class="table-wrap"><table>
                    <thead><tr>
                        <th class="num">No</th>
                        ${cfg.kolom.map(k => `<th class="${k.cls || ''}">${k.label}</th>`).join('')}
                        <th class="aksi">Aksi</th>
                    </tr></thead>
                    <tbody>
                        ${list.map((r, i) => `<tr>
                            <td class="num">${i + 1}</td>
                            ${cfg.kolom.map(k => `<td class="${k.cls || ''}" data-label="${k.label}">${k.isi(r)}</td>`).join('')}
                            <td class="aksi">
                                <button class="icon-btn" data-edit="${r.id}" type="button" title="Ubah">${UI.icon('edit')}</button>
                                ${cfg.bolehHapus && !cfg.bolehHapus(r) ? '' :
                                  `<button class="icon-btn danger" data-hapus="${r.id}" type="button" title="Hapus">${UI.icon('trash')}</button>`}
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table></div>
                <p class="muted small">${list.length} data</p>`;
        }

        async function bukaForm(row) {
            const fields = typeof cfg.fields === 'function' ? await cfg.fields(row) : cfg.fields;
            UI.formModal({
                title: `${row ? 'Ubah' : 'Tambah'} ${cfg.nama}`,
                fields,
                data: row || {},
                onSubmit: async values => {
                    const body = { ...values, adminUser: Auth.user.username };
                    const res = row
                        ? await api.put(`${cfg.endpoint}/${row.id}`, body)
                        : await api.post(cfg.endpoint, body);
                    UI.toast(res.message);
                    load();
                }
            });
        }

        cari.addEventListener('input', draw);
        page.querySelector('#btn-tambah').addEventListener('click', () => {
            bukaForm(null).catch(err => UI.toast(err.message, 'err'));
        });

        tabel.addEventListener('click', async e => {
            const edit = e.target.closest('[data-edit]');
            const hapus = e.target.closest('[data-hapus]');
            if (edit) {
                const row = rows.find(r => String(r.id) === edit.dataset.edit);
                bukaForm(row).catch(err => UI.toast(err.message, 'err'));
            }
            if (hapus) {
                const row = rows.find(r => String(r.id) === hapus.dataset.hapus);
                if (!await UI.confirm(`Hapus ${cfg.nama} "${row[cfg.judul]}"?`)) return;
                try {
                    const res = await api.del(`${cfg.endpoint}/${row.id}?adminUser=${encodeURIComponent(Auth.user.username)}`);
                    UI.toast(res.message);
                    load();
                } catch (err) {
                    UI.toast(err.message, 'err');
                }
            }
        });

        load();
    };
}

// Pilihan jenis kendaraan diambil dari data tarif
async function opsiJenisKendaraan() {
    const tarif = (await api.get('/tarif')).data;
    return tarif.map(t => ({ value: t.jenis_kendaraan, label: t.jenis_kendaraan }));
}

const ROLE_OPSI = [
    { value: 'admin', label: 'Admin' },
    { value: 'petugas', label: 'Petugas' },
    { value: 'owner', label: 'Owner' }
];

Pages.users = crudPage({
    nama: 'User',
    endpoint: '/users',
    judul: 'username',
    cari: ['username', 'nama_lengkap', 'role'],
    bolehHapus: r => r.id !== Auth.user.id,   // tidak bisa hapus akun sendiri
    visual3D: rows => {
        const hitung = role => rows.filter(r => r.role === role).length;
        return `<div class="stats">
            <div class="stat"><span class="stat-ic">${UI.icon('users')}</span><div><small>Total Akun</small><b>${rows.length}</b><small class="muted">Pengguna aktif</small></div></div>
            <div class="stat"><span class="stat-ic">${UI.icon('grid')}</span><div><small>Role Admin</small><b>${hitung('admin')}</b><small class="muted">Akses master & log</small></div></div>
            <div class="stat"><span class="stat-ic">${UI.icon('car')}</span><div><small>Role Petugas</small><b>${hitung('petugas')}</b><small class="muted">Akses gerbang & struk</small></div></div>
            <div class="stat"><span class="stat-ic">${UI.icon('chart')}</span><div><small>Role Owner</small><b>${hitung('owner')}</b><small class="muted">Akses pantauan & rekap</small></div></div>
        </div>`;
    },
    kolom: [
        { label: 'Nama Lengkap', isi: r => `<b>${UI.esc(r.nama_lengkap)}</b>` },
        { label: 'Username', isi: r => `<span class="mono">${UI.esc(r.username)}</span>` },
        { label: 'Role', isi: r => `<span class="badge badge-${UI.esc(r.role)}">${UI.esc(r.role)}</span>` },
        { label: 'Dibuat', isi: r => UI.tanggal(r.created_at) }
    ],
    fields: row => [
        { name: 'nama_lengkap', label: 'Nama Lengkap', required: true },
        { name: 'username', label: 'Username', required: true },
        {
            name: 'password', label: 'Password', type: 'password', required: !row,
            hint: row ? 'Kosongkan kalau tidak ingin mengganti password.' : ''
        },
        { name: 'role', label: 'Role', type: 'select', options: ROLE_OPSI, required: true }
    ]
});

Pages.tarif = crudPage({
    nama: 'Tarif',
    endpoint: '/tarif',
    judul: 'jenis_kendaraan',
    cari: ['jenis_kendaraan'],
    visual3D: rows => rows.length ? `<div class="stats">${rows.map(r => `
        <div class="stat">
            <span class="stat-ic">${UI.icon('tag')}</span>
            <div>
                <small>${UI.esc(r.jenis_kendaraan)}</small>
                <b>${UI.rupiah(r.tarif_per_jam)}<span class="muted small">/jam</span></b>
                <small class="muted">${r.tarif_maksimal > 0 ? `Maks ${UI.rupiah(r.tarif_maksimal)}` : 'Tanpa batas maksimal'}</small>
            </div>
        </div>`).join('')}</div>` : '',
    kolom: [
        { label: 'Jenis Kendaraan', isi: r => `<b>${UI.esc(r.jenis_kendaraan)}</b>` },
        { label: 'Tarif per Jam', cls: 'right', isi: r => `<b>${UI.rupiah(r.tarif_per_jam)}</b>` },
        { label: 'Tarif Maksimal', cls: 'right', isi: r => r.tarif_maksimal > 0 ? UI.rupiah(r.tarif_maksimal) : '<span class="muted">Tanpa batas</span>' }
    ],
    fields: [
        { name: 'jenis_kendaraan', label: 'Jenis Kendaraan', required: true, placeholder: 'Motor' },
        { name: 'tarif_per_jam', label: 'Tarif per Jam (Rp)', type: 'number', min: 0, required: true },
        { name: 'tarif_maksimal', label: 'Tarif Maksimal (Rp)', type: 'number', min: 0, hint: 'Isi 0 kalau tanpa batas maksimal.' }
    ]
});

Pages.area = crudPage({
    nama: 'Area',
    endpoint: '/area',
    judul: 'nama_area',
    cari: ['kode_area', 'nama_area'],
    visual3D: rows => UI.lot3D(rows),
    kolom: [
        { label: 'Kode', isi: r => `<b>${UI.esc(r.kode_area)}</b>` },
        { label: 'Nama Area', isi: r => UI.esc(r.nama_area) },
        {
            label: 'Keterisian', isi: r => {
                const persen = r.kapasitas ? Math.round(r.terisi / r.kapasitas * 100) : 0;
                return `<div class="meter" title="${persen}%"><span style="width:${Math.min(100, persen)}%" class="${persen >= 90 ? 'full' : ''}"></span></div>
                        <small class="muted">${r.terisi} / ${r.kapasitas} terisi (${persen}%)</small>`;
            }
        }
    ],
    fields: [
        { name: 'kode_area', label: 'Kode Area', required: true, upper: true, placeholder: 'A1' },
        { name: 'nama_area', label: 'Nama Area', required: true },
        { name: 'kapasitas', label: 'Kapasitas (slot)', type: 'number', min: 1, required: true }
    ]
});

Pages.kendaraan = crudPage({
    nama: 'Kendaraan',
    endpoint: '/kendaraan',
    judul: 'plat_nomor',
    cari: ['plat_nomor', 'jenis_kendaraan', 'pemilik'],
    visual3D: rows => {
        const grup = {};
        rows.forEach(r => { grup[r.jenis_kendaraan] = (grup[r.jenis_kendaraan] || 0) + 1; });
        return `<div class="stats">
            <div class="stat"><span class="stat-ic">${UI.icon('card')}</span><div><small>Total Terdaftar</small><b>${rows.length}</b><small class="muted">Kendaraan member/tercatat</small></div></div>
            ${Object.entries(grup).map(([j, n]) => `
                <div class="stat"><span class="stat-ic">${UI.icon('car')}</span><div><small>${UI.esc(j)}</small><b>${n}</b><small class="muted">Unit terdaftar</small></div></div>
            `).join('')}
        </div>`;
    },
    kolom: [
        { label: 'Plat Nomor', isi: r => `<span class="plat">${UI.esc(r.plat_nomor)}</span>` },
        { label: 'Jenis', isi: r => UI.esc(r.jenis_kendaraan) },
        { label: 'Pemilik', isi: r => UI.esc(r.pemilik) }
    ],
    fields: async () => [
        { name: 'plat_nomor', label: 'Plat Nomor', required: true, upper: true, placeholder: 'B 1234 ABC' },
        { name: 'jenis_kendaraan', label: 'Jenis Kendaraan', type: 'select', options: await opsiJenisKendaraan(), required: true },
        { name: 'pemilik', label: 'Pemilik', placeholder: 'Nama pemilik' }
    ]
});

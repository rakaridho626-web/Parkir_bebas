// ========================================================
// HALAMAN DATA MASTER (ADMIN): CRUD Area, Tarif, Kendaraan, User + Log Aktivitas
// Satu halaman dipakai ulang lewat konfigurasi per tab.
// ========================================================

// Daftar tab di halaman Data Master.
const TAB_MASTER = [
    { id: 'area', label: 'Area' },
    { id: 'tarif', label: 'Tarif' },
    { id: 'kendaraan', label: 'Kendaraan' },
    { id: 'users', label: 'User' },
    { id: 'log', label: 'Log Aktivitas' }
];
// Kolom jenis di tb_tarif hanya menerima 3 nilai ini, jadi form tarif memakai dropdown.
const JENIS_TARIF = ['motor', 'mobil', 'lainnya'];   // sesuai enum tb_tarif di SPK
const ROLE_USER = ['admin', 'petugas', 'owner'];

// Pengaturan tiap tab. Isi tiap tab:
// nama, endpoint = alamat API, rows = datanya, kolom = kolom tabel [judul, isi, kelas],
// form = isian tambah/ubah, cari = teks yang dicari, visual = grafik di samping tabel.
function configMaster({ areas, tarif, kendaraan, users, logs }) {
    // Ubah daftar nilai jadi pilihan dropdown.
    const opsi = list => list.map(v => ({ value: v, label: UI.kapital(v) }));
    // Hitung jumlah baris per kategori, untuk grafik donat.
    const jumlahPer = (rows, kunci, daftar) => daftar.map(k => ({
        jenis: UI.kapital(k), jumlah: rows.filter(r => r[kunci].toLowerCase() === k).length,
        nilai: rows.filter(r => r[kunci].toLowerCase() === k).length
    }));
    const terisi = areas.reduce((a, x) => a + Number(x.terisi), 0);
    const kapasitas = areas.reduce((a, x) => a + Number(x.kapasitas), 0);
    // Hitung aktivitas per user, ambil 7 terbanyak.
    const logPerUser = Object.entries(logs.reduce((acc, l) => {
        acc[l.username] = (acc[l.username] || 0) + 1;
        return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 7);

    return {
        // Tab Area
        area: {
            nama: 'area', endpoint: '/area', rows: areas, judul: r => r.nama_area,
            hero: [areas.length, 'area parkir'], sub: `${terisi} dari ${kapasitas} slot terisi`,
            cari: r => `${r.kode_area} ${r.nama_area}`,
            kolom: [
                ['Kode', r => `<b>${UI.esc(r.kode_area)}</b>`],
                ['Nama Area', r => UI.esc(r.nama_area)],
                ['Keterisian', r => {
                    const p = r.kapasitas ? Math.round(r.terisi / r.kapasitas * 100) : 0;
                    return `<div class="meter-baris"><div class="meter"><span style="width:${Math.min(100, p)}%" class="${p >= 100 ? 'full' : ''}"></span></div><span>${r.terisi}/${r.kapasitas}</span></div>`;
                }]
            ],
            form: () => [
                { name: 'nama_area', label: 'Nama area', required: true },
                { name: 'kapasitas', label: 'Kapasitas (slot)', type: 'number', min: 1, required: true }
            ],
            visual: {
                judul: 'Kendaraan per area',
                html: () => donat3D(areas.map(a => ({ jenis: a.nama_area, jumlah: Number(a.terisi), nilai: Number(a.terisi) })), 'terparkir'),
                legenda: areas.map(a => ({ jenis: a.nama_area, nilai: `${a.terisi} unit` }))
            }
        },
        // Tab Tarif
        tarif: {
            nama: 'tarif', endpoint: '/tarif', rows: tarif, judul: r => UI.kapital(r.jenis_kendaraan),
            hero: [tarif.length, 'jenis tarif'], sub: 'dihitung per jam, dibulatkan ke atas',
            cari: r => r.jenis_kendaraan,
            penuh: tarif.length >= JENIS_TARIF.length ? 'Semua jenis kendaraan sudah punya tarif.' : '',
            kolom: [
                ['Jenis Kendaraan', r => `<b>${UI.esc(UI.kapital(r.jenis_kendaraan))}</b>`],
                ['Tarif per Jam', r => `<b>${UI.rupiah(r.tarif_per_jam)}</b>`, 'right']
            ],
            form: row => [
                {
                    name: 'jenis_kendaraan', label: 'Jenis kendaraan', type: 'select', required: true,
                    options: opsi(JENIS_TARIF.filter(j => j === row?.jenis_kendaraan || !tarif.some(t => t.jenis_kendaraan === j)))
                },
                { name: 'tarif_per_jam', label: 'Tarif per jam (Rp)', type: 'number', min: 0, required: true }
            ],
            visual: {
                judul: 'Perbandingan tarif',
                html: () => batang3D(tarif.map(t => ({ label: UI.kapital(t.jenis_kendaraan), nilai: Number(t.tarif_per_jam) })),
                    { format: rupiahSingkat, tinggi: 170, lebar: 46, dalam: 28 })
            }
        },
        // Tab Kendaraan
        kendaraan: {
            nama: 'kendaraan', endpoint: '/kendaraan', rows: kendaraan, judul: r => r.plat_nomor,
            hero: [kendaraan.length, 'kendaraan'], sub: 'tercatat di data kendaraan',
            cari: r => `${r.plat_nomor} ${r.jenis_kendaraan} ${r.warna} ${r.pemilik}`,
            kolom: [
                ['Plat Nomor', r => `<span class="plat">${UI.esc(r.plat_nomor)}</span>`],
                ['Jenis', r => UI.esc(UI.kapital(r.jenis_kendaraan))],
                ['Warna', r => UI.esc(r.warna || '-')],
                ['Pemilik', r => UI.esc(r.pemilik || '-')]
            ],
            form: () => [
                { name: 'plat_nomor', label: 'Plat nomor', required: true, upper: true, placeholder: 'B 1234 ABC' },
                { name: 'jenis_kendaraan', label: 'Jenis kendaraan', type: 'select', options: opsi(tarif.map(t => t.jenis_kendaraan)), required: true },
                { name: 'warna', label: 'Warna', placeholder: 'Hitam' },
                { name: 'pemilik', label: 'Pemilik', placeholder: 'Nama pemilik' }
            ],
            visual: (() => {
                const data = perJenis(kendaraan);
                return { judul: 'Kendaraan per jenis', html: () => donat3D(data, 'kendaraan'), legenda: data.map(d => ({ jenis: d.jenis, nilai: `${d.jumlah} unit` })) };
            })()
        },
        // Tab User. Admin tidak bisa menghapus akunnya sendiri.
        users: {
            nama: 'user', endpoint: '/users', rows: users, judul: r => r.username,
            hero: [users.length, 'akun'], sub: 'admin, petugas, dan owner',
            cari: r => `${r.username} ${r.nama_lengkap} ${r.role}`,
            bolehHapus: r => r.id !== Auth.user.id,
            kolom: [
                ['Nama Lengkap', r => `<b>${UI.esc(r.nama_lengkap)}</b>`],
                ['Username', r => `<span class="mono">${UI.esc(r.username)}</span>`],
                ['Role', r => `<span class="badge badge-${UI.esc(r.role)}">${UI.esc(r.role)}</span>`]
            ],
            form: row => [
                { name: 'nama_lengkap', label: 'Nama lengkap', required: true },
                { name: 'username', label: 'Username', required: true },
                { name: 'password', label: 'Password', type: 'password', required: !row, hint: row ? 'Kosongkan kalau tidak ingin mengganti.' : '' },
                { name: 'role', label: 'Role', type: 'select', options: opsi(ROLE_USER), required: true }
            ],
            visual: (() => {
                const data = jumlahPer(users, 'role', ROLE_USER);
                return { judul: 'Akun per role', html: () => donat3D(data, 'akun'), legenda: data.map(d => ({ jenis: d.jenis, nilai: `${d.jumlah} akun` })) };
            })()
        },
        // Tab Log: hanya bisa dibaca, tidak ada tambah, ubah, hapus.
        log: {
            nama: 'aktivitas', rows: logs, hanyaBaca: true,
            hero: [logs.length, 'aktivitas'], sub: '100 catatan terbaru',
            cari: r => `${r.username} ${r.aktivitas}`,
            kolom: [
                ['Waktu', r => `<span class="mono">${UI.tanggal(r.waktu)}</span>`],
                ['User', r => `<span class="badge">${UI.esc(r.username)}</span>`],
                ['Aktivitas', r => UI.esc(r.aktivitas)]
            ],
            visual: {
                judul: 'Aktivitas per user',
                html: () => batang3D(logPerUser.map(([label, nilai]) => ({ label, nilai })), { tinggi: 170, lebar: 34, dalam: 24 })
            }
        }
    };
}

// tab = nama tab yang dibuka, diambil dari alamat. Semua tab memakai kode yang sama, bedanya di config.
Pages.master = async function (page, tab) {
    page.innerHTML = `
        <section class="o-rekap o-kerja">
            <header class="o-head-kecil">
                <div>
                    <p class="o-eyebrow">Data master</p>
                    <h1 class="o-judul"><b id="m-jumlah">–</b> <span id="m-nama"></span></h1>
                    <p class="o-sub small" id="m-sub">&nbsp;</p>
                </div>
                <nav class="o-chips" id="m-tabs" aria-label="Data master">
                    ${TAB_MASTER.map(t => `<a href="#/${t.id}" class="${t.id === tab ? 'on' : ''}">${t.label}</a>`).join('')}
                </nav>
            </header>
            <div id="m-isi"><p class="o-note"><span class="spinner"></span> Memuat data...</p></div>
        </section>`;

    const isi = page.querySelector('#m-isi');
    pasangPutarChart(isi);

    // Ambil semua data, pilih config tab yang aktif, lalu gambar tabel dan grafiknya.
    async function muat() {
        isi.classList.remove('tumbuh');
        try {
            const [u, t, a, k, l] = await Promise.all(['/users', '/tarif', '/area', '/kendaraan', '/logs'].map(p => api.get(p)));
            if (Panel.halaman !== tab) return;
            Panel.gambarLot(a.data);
            const cfg = configMaster({ users: u.data, tarif: t.data, areas: a.data, kendaraan: k.data, logs: l.data })[tab];

            page.querySelector('#m-jumlah').textContent = cfg.hero[0];
            page.querySelector('#m-nama').textContent = cfg.hero[1];
            page.querySelector('#m-sub').textContent = cfg.sub;

            isi.innerHTML = `
                <div class="o-master">
                    <article class="o-card o-card-tabel">
                        <header>
                            <input type="search" id="m-cari" class="o-cari" placeholder="Cari ${cfg.nama}..." aria-label="Cari ${cfg.nama}">
                            ${cfg.hanyaBaca ? '' : `<button class="o-btn" id="m-tambah" type="button" ${cfg.penuh ? 'disabled' : ''} title="${cfg.penuh || ''}">${UI.icon('plus')} Tambah ${cfg.nama}</button>`}
                        </header>
                        <div class="o-table" id="m-tabel"></div>
                        <p class="o-note" id="m-baris"></p>
                    </article>
                    <article class="o-card">
                        <header><h3>${cfg.visual.judul}</h3></header>
                        ${cfg.visual.html()}
                        ${cfg.visual.legenda ? `<ul class="o-legend-list">${cfg.visual.legenda.map((j, i) => `
                            <li><i style="background:${WARNA_JENIS[i % WARNA_JENIS.length]}"></i><span>${UI.esc(j.jenis)}</span><b>${UI.esc(j.nilai)}</b></li>`).join('')}</ul>` : ''}
                    </article>
                </div>`;
            requestAnimationFrame(() => requestAnimationFrame(() => isi.classList.add('tumbuh')));

            const tabel = isi.querySelector('#m-tabel');
            const cari = isi.querySelector('#m-cari');

            // Gambar tabel sesuai kata pencarian.
            function gambar() {
                const q = cari.value.trim().toLowerCase();
                const list = q ? cfg.rows.filter(r => cfg.cari(r).toLowerCase().includes(q)) : cfg.rows;
                isi.querySelector('#m-baris').textContent = `${list.length} ${cfg.nama}`;
                tabel.innerHTML = list.length ? `<table>
                    <thead><tr>${cfg.kolom.map(([j, , c]) => `<th class="${c || ''}">${j}</th>`).join('')}${cfg.hanyaBaca ? '' : '<th class="aksi">Aksi</th>'}</tr></thead>
                    <tbody>${list.map(r => `<tr>
                        ${cfg.kolom.map(([, f, c]) => `<td class="${c || ''}">${f(r)}</td>`).join('')}
                        ${cfg.hanyaBaca ? '' : `<td class="aksi">
                            <button class="icon-btn" data-edit="${r.id}" type="button" title="Ubah" aria-label="Ubah">${UI.icon('edit')}</button>
                            ${cfg.bolehHapus && !cfg.bolehHapus(r) ? '' : `<button class="icon-btn danger" data-hapus="${r.id}" type="button" title="Hapus" aria-label="Hapus">${UI.icon('trash')}</button>`}
                        </td>`}
                    </tr>`).join('')}</tbody>
                </table>` : `<p class="o-kosong">${q ? 'Tidak ada yang cocok.' : `Belum ada ${cfg.nama}.`}</p>`;
            }

            // Buka form. row kosong berarti tambah, row terisi berarti ubah. Setelah berhasil, data dimuat ulang.
            function bukaForm(row = null) {
                UI.formModal({
                    title: `${row ? 'Ubah' : 'Tambah'} ${cfg.nama}`,
                    fields: cfg.form(row),
                    data: row || {},
                    onSubmit: async values => {
                        const body = { ...values, currentUserId: Auth.user.id };
                        const res = row ? await api.put(`${cfg.endpoint}/${row.id}`, body) : await api.post(cfg.endpoint, body);
                        UI.toast(res.message);
                        muat();
                    }
                });
            }

            gambar();
            cari.addEventListener('input', gambar);
            isi.querySelector('#m-tambah')?.addEventListener('click', () => bukaForm());
            // Satu event untuk semua tombol ubah dan hapus di tabel.
            tabel.addEventListener('click', async e => {
                const edit = e.target.closest('[data-edit]');
                const hapus = e.target.closest('[data-hapus]');
                const id = edit?.dataset.edit || hapus?.dataset.hapus;
                const row = cfg.rows.find(r => String(r.id) === id);
                if (!row) return;
                if (edit) return bukaForm(row);
                if (!await UI.confirm(`Hapus ${cfg.nama} "${cfg.judul(row)}"?`)) return;
                try {
                    const res = await api.del(`${cfg.endpoint}/${row.id}?currentUserId=${Auth.user.id}`);
                    UI.toast(res.message);
                    muat();
                } catch (err) {
                    UI.toast(err.message, 'err');
                }
            });
        } catch (err) {
            isi.innerHTML = `<p class="o-note err">${UI.esc(err.message)}</p>`;
        }
    }

    await muat();
};

<script lang="ts">
    import { tick } from 'svelte';
    import Batang3D from '../komponen/Batang3D.svelte';
    import Donat3D from '../komponen/Donat3D.svelte';
    import Ikon from '../komponen/Ikon.svelte';
    import { api } from '../lib/api';
    import { kapital, rupiah, tanggal } from '../lib/format';
    import { perJenis, putarChart, rupiahSingkat, WARNA_JENIS, type Batang, type Irisan } from '../lib/grafik';
    import { panel } from '../lib/panel.svelte';
    import { bukaForm, konfirmasi, toast } from '../lib/ui.svelte';
    import type { Area, Field, Kendaraan, Log, Tarif, User } from '../lib/tipe';

    // Data master admin: CRUD Area, Tarif, Kendaraan, User, dan Log Aktivitas.
    // Semua tab memakai tampilan yang sama, bedanya ada di pengaturan tiap tab.
    let { tab, user }: { tab: string; user: User } = $props();

    const TAB = [
        { id: 'area', label: 'Area' },
        { id: 'tarif', label: 'Tarif' },
        { id: 'kendaraan', label: 'Kendaraan' },
        { id: 'users', label: 'User' },
        { id: 'log', label: 'Log Aktivitas' }
    ];
    const JENIS_TARIF = ['motor', 'mobil', 'lainnya'];   // sesuai enum tb_tarif di SPK
    const ROLE_USER = ['admin', 'petugas', 'owner'];

    type Baris = Record<string, any>;
    // gaya = cara sel digambar di tabel.
    type Gaya = 'teks' | 'tebal' | 'plat' | 'mono' | 'rupiah' | 'badge' | 'role' | 'meter';
    interface Kolom { judul: string; gaya: Gaya; nilai: (r: Baris) => string | number; kanan?: boolean; }
    interface Visual { judul: string; batang?: Batang[]; donat?: Irisan[]; label?: string; legenda?: { jenis: string; nilai: string }[]; format?: (n: number) => string; tinggi?: number; lebar?: number; dalam?: number; }
    interface Tab {
        nama: string;
        endpoint?: string;
        rows: Baris[];
        hero: [number, string];
        sub: string;
        cari: (r: Baris) => string;
        kolom: Kolom[];
        visual: Visual;
        judul?: (r: Baris) => string;
        form?: (r: Baris | null) => Field[];
        penuh?: string;
        bolehHapus?: (r: Baris) => boolean;
    }

    interface Data { areas: Area[]; tarif: Tarif[]; kendaraan: Kendaraan[]; users: User[]; logs: Log[]; }

    let cfg = $state.raw<Tab | null>(null);
    let error = $state('');
    let tumbuh = $state(false);
    let cari = $state('');

    const opsi = (list: string[]) => list.map(v => ({ value: v, label: kapital(v) }));

    // Pengaturan tab yang sedang dibuka.
    function pengaturan({ areas, tarif, kendaraan, users, logs }: Data): Tab {
        if (tab === 'area') {
            const terisi = areas.reduce((a, x) => a + Number(x.terisi), 0);
            const kapasitas = areas.reduce((a, x) => a + Number(x.kapasitas), 0);
            return {
                nama: 'area', endpoint: '/area', rows: areas, judul: r => r.nama_area,
                hero: [areas.length, 'area parkir'], sub: `${terisi} dari ${kapasitas} slot terisi`,
                cari: r => `${r.kode_area} ${r.nama_area}`,
                kolom: [
                    { judul: 'Kode', gaya: 'tebal', nilai: r => r.kode_area },
                    { judul: 'Nama Area', gaya: 'teks', nilai: r => r.nama_area },
                    { judul: 'Keterisian', gaya: 'meter', nilai: r => r.kapasitas ? Math.round(r.terisi / r.kapasitas * 100) : 0 }
                ],
                form: () => [
                    { name: 'nama_area', label: 'Nama area', required: true },
                    { name: 'kapasitas', label: 'Kapasitas (slot)', type: 'number', min: 1, required: true }
                ],
                visual: {
                    judul: 'Kendaraan per area', label: 'terparkir',
                    donat: areas.map(a => ({ jenis: a.nama_area, jumlah: Number(a.terisi), nilai: Number(a.terisi) })),
                    legenda: areas.map(a => ({ jenis: a.nama_area, nilai: `${a.terisi} unit` }))
                }
            };
        }
        if (tab === 'tarif') return {
            nama: 'tarif', endpoint: '/tarif', rows: tarif, judul: r => kapital(r.jenis_kendaraan),
            hero: [tarif.length, 'jenis tarif'], sub: 'dihitung per jam, dibulatkan ke atas',
            cari: r => r.jenis_kendaraan,
            penuh: tarif.length >= JENIS_TARIF.length ? 'Semua jenis kendaraan sudah punya tarif.' : '',
            kolom: [
                { judul: 'Jenis Kendaraan', gaya: 'tebal', nilai: r => kapital(r.jenis_kendaraan) },
                { judul: 'Tarif per Jam', gaya: 'rupiah', nilai: r => r.tarif_per_jam, kanan: true }
            ],
            form: row => [
                {
                    name: 'jenis_kendaraan', label: 'Jenis kendaraan', type: 'select', required: true,
                    options: opsi(JENIS_TARIF.filter(j => j === row?.jenis_kendaraan || !tarif.some(t => t.jenis_kendaraan === j)))
                },
                { name: 'tarif_per_jam', label: 'Tarif per jam (Rp)', type: 'number', min: 0, required: true }
            ],
            visual: {
                judul: 'Perbandingan tarif', format: rupiahSingkat, tinggi: 170, lebar: 46, dalam: 28,
                batang: tarif.map(t => ({ label: kapital(t.jenis_kendaraan), nilai: Number(t.tarif_per_jam) }))
            }
        };
        if (tab === 'kendaraan') {
            const data = perJenis(kendaraan, () => 1);
            return {
                nama: 'kendaraan', endpoint: '/kendaraan', rows: kendaraan, judul: r => r.plat_nomor,
                hero: [kendaraan.length, 'kendaraan'], sub: 'tercatat di data kendaraan',
                cari: r => `${r.plat_nomor} ${r.jenis_kendaraan} ${r.warna} ${r.pemilik}`,
                kolom: [
                    { judul: 'Plat Nomor', gaya: 'plat', nilai: r => r.plat_nomor },
                    { judul: 'Jenis', gaya: 'teks', nilai: r => kapital(r.jenis_kendaraan) },
                    { judul: 'Warna', gaya: 'teks', nilai: r => r.warna || '-' },
                    { judul: 'Pemilik', gaya: 'teks', nilai: r => r.pemilik || '-' }
                ],
                form: () => [
                    { name: 'plat_nomor', label: 'Plat nomor', required: true, upper: true, placeholder: 'B 1234 ABC' },
                    { name: 'jenis_kendaraan', label: 'Jenis kendaraan', type: 'select', options: opsi(tarif.map(t => t.jenis_kendaraan)), required: true },
                    { name: 'warna', label: 'Warna', placeholder: 'Hitam' },
                    { name: 'pemilik', label: 'Pemilik', placeholder: 'Nama pemilik' }
                ],
                visual: { judul: 'Kendaraan per jenis', label: 'kendaraan', donat: data, legenda: data.map(d => ({ jenis: d.jenis, nilai: `${d.jumlah} unit` })) }
            };
        }
        if (tab === 'users') {
            const data = ROLE_USER.map(role => {
                const jumlah = users.filter(u => u.role === role).length;
                return { jenis: kapital(role), jumlah, nilai: jumlah };
            });
            return {
                nama: 'user', endpoint: '/users', rows: users, judul: r => r.username,
                hero: [users.length, 'akun'], sub: 'admin, petugas, dan owner',
                cari: r => `${r.username} ${r.nama_lengkap} ${r.role}`,
                bolehHapus: r => r.id !== user.id,   // admin tidak bisa menghapus akunnya sendiri
                kolom: [
                    { judul: 'Nama Lengkap', gaya: 'tebal', nilai: r => r.nama_lengkap },
                    { judul: 'Username', gaya: 'mono', nilai: r => r.username },
                    { judul: 'Role', gaya: 'role', nilai: r => r.role }
                ],
                form: row => [
                    { name: 'nama_lengkap', label: 'Nama lengkap', required: true },
                    { name: 'username', label: 'Username', required: true },
                    { name: 'password', label: 'Password', type: 'password', required: !row, hint: row ? 'Kosongkan kalau tidak ingin mengganti.' : '' },
                    { name: 'role', label: 'Role', type: 'select', options: opsi(ROLE_USER), required: true }
                ],
                visual: { judul: 'Akun per role', label: 'akun', donat: data, legenda: data.map(d => ({ jenis: d.jenis, nilai: `${d.jumlah} akun` })) }
            };
        }
        // Tab Log hanya bisa dibaca: tidak ada form tambah, ubah, atau hapus.
        const perUser: Record<string, number> = {};
        logs.forEach(l => perUser[l.username] = (perUser[l.username] || 0) + 1);
        return {
            nama: 'aktivitas', rows: logs,
            hero: [logs.length, 'aktivitas'], sub: '100 catatan terbaru',
            cari: r => `${r.username} ${r.aktivitas}`,
            kolom: [
                { judul: 'Waktu', gaya: 'mono', nilai: r => tanggal(r.waktu) },
                { judul: 'User', gaya: 'badge', nilai: r => r.username },
                { judul: 'Aktivitas', gaya: 'teks', nilai: r => r.aktivitas }
            ],
            visual: {
                judul: 'Aktivitas per user', tinggi: 170, lebar: 34, dalam: 24,
                batang: Object.entries(perUser).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, nilai]) => ({ label, nilai }))
            }
        };
    }

    const daftar = $derived.by(() => {
        if (!cfg) return [];
        const c = cfg, q = cari.trim().toLowerCase();
        return q ? c.rows.filter(r => c.cari(r).toLowerCase().includes(q)) : c.rows;
    });

    // Ambil semua data, lalu susun pengaturan tab yang aktif.
    async function muat() {
        tumbuh = false;
        try {
            const [u, t, a, k, l] = await Promise.all([
                api.get<{ data: User[] }>('/users'), api.get<{ data: Tarif[] }>('/tarif'), api.get<{ data: Area[] }>('/area'),
                api.get<{ data: Kendaraan[] }>('/kendaraan'), api.get<{ data: Log[] }>('/logs')
            ]);
            panel.areas = a.data;
            cfg = pengaturan({ users: u.data, tarif: t.data, areas: a.data, kendaraan: k.data, logs: l.data });
            await tick();
            requestAnimationFrame(() => requestAnimationFrame(() => tumbuh = true));
        } catch (err) {
            error = (err as Error).message;
        }
    }

    // Buka form. row kosong berarti tambah, row terisi berarti ubah. Setelah berhasil, data dimuat ulang.
    function form(c: Tab, row: Baris | null = null) {
        bukaForm({
            title: `${row ? 'Ubah' : 'Tambah'} ${c.nama}`,
            fields: c.form!(row),
            data: row ?? {},
            onSubmit: async values => {
                const body = { ...values, currentUserId: user.id };
                const res = await (row
                    ? api.put<{ message: string }>(`${c.endpoint}/${row.id}`, body)
                    : api.post<{ message: string }>(c.endpoint!, body));
                toast(res.message);
                muat();
            }
        });
    }

    async function hapus(c: Tab, row: Baris) {
        if (!await konfirmasi(`Hapus ${c.nama} "${c.judul!(row)}"?`)) return;
        try {
            const res = await api.del<{ message: string }>(`${c.endpoint}/${row.id}?currentUserId=${user.id}`);
            toast(res.message);
            muat();
        } catch (err) {
            toast((err as Error).message, 'err');
        }
    }

    $effect(() => { muat(); });
</script>

{#snippet sel(k: Kolom, r: Baris)}
    {@const v = k.nilai(r)}
    {#if k.gaya === 'tebal'}<b>{v}</b>
    {:else if k.gaya === 'plat'}<span class="plat">{v}</span>
    {:else if k.gaya === 'mono'}<span class="mono">{v}</span>
    {:else if k.gaya === 'rupiah'}<b>{rupiah(v)}</b>
    {:else if k.gaya === 'badge'}<span class="badge">{v}</span>
    {:else if k.gaya === 'role'}<span class="badge badge-{v}">{v}</span>
    {:else if k.gaya === 'meter'}
        <div class="meter-baris">
            <div class="meter"><span style="width:{Math.min(100, +v)}%" class:full={+v >= 100}></span></div>
            <span>{r.terisi}/{r.kapasitas}</span>
        </div>
    {:else}{v}{/if}
{/snippet}

<section class="o-rekap o-kerja">
    <header class="o-head-kecil">
        <div>
            <p class="o-eyebrow">Data master</p>
            <h1 class="o-judul"><b>{cfg?.hero[0] ?? '–'}</b> <span>{cfg?.hero[1] ?? ''}</span></h1>
            <p class="o-sub small">{#if cfg}{cfg.sub}{:else}&nbsp;{/if}</p>
        </div>
        <nav class="o-chips" aria-label="Data master">
            {#each TAB as t}
                <a href="#/{t.id}" class:on={t.id === tab}>{t.label}</a>
            {/each}
        </nav>
    </header>

    <div class:tumbuh use:putarChart>
        {#if error}
            <p class="o-note err">{error}</p>
        {:else if !cfg}
            <p class="o-note"><span class="spinner"></span> Memuat data...</p>
        {:else}
            {@const c = cfg}
            <div class="o-master">
                <article class="o-card o-card-tabel">
                    <header>
                        <input type="search" bind:value={cari} class="o-cari" placeholder="Cari {c.nama}..." aria-label="Cari {c.nama}">
                        {#if c.form}
                            <button class="o-btn" type="button" disabled={!!c.penuh} title={c.penuh} onclick={() => form(c)}><Ikon nama="plus" /> Tambah {c.nama}</button>
                        {/if}
                    </header>
                    <div class="o-table">
                        {#if daftar.length}
                            <table>
                                <thead>
                                    <tr>
                                        {#each c.kolom as k}<th class:right={k.kanan}>{k.judul}</th>{/each}
                                        {#if c.form}<th class="aksi">Aksi</th>{/if}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each daftar as r}
                                        <tr>
                                            {#each c.kolom as k}<td class:right={k.kanan}>{@render sel(k, r)}</td>{/each}
                                            {#if c.form}
                                                <td class="aksi">
                                                    <button class="icon-btn" type="button" title="Ubah" aria-label="Ubah" onclick={() => form(c, r)}><Ikon nama="edit" /></button>
                                                    {#if !c.bolehHapus || c.bolehHapus(r)}
                                                        <button class="icon-btn danger" type="button" title="Hapus" aria-label="Hapus" onclick={() => hapus(c, r)}><Ikon nama="trash" /></button>
                                                    {/if}
                                                </td>
                                            {/if}
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        {:else}
                            <p class="o-kosong">{cari.trim() ? 'Tidak ada yang cocok.' : `Belum ada ${c.nama}.`}</p>
                        {/if}
                    </div>
                    <p class="o-note">{daftar.length} {c.nama}</p>
                </article>
                <article class="o-card">
                    <header><h3>{c.visual.judul}</h3></header>
                    {#if c.visual.donat}
                        <Donat3D items={c.visual.donat} labelTengah={c.visual.label} />
                    {:else if c.visual.batang}
                        <Batang3D data={c.visual.batang} format={c.visual.format} tinggi={c.visual.tinggi} lebar={c.visual.lebar} dalam={c.visual.dalam} />
                    {/if}
                    {#if c.visual.legenda}
                        <ul class="o-legend-list">
                            {#each c.visual.legenda as j, i}
                                <li><i style="background:{WARNA_JENIS[i % WARNA_JENIS.length]}"></i><span>{j.jenis}</span><b>{j.nilai}</b></li>
                            {/each}
                        </ul>
                    {/if}
                </article>
            </div>
        {/if}
    </div>
</section>

<script lang="ts">
    import { onDestroy } from 'svelte';
    import Dashboard from './Dashboard.svelte';
    import Master from './Master.svelte';
    import Rekap from './Rekap.svelte';
    import Transaksi from './Transaksi.svelte';
    import Lantai from '../komponen/Lantai.svelte';
    import { api } from '../lib/api';
    import { hapusUser } from '../lib/auth.svelte';
    import { panel } from '../lib/panel.svelte';
    import { konfirmasi } from '../lib/ui.svelte';
    import type { Area, Role, User } from '../lib/tipe';

    // Panel utama semua role, tanpa sidebar.
    // Pojok kanan atas = Dashboard. Pojok kiri bawah = halaman kerja tiap role.
    let { user, halaman }: { user: User; halaman: string } = $props();

    const DWELL = 400;   // ms kursor harus diam di pojok
    const POJOK = 44;    // ukuran area pojok (px)
    const DEKAT = 170;   // jarak kursor ke pojok agar labelnya muncul (px)

    const KERJA: Record<Role, { go: string; judul: string; sub: string }> = {
        owner: { go: 'laporan', judul: 'Rekap', sub: 'analisis transaksi' },
        petugas: { go: 'transaksi', judul: 'Pos Gerbang', sub: 'kendaraan masuk & keluar' },
        admin: { go: 'area', judul: 'Data Master', sub: 'area, tarif, user, log' }
    };
    const JUDUL: Record<string, string> = { dashboard: 'Dashboard', laporan: 'Rekap Transaksi', transaksi: 'Pos Gerbang' };

    let view: HTMLElement;
    let pojokAktif = $state<string | null>(null);
    let dekatTR = $state(false), dekatBL = $state(false), dekatUser = $state(false);
    let sambut = $state(true);
    let timerPojok: ReturnType<typeof setTimeout>;

    const kerja = $derived(KERJA[user.role]);
    const dashboardAktif = $derived(halaman === 'dashboard');

    $effect(() => { document.title = `${JUDUL[halaman] ?? 'Data Master'} · Parkir Bebas`; });

    // Label pojok tampil sebentar setelah login, supaya pengguna tahu tempatnya.
    const timerSambut = setTimeout(() => sambut = false, 4500);

    function batalPojok() {
        clearTimeout(timerPojok);
        pojokAktif = null;
    }

    // Halaman baru pindah kalau kursor diam di pojok selama DWELL,
    // jadi tidak pindah gara-gara kursor cuma lewat.
    function gerak(e: PointerEvent) {
        const w = view.clientWidth, h = view.clientHeight, x = e.clientX, y = e.clientY;

        // Parallax lantai parkir.
        view.style.setProperty('--mx', (x / w * 2 - 1).toFixed(3));
        view.style.setProperty('--my', (y / h * 2 - 1).toFixed(3));

        dekatTR = x > w - DEKAT && y < DEKAT;
        dekatBL = x < DEKAT && y > h - DEKAT;
        dekatUser = x > w - DEKAT * 1.6 && y > h - DEKAT;

        if (view.querySelector('.pv')) return;   // sedang pratinjau cetak
        const p = x >= w - POJOK && y <= POJOK ? 'dashboard' : x <= POJOK && y >= h - POJOK ? kerja.go : null;
        if (p === pojokAktif) return;
        batalPojok();
        if (!p || p === halaman) return;
        pojokAktif = p;
        timerPojok = setTimeout(() => { batalPojok(); location.hash = `#/${p}`; }, DWELL);
    }

    // Minta konfirmasi, catat ke log, hapus data login, lalu kembali ke landing.
    async function keluar() {
        if (!await konfirmasi('Keluar dari aplikasi?', 'Keluar')) return;
        api.post('/auth/logout', { username: user.username }).catch(() => {});
        hapusUser();
    }

    // Lantai parkir tetap terisi walau halaman aktif tidak memuat data area.
    api.get<{ data: Area[] }>('/area').then(a => panel.areas = a.data).catch(() => {});

    onDestroy(() => {
        clearTimeout(timerSambut);
        batalPojok();
        panel.areas = [];
    });
</script>

{#snippet cincin()}
    <svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15"/><circle class="ring-isi" cx="18" cy="18" r="15"/></svg>
{/snippet}

<div class="owner" class:sambut data-role={user.role} data-halaman={dashboardAktif ? 'dashboard' : 'laporan'} role="presentation"
    bind:this={view} onpointermove={gerak} onpointerleave={batalPojok}>
    <Lantai />
    <div class="owner-vignette"></div>

    {#key halaman}
        <main class="owner-page masuk">
            {#if dashboardAktif}
                <Dashboard role={user.role} />
            {:else if halaman === 'laporan'}
                <Rekap />
            {:else if halaman === 'transaksi'}
                <Transaksi {user} />
            {:else}
                <Master tab={halaman} {user} />
            {/if}
        </main>
    {/key}

    <a class="corner corner-tr" class:dekat={dekatTR} class:isi={pojokAktif === 'dashboard'} class:di-sini={dashboardAktif} href="#/dashboard">
        <span><b>Dashboard</b><small>kondisi sekarang</small></span>
        <i>↗{@render cincin()}</i>
    </a>
    <a class="corner corner-bl" class:dekat={dekatBL} class:isi={pojokAktif === kerja.go} class:di-sini={!dashboardAktif} href="#/{kerja.go}">
        <i>↙{@render cincin()}</i>
        <span><b>{kerja.judul}</b><small>{kerja.sub}</small></span>
    </a>

    <div class="owner-user" class:dekat={dekatUser}>
        <span class="owner-nama"><span>{user.nama_lengkap}</span><button type="button" onclick={keluar}>Keluar</button></span>
        <span class="owner-inisial" aria-hidden="true">{user.nama_lengkap.trim()[0].toUpperCase()}</span>
    </div>
</div>

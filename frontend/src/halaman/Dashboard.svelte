<script lang="ts">
    import { api } from '../lib/api';
    import { panel } from '../lib/panel.svelte';
    import { ulang } from '../lib/ui.svelte';
    import type { Area, Role, Stats } from '../lib/tipe';

    // Kondisi parkir sekarang. Dipakai semua role.
    let { role }: { role: Role } = $props();

    const LANJUT: Record<Role, [string, string]> = {
        owner: ['#/laporan', 'Buka rekap transaksi'],
        petugas: ['#/transaksi', 'Buka pos gerbang'],
        admin: ['#/area', 'Buka data master']
    };

    let stats = $state<Stats | null>(null);
    let info = $state('Memuat data...');

    const persen = $derived(stats?.kapasitas_total ? Math.round(stats.kapasitas_terisi / stats.kapasitas_total * 100) : 0);

    async function muat() {
        try {
            const [s, a] = await Promise.all([api.get<Stats>('/stats'), api.get<{ data: Area[] }>('/area')]);
            stats = s;
            panel.areas = a.data;
            info = `Diperbarui ${new Date().toLocaleTimeString('id-ID')} · otomatis tiap 10 detik`;
        } catch (err) {
            info = (err as Error).message;
        }
    }

    $effect(() => {
        muat();
        return ulang(muat, 10000);
    });
</script>

<section class="o-dash">
    <p class="o-eyebrow"><span class="live-dot"></span> Kondisi sekarang</p>
    <h1 class="o-big">{stats?.parkir_aktif ?? '–'}</h1>
    <p class="o-sub">kendaraan sedang parkir</p>
    <div class="o-meter"><span style="width:{Math.min(100, persen)}%"></span></div>
    <p class="o-sub small">{#if stats}{stats.kapasitas_terisi} dari {stats.kapasitas_total} slot terisi · {persen}%{:else}&nbsp;{/if}</p>
    <div class="o-areas">
        {#each panel.areas as x (x.id)}
            {@const p = x.kapasitas ? Math.round(x.terisi / x.kapasitas * 100) : 0}
            <div class="o-area" class:penuh={p >= 100}>
                <b>{x.nama_area}</b>
                <span>{x.terisi}/{x.kapasitas}</span>
                <em>{p}%</em>
            </div>
        {/each}
    </div>
    <div class="o-legend">
        <span><i class="lg-off"></i> Kosong</span>
        <span><i class="lg-on"></i> Terisi</span>
        <span><i class="lg-full"></i> Area penuh</span>
    </div>
    <a class="o-btn o-lanjut" href={LANJUT[role][0]}>{LANJUT[role][1]} →</a>
    <p class="o-note">{info}</p>
</section>

<script lang="ts">
    import { WARNA_JENIS, type Irisan } from '../lib/grafik';

    // Grafik donat. Kalau semua nilai 0, tampil abu-abu kosong.
    // Kesan tebal didapat dari 14 lapis lingkaran yang ditumpuk.
    let { items, labelTengah = 'kendaraan' }: { items: Irisan[]; labelTengah?: string } = $props();

    const LAPIS = 14;
    const warna = $derived.by(() => {
        const total = items.reduce((a, b) => a + b.nilai, 0);
        if (total <= 0) return '#1c2b55 0deg 360deg';
        let sudut = 0;
        return items.map((it, i) => {
            const awal = sudut;
            sudut += it.nilai / total * 360;
            return `${WARNA_JENIS[i % WARNA_JENIS.length]} ${awal}deg ${sudut}deg`;
        }).join(', ');
    });
</script>

<div class="donut3d">
    <div class="donut-stack" style="--g:conic-gradient({warna})">
        {#each { length: LAPIS } as _, i}
            <i style="--z:{i * 2}px;--b:{(0.35 + i / LAPIS * 0.65).toFixed(2)}"></i>
        {/each}
    </div>
    <div class="donut-center"><b>{items.reduce((a, b) => a + b.jumlah, 0)}</b><small>{labelTengah}</small></div>
</div>

<script lang="ts">
    import type { Batang } from '../lib/grafik';

    // Grafik batang CSS 3D. Tiap batang terdiri dari 3 sisi: depan, samping, atas.
    // Tinggi dihitung relatif terhadap nilai terbesar. Batang tumbuh saat induknya diberi kelas 'tumbuh'.
    let { data, tinggi = 200, lebar = 34, dalam = 26, format = String, kelas = '' }: {
        data: Batang[];
        tinggi?: number;
        lebar?: number;
        dalam?: number;
        format?: (n: number) => string;
        kelas?: string;
    } = $props();

    const max = $derived(Math.max(1, ...data.map(d => d.nilai)));
</script>

<div class="chart3d {kelas}" class:banyak={data.length > 12} style="--H:{tinggi}px;--W:{lebar}px;--D:{dalam}px">
    <div class="bars3d">
        <div class="bars-floor"></div>
        {#each data as d, i}
            <div class="bar3d" class:max={d.nilai === max && d.nilai > 0}
                style="--i:{i};--hp:{(d.nilai / max * tinggi).toFixed(1)}px" title="{d.label}: {format(d.nilai)}">
                <i class="f-front"></i><i class="f-side"></i><i class="f-top"></i>
                {#if d.nilai > 0}<span class="bar-val">{format(d.nilai)}</span>{/if}
                <span class="bar-label">{d.label}</span>
            </div>
        {/each}
    </div>
</div>

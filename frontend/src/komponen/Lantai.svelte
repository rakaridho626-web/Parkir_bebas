<script lang="ts">
    import { panel } from '../lib/panel.svelte';
    import type { Area } from '../lib/tipe';

    // Lantai parkir isometrik di latar panel. Jumlah kotak menyala = kendaraan yang parkir.

    // Acak urutan slot, tapi hasilnya selalu sama untuk seed yang sama,
    // supaya slot yang menyala tidak berpindah-pindah tiap data diperbarui.
    function urutanAcak(n: number, seed: number): number[] {
        const idx = [...Array(n).keys()];
        let s = seed * 9301 + 49297;
        for (let i = n - 1; i > 0; i--) {
            s = (s * 9301 + 49297) % 233280;
            const j = Math.floor(s / 233280 * (i + 1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        return idx;
    }

    // Area sangat besar (di atas 120 slot) digambar 1 kotak mewakili beberapa slot.
    function olah(a: Area) {
        const per = Math.max(1, Math.ceil(a.kapasitas / 120));
        const kotak = Math.ceil(a.kapasitas / per);
        let nyala = Math.min(kotak, Math.round(a.terisi / per));
        if (a.terisi > 0 && nyala === 0) nyala = 1;
        return { per, kotak, penuh: a.terisi >= a.kapasitas, on: new Set(urutanAcak(kotak, a.id).slice(0, nyala)) };
    }
</script>

<div class="lot-stage" aria-hidden="true">
    <div class="lot-tilt">
        <div class="lot-plane">
            {#each panel.areas as a (a.id)}
                {@const l = olah(a)}
                <div class="lot" class:penuh={l.penuh} style="--cols:{Math.min(10, l.kotak)}">
                    <div class="lot-label">
                        <b>{a.kode_area}</b>
                        <span>{a.terisi}/{a.kapasitas}{l.penuh ? ' · PENUH' : ''}</span>
                        {#if l.per > 1}<small>1 kotak = {l.per} slot</small>{/if}
                    </div>
                    <div class="lot-grid">
                        {#each { length: l.kotak } as _, i}
                            <i class:on={l.on.has(i)} style="--d:{Math.min(i, 60)}"></i>
                        {/each}
                    </div>
                </div>
            {/each}
            <span class="lot-streak s1"></span><span class="lot-streak s2"></span>
        </div>
    </div>
</div>

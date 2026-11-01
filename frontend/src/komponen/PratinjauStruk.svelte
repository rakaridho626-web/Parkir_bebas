<script lang="ts">
    import Ikon from './Ikon.svelte';
    import Struk from './Struk.svelte';
    import { cetak, fokus, kePanel } from '../lib/cetak';
    import { kapital } from '../lib/format';
    import type { Struk as DataStruk, Tiket } from '../lib/tipe';

    // Layar pratinjau: kertas melayang di kiri, ringkasan dan tombol cetak di kanan.
    let { judul, data, onclose }: { judul: string; data: Tiket | DataStruk; onclose: () => void } = $props();

    let keluar = $state(false);
    let wrap: HTMLElement;

    function tutup() {
        keluar = true;
        setTimeout(onclose, 250);
    }

    // Kertas miring mengikuti kursor.
    function miring(e: PointerEvent) {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        wrap.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 20).toFixed(2)}deg`);
        wrap.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 14).toFixed(2)}deg`);
    }
</script>

<svelte:document onkeydown={e => { if (e.key === 'Escape') tutup(); }} />

<div class="pv" class:keluar use:kePanel>
    <div class="pv-meja pv-meja-struk" role="presentation" onpointermove={miring}>
        <div class="pv-kertas-wrap pv-wrap-struk" bind:this={wrap}>
            <div class="pv-kertas pv-kertas-struk"><Struk {data} /></div>
        </div>
    </div>
    <aside class="pv-panel">
        <p class="o-eyebrow">Pratinjau cetak</p>
        <h2>{judul}</h2>
        <p class="pv-periode">{data.kode_tiket}</p>
        <dl class="pv-info">
            <dt>Plat Nomor</dt><dd>{data.plat_nomor}</dd>
            <dt>Jenis</dt><dd>{kapital(data.jenis_kendaraan)}</dd>
            <dt>Area</dt><dd>{data.nama_area}</dd>
            <dt>Kertas</dt><dd>Thermal 72 mm</dd>
        </dl>
        <button class="btn-glow pv-cetak" type="button" use:fokus onclick={() => cetak(Struk, { data })}><Ikon nama="print" /> Cetak sekarang</button>
        <button class="pv-batal" type="button" onclick={tutup}>Tutup</button>
    </aside>
</div>

<script lang="ts">
    import { tick } from 'svelte';
    import Ikon from './Ikon.svelte';
    import LaporanA4 from './LaporanA4.svelte';
    import { cetak, fokus, kePanel } from '../lib/cetak';
    import { periode, rupiah } from '../lib/format';
    import type { Laporan } from '../lib/tipe';

    // Layar pratinjau laporan: pilih warna dan isi, lihat perkiraan halaman, lalu cetak.
    let { laporan, mulai, sampai, onclose }: {
        laporan: Laporan;
        mulai: string;
        sampai: string;
        onclose: () => void;
    } = $props();

    let bw = $state(false);
    let detail = $state(true);
    let keluar = $state(false);
    let halaman = $state(1);
    let lebarMeja = $state(0);
    let kertas: HTMLElement;
    let wrap: HTMLElement;

    const zoom = $derived(Math.min(0.8, (lebarMeja - 100) / 794).toFixed(3));

    // Perkirakan jumlah halaman tiap pilihan berubah.
    $effect(() => {
        void bw; void detail;
        tick().then(() => {
            const lp = kertas.firstElementChild as HTMLElement;
            halaman = Math.max(1, Math.ceil(lp.offsetHeight / 1024));
        });
    });

    function tutup() {
        keluar = true;
        setTimeout(onclose, 250);
    }

    function miring(e: PointerEvent) {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        wrap.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(2)}deg`);
        wrap.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(2)}deg`);
    }
</script>

<svelte:document onkeydown={e => { if (e.key === 'Escape') tutup(); }} />

<div class="pv" class:keluar use:kePanel>
    <div class="pv-meja" role="presentation" bind:clientWidth={lebarMeja} onpointermove={miring}>
        <div class="pv-kertas-wrap" bind:this={wrap} style:zoom data-hal={Math.min(halaman, 3)}>
            <span class="pv-tumpuk t2"></span><span class="pv-tumpuk t1"></span>
            <div class="pv-kertas" bind:this={kertas}>
                <LaporanA4 {laporan} {mulai} {sampai} {bw} {detail} />
            </div>
        </div>
    </div>
    <aside class="pv-panel">
        <p class="o-eyebrow">Pratinjau cetak</p>
        <h2>Laporan Rekap</h2>
        <p class="pv-periode">{periode(mulai, sampai)}</p>

        <div class="pv-grup">
            <span class="pv-label">Warna</span>
            <div class="pv-seg">
                <button type="button" class:on={!bw} onclick={() => bw = false}><i class="sw-warna"></i>Berwarna</button>
                <button type="button" class:on={bw} onclick={() => bw = true}><i class="sw-bw"></i>Hitam-putih</button>
            </div>
        </div>
        <div class="pv-grup">
            <span class="pv-label">Isi laporan</span>
            <div class="pv-seg">
                <button type="button" class:on={detail} onclick={() => detail = true}>Lengkap</button>
                <button type="button" class:on={!detail} onclick={() => detail = false}>Ringkasan saja</button>
            </div>
        </div>

        <dl class="pv-info">
            <dt>Transaksi</dt><dd>{laporan.data.length}</dd>
            <dt>Total</dt><dd>{rupiah(laporan.total_pendapatan)}</dd>
            <dt>Kertas</dt><dd>A4 · tegak</dd>
            <dt>Perkiraan</dt><dd>{halaman} halaman</dd>
        </dl>

        <button class="btn-glow pv-cetak" type="button" use:fokus onclick={() => cetak(LaporanA4, { laporan, mulai, sampai, bw, detail })}><Ikon nama="print" /> Cetak sekarang</button>
        <button class="pv-batal" type="button" onclick={tutup}>Batal</button>
        <p class="pv-tip">Tip: pilih "Simpan sebagai PDF" di dialog cetak untuk menyimpan file.</p>
    </aside>
</div>

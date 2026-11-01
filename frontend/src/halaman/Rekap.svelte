<script lang="ts">
    import { tick } from 'svelte';
    import Batang3D from '../komponen/Batang3D.svelte';
    import Donat3D from '../komponen/Donat3D.svelte';
    import Ikon from '../komponen/Ikon.svelte';
    import PratinjauLaporan from '../komponen/PratinjauLaporan.svelte';
    import { api } from '../lib/api';
    import { unduhCsv } from '../lib/csv';
    import { hariIni, kapital, periode, rupiah, tanggal } from '../lib/format';
    import { kelompokHari, perJam, perJenis, putarChart, rupiahSingkat, WARNA_JENIS } from '../lib/grafik';
    import { toast } from '../lib/ui.svelte';
    import type { Laporan } from '../lib/tipe';

    // Rekap transaksi owner sesuai rentang waktu yang diminta, bisa dicetak dan diekspor.
    const RENTANG = [[0, 'Hari ini'], [6, '7 hari'], [29, '30 hari']] as const;

    let mulai = $state(hariIni(-6));
    let sampai = $state(hariIni());
    let chip = $state<number | null>(6);
    let laporan = $state<Laporan | null>(null);
    // Rentang milik laporan yang sedang tampil, bisa beda dari isi kotak tanggal yang belum ditampilkan.
    let dimuat = $state({ mulai: hariIni(-6), sampai: hariIni() });
    let memuat = $state(true);
    let error = $state('');
    let tumbuh = $state(false);
    let pratinjau = $state(false);

    const rows = $derived(laporan?.data ?? []);
    const total = $derived(Number(laporan?.total_pendapatan) || 0);
    const n = $derived(rows.length);
    const hari = $derived(kelompokHari(rows, dimuat.mulai, dimuat.sampai));
    const jenis = $derived(perJenis(rows, r => Number(r.total_bayar)));
    const jam = $derived(perJam(rows));
    const rataDurasi = $derived(n ? rows.reduce((a, r) => a + Number(r.durasi_jam), 0) / n : 0);
    const tersibuk = $derived(hari.reduce((a, b) => b.nilai > a.nilai ? b : a, { nilai: 0, label: '-' }));
    const jamRamai = $derived(jam.reduce((a, b) => b.nilai > a.nilai ? b : a, { nilai: 0, label: '-' }));

    // Ambil laporan dari backend sesuai tanggal.
    async function tampilkan() {
        if (mulai > sampai) {
            toast('Tanggal awal tidak boleh setelah tanggal akhir.', 'err');
            return;
        }
        memuat = true;
        error = '';
        tumbuh = false;
        const rentang = { mulai, sampai };
        try {
            const q = new URLSearchParams({ start_date: mulai, end_date: sampai });
            laporan = await api.get<Laporan>(`/laporan?${q}`);
            dimuat = rentang;
            memuat = false;
            await tick();
            requestAnimationFrame(() => requestAnimationFrame(() => tumbuh = true));
        } catch (err) {
            error = (err as Error).message;
            memuat = false;
        }
    }

    function pilihRentang(hariLalu: number) {
        chip = hariLalu;
        mulai = hariIni(-hariLalu);
        sampai = hariIni();
        tampilkan();
    }

    function kirim(e: SubmitEvent) {
        e.preventDefault();
        chip = null;
        tampilkan();
    }

    $effect(() => { tampilkan(); });
</script>

<section class="o-rekap">
    <header class="o-rekap-head">
        <div>
            <p class="o-eyebrow">Rekap transaksi · {laporan ? periode(dimuat.mulai, dimuat.sampai) : ''}</p>
            <h1 class="o-big rp">{laporan ? rupiah(total) : '–'}</h1>
            <p class="o-sub">total pendapatan</p>
        </div>
        <form class="o-filter" onsubmit={kirim}>
            <div class="o-chips">
                {#each RENTANG as [nilai, label]}
                    <button type="button" class:on={chip === nilai} onclick={() => pilihRentang(nilai)}>{label}</button>
                {/each}
            </div>
            <div class="o-range">
                <input type="date" bind:value={mulai} required aria-label="Dari tanggal">
                <span>–</span>
                <input type="date" bind:value={sampai} required aria-label="Sampai tanggal">
                <button class="o-btn" type="submit">Tampilkan</button>
                <button class="o-btn ghost" type="button" disabled={memuat || !n} onclick={() => pratinjau = true}><Ikon nama="print" /> Cetak</button>
                <button class="o-btn ghost" type="button" disabled={memuat || !n} onclick={() => unduhCsv(rows, total, dimuat.mulai, dimuat.sampai)}><Ikon nama="unduh" /> Export</button>
            </div>
        </form>
    </header>

    <div class:tumbuh use:putarChart>
        {#if memuat}
            <p class="o-note"><span class="spinner"></span> Menghitung rekap...</p>
        {:else if error}
            <p class="o-note err">{error}</p>
        {:else}
            <div class="o-kpis">
                <div class="o-kpi"><small>Transaksi selesai</small><b>{n}</b></div>
                <div class="o-kpi"><small>Rata-rata per kendaraan</small><b>{rupiah(n ? total / n : 0)}</b></div>
                <div class="o-kpi"><small>Rata-rata lama parkir</small><b>{rataDurasi.toFixed(1).replace('.', ',')} jam</b></div>
                <div class="o-kpi">
                    <small>Hari terbaik</small><b>{tersibuk.nilai ? tersibuk.label : '-'}</b>
                    {#if tersibuk.nilai}<em>{rupiah(tersibuk.nilai)}</em>{/if}
                </div>
            </div>

            <div class="o-grid">
                <article class="o-card o-wide">
                    <header><h3>Pendapatan per {hari[0]?.minggu ? 'minggu' : 'hari'}</h3><span>gerakkan kursor untuk memutar</span></header>
                    <Batang3D data={hari} format={rupiahSingkat} lebar={Math.max(14, Math.min(40, 520 / hari.length))} />
                </article>

                <article class="o-card">
                    <header><h3>Pendapatan per jenis</h3></header>
                    {#if jenis.length}
                        <Donat3D items={jenis} />
                        <ul class="o-legend-list">
                            {#each jenis as j, i}
                                <li>
                                    <i style="background:{WARNA_JENIS[i % WARNA_JENIS.length]}"></i>
                                    <span>{j.jenis}<small>{j.jumlah} kendaraan</small></span>
                                    <b>{rupiah(j.nilai)}<small>{Math.round(j.nilai / (total || 1) * 100)}%</small></b>
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="o-note">Belum ada transaksi.</p>
                    {/if}
                </article>

                <article class="o-card o-wide">
                    <header><h3>Jam kendaraan masuk</h3><span>{jamRamai.nilai ? `paling ramai jam ${jamRamai.label}.00` : 'belum ada data'}</span></header>
                    <Batang3D data={jam} tinggi={110} lebar={14} dalam={12} kelas="kecil" />
                </article>

                <article class="o-card o-full">
                    <header><h3>Detail transaksi</h3><span>{n} transaksi</span></header>
                    {#if n}
                        <div class="o-table">
                            <table>
                                <thead><tr><th>Kode Tiket</th><th>Plat</th><th>Jenis</th><th>Masuk</th><th>Keluar</th><th class="right">Durasi</th><th class="right">Bayar</th></tr></thead>
                                <tbody>
                                    {#each rows as r (r.kode_tiket)}
                                        <tr>
                                            <td class="mono">{r.kode_tiket}</td>
                                            <td><span class="plat">{r.plat_nomor}</span></td>
                                            <td>{kapital(r.jenis_kendaraan)}</td>
                                            <td>{tanggal(r.waktu_masuk)}</td>
                                            <td>{tanggal(r.waktu_keluar)}</td>
                                            <td class="right">{r.durasi_jam} jam</td>
                                            <td class="right"><b>{rupiah(r.total_bayar)}</b></td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {:else}
                        <p class="o-note">Tidak ada transaksi selesai di periode ini.</p>
                    {/if}
                </article>
            </div>
        {/if}
    </div>
</section>

{#if pratinjau && laporan}
    <PratinjauLaporan {laporan} mulai={dimuat.mulai} sampai={dimuat.sampai} onclose={() => pratinjau = false} />
{/if}

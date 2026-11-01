<script lang="ts">
    import { auth } from '../lib/auth.svelte';
    import { kapital, periode, rupiah, tanggal } from '../lib/format';
    import { kelompokHari, perJenis } from '../lib/grafik';
    import type { Laporan } from '../lib/tipe';

    // Laporan A4. bw = hitam-putih, detail = sertakan tabel detail transaksi.
    let { laporan, mulai, sampai, bw = false, detail = true }: {
        laporan: Laporan;
        mulai: string;
        sampai: string;
        bw?: boolean;
        detail?: boolean;
    } = $props();

    const rows = $derived([...laporan.data].sort((x, y) => +new Date(x.waktu_keluar) - +new Date(y.waktu_keluar)));
    const total = $derived(Number(laporan.total_pendapatan) || 0);
    const n = $derived(rows.length);
    const jenis = $derived(perJenis(rows, r => Number(r.total_bayar)));
    const hari = $derived(kelompokHari(rows, mulai, sampai));
    const perMinggu = $derived(!!hari[0]?.minggu);
    const maxHari = $derived(Math.max(1, ...hari.map(h => h.nilai)));
    const rataDurasi = $derived(n ? rows.reduce((a, r) => a + Number(r.durasi_jam), 0) / n : 0);

    // Hitung jumlah transaksi per tanggal.
    const jmlHari = $derived.by(() => {
        const hasil: Record<string, number> = {};
        for (const r of rows) {
            const k = new Date(r.waktu_keluar).toLocaleDateString('sv-SE');
            hasil[k] = (hasil[k] || 0) + 1;
        }
        return hasil;
    });

    const sekarang = new Date();
    const nama = auth.user?.nama_lengkap ?? '-';
    const nomor = `LAP-${sekarang.toLocaleDateString('sv-SE').replace(/-/g, '')}-${String(sekarang.getHours()).padStart(2, '0')}${String(sekarang.getMinutes()).padStart(2, '0')}`;
    const tgl = (d: string) => new Date(d).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    const persen = (v: number) => `${(v / (total || 1) * 100).toFixed(1).replace('.', ',')}%`;
</script>

<div class="lp" class:bw>
    <header class="lp-kop">
        <div class="lp-brand">
            <span class="lp-logo">P</span>
            <div><b>PARKIR BEBAS</b><small>Sistem Manajemen Parkir</small></div>
        </div>
        <div class="lp-judul">
            <h1>Laporan Rekap Transaksi</h1>
            <p>Periode {periode(mulai, sampai)}</p>
            <p class="lp-no">No. {nomor}</p>
        </div>
    </header>

    <section class="lp-kpi">
        <div class="utama"><small>Total pendapatan</small><b>{rupiah(total)}</b></div>
        <div><small>Transaksi selesai</small><b>{n}</b></div>
        <div><small>Rata-rata / kendaraan</small><b>{rupiah(n ? total / n : 0)}</b></div>
        <div><small>Rata-rata lama parkir</small><b>{rataDurasi.toFixed(1).replace('.', ',')} jam</b></div>
    </section>

    <section class="lp-dua">
        <div>
            <h2>Ringkasan per jenis kendaraan</h2>
            <table class="lp-tabel">
                <thead><tr><th>Jenis</th><th class="r">Kendaraan</th><th class="r">Pendapatan</th><th class="r">Porsi</th></tr></thead>
                <tbody>
                    {#each jenis as j}
                        <tr>
                            <td>{j.jenis}</td><td class="r">{j.jumlah}</td><td class="r">{rupiah(j.nilai)}</td>
                            <td class="r">{persen(j.nilai)}<span class="lp-bar"><i style="width:{j.nilai / (total || 1) * 100}%"></i></span></td>
                        </tr>
                    {/each}
                </tbody>
                <tfoot><tr><td>Total</td><td class="r">{n}</td><td class="r">{rupiah(total)}</td><td class="r">100%</td></tr></tfoot>
            </table>
        </div>
        <div>
            <h2>Pendapatan per {perMinggu ? 'minggu' : 'hari'}</h2>
            <table class="lp-tabel">
                <thead>
                    <tr>
                        <th>{perMinggu ? 'Minggu mulai' : 'Tanggal'}</th>
                        {#if !perMinggu}<th class="r">Transaksi</th>{/if}
                        <th class="r">Pendapatan</th>
                    </tr>
                </thead>
                <tbody>
                    {#each hari as h}
                        <tr>
                            <td>{new Date(h.kunci + 'T00:00').toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                            {#if !h.minggu}<td class="r">{jmlHari[h.kunci] || 0}</td>{/if}
                            <td class="r">{rupiah(h.nilai)}<span class="lp-bar"><i style="width:{h.nilai / maxHari * 100}%"></i></span></td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </section>

    {#if detail}
        <h2>Detail transaksi</h2>
        <table class="lp-tabel lp-detail">
            <thead><tr><th class="r">No</th><th>Kode Tiket</th><th>Plat Nomor</th><th>Jenis</th><th>Masuk</th><th>Keluar</th><th class="r">Durasi</th><th class="r">Bayar</th></tr></thead>
            <tbody>
                {#each rows as r, i}
                    <tr>
                        <td class="r">{i + 1}</td><td class="mono">{r.kode_tiket}</td><td class="mono">{r.plat_nomor}</td>
                        <td>{kapital(r.jenis_kendaraan)}</td><td>{tgl(r.waktu_masuk)}</td><td>{tgl(r.waktu_keluar)}</td>
                        <td class="r">{r.durasi_jam} jam</td><td class="r">{rupiah(r.total_bayar)}</td>
                    </tr>
                {/each}
            </tbody>
            <tfoot><tr><td colspan="7">Total {n} transaksi</td><td class="r">{rupiah(total)}</td></tr></tfoot>
        </table>
    {/if}

    <footer class="lp-kaki">
        <p class="lp-info">Dicetak oleh {nama} pada {tanggal(sekarang)}.<br>
            Laporan ini dibuat otomatis oleh sistem Parkir Bebas.</p>
        <div class="lp-ttd">
            <p>Mengetahui,<br>Owner</p>
            <span></span>
            <p><b>{nama}</b></p>
        </div>
    </footer>
</div>

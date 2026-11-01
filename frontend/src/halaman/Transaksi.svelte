<script lang="ts">
    import Ikon from '../komponen/Ikon.svelte';
    import PratinjauStruk from '../komponen/PratinjauStruk.svelte';
    import { api } from '../lib/api';
    import { fokus } from '../lib/cetak';
    import { kapital, lama, rupiah, tanggal } from '../lib/format';
    import { panel } from '../lib/panel.svelte';
    import { toast, ulang } from '../lib/ui.svelte';
    import type { Area, Estimasi, Kendaraan, Stats, Struk, Tarif, Tiket, User } from '../lib/tipe';

    // Pos gerbang petugas: kendaraan masuk, keluar, cetak karcis dan struk.
    // Isi form tidak hilang saat data diperbarui otomatis.
    let { user }: { user: User } = $props();

    let stats = $state<Stats | null>(null);
    let tarif = $state<Tarif[]>([]);
    let kendaraan = $state<Kendaraan[]>([]);
    let aktif = $state<Tiket[]>([]);
    let error = $state('');

    let plat = $state('');
    let idTarif = $state<number | ''>('');
    let idArea = $state<number | ''>('');
    let simpan = $state(false);

    let cari = $state('');
    let saring = $state('');
    let tagihan = $state<{ transaksi: Tiket; estimasi: Estimasi } | null>(null);
    let pesanKeluar = $state('');
    let errorKeluar = $state(false);
    let menghitung = $state(false);
    let membayar = $state(false);
    let fKeluar: HTMLFormElement;

    let pratinjau = $state<{ judul: string; data: Tiket | Struk } | null>(null);

    const SAPA_KELUAR = 'Cari kode tiket atau plat, atau pilih kendaraan dari daftar di bawah.';

    const daftar = $derived.by(() => {
        const q = saring.trim().toLowerCase();
        return q ? aktif.filter(x => `${x.plat_nomor} ${x.kode_tiket} ${x.nama_area}`.toLowerCase().includes(q)) : aktif;
    });

    // Ambil data terbaru. Hanya angka, pilihan, dan tabel yang berubah, jadi form yang sedang diisi aman.
    async function muat() {
        try {
            const [s, t, a, k, m] = await Promise.all([
                api.get<Stats>('/stats'),
                api.get<{ data: Tarif[] }>('/tarif'),
                api.get<{ data: Area[] }>('/area'),
                api.get<{ data: Kendaraan[] }>('/kendaraan').catch(() => ({ data: [] })),
                api.get<{ data: Tiket[] }>('/transaksi/aktif')
            ]);
            stats = s; tarif = t.data; panel.areas = a.data; kendaraan = k.data; aktif = m.data;
            error = '';
        } catch (err) {
            error = (err as Error).message;
        }
    }

    $effect(() => {
        muat();
        return ulang(muat, 15000);
    });

    // Plat yang terdaftar langsung memilih jenis kendaraannya.
    function isiPlat() {
        const p = plat.trim().toUpperCase();
        const k = kendaraan.find(x => x.plat_nomor === p);
        const t = k && tarif.find(x => x.jenis_kendaraan.toLowerCase() === k.jenis_kendaraan.toLowerCase());
        if (t) idTarif = t.id;
    }

    // Simpan kendaraan masuk. Tombol dimatikan sementara supaya tidak terkirim dua kali.
    async function masuk(e: SubmitEvent) {
        e.preventDefault();
        simpan = true;
        try {
            const res = await api.post<{ message: string; tiket: Tiket }>('/transaksi/masuk', {
                plat_nomor: plat.trim().toUpperCase(),
                id_tarif: idTarif,
                id_area: idArea,
                id_user: user.id
            });
            toast(res.message);
            plat = ''; idTarif = ''; idArea = '';
            pratinjau = { judul: 'Karcis masuk', data: res.tiket };
            muat();
        } catch (err) {
            toast((err as Error).message, 'err');
        } finally {
            simpan = false;
        }
    }

    // Kembalikan kotak kendaraan keluar ke kondisi awal.
    function bersihkanKeluar() {
        cari = '';
        tagihan = null;
        pesanKeluar = '';
    }

    // Tampilkan rincian biaya. Pembayaran baru terjadi setelah petugas menekan tombol bayar.
    async function cekBiaya(search: string) {
        tagihan = null;
        pesanKeluar = '';
        menghitung = true;
        try {
            tagihan = await api.post<{ transaksi: Tiket; estimasi: Estimasi }>('/transaksi/hitung-keluar', { search });
        } catch (err) {
            pesanKeluar = (err as Error).message;
            errorKeluar = true;
        } finally {
            menghitung = false;
        }
    }

    async function bayar() {
        if (!tagihan) return;
        membayar = true;
        try {
            const res = await api.post<{ message: string; struk: Struk }>('/transaksi/bayar', { id: tagihan.transaksi.id, id_user: user.id });
            toast(res.message);
            bersihkanKeluar();
            pratinjau = { judul: 'Struk pembayaran', data: res.struk };
            muat();
        } catch (err) {
            toast((err as Error).message, 'err');
        } finally {
            membayar = false;
        }
    }

    function prosesKeluar(kode: string) {
        cari = kode;
        cekBiaya(kode);
        fKeluar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
</script>

<section class="o-rekap o-kerja">
    <header class="o-head-kecil">
        <div>
            <p class="o-eyebrow"><span class="live-dot"></span> Pos gerbang</p>
            <h1 class="o-judul"><b>{stats?.parkir_aktif ?? '–'}</b> kendaraan di dalam</h1>
        </div>
        <dl class="o-ringkas">
            <div><dt>Slot kosong</dt><dd>{stats ? Math.max(0, stats.kapasitas_total - stats.kapasitas_terisi) : '–'}</dd></div>
            <div><dt>Keluar hari ini</dt><dd>{stats?.transaksi_hari_ini ?? '–'}</dd></div>
            <div><dt>Pendapatan hari ini</dt><dd>{stats ? rupiah(stats.pendapatan_hari_ini) : '–'}</dd></div>
        </dl>
    </header>

    <div class="o-dua">
        <article class="o-card">
            <header><h3>Kendaraan masuk</h3><span>catat lalu cetak karcis</span></header>
            <form class="form o-form" onsubmit={masuk}>
                <label>Plat nomor
                    <input name="plat_nomor" bind:value={plat} oninput={isiPlat} list="dl-plat" class="upper" placeholder="Contoh: B 1234 ABC" required autocomplete="off" use:fokus>
                </label>
                <datalist id="dl-plat">
                    {#each kendaraan as x}
                        <option value={x.plat_nomor}>{kapital(x.jenis_kendaraan)} · {x.pemilik}</option>
                    {/each}
                </datalist>
                <div class="o-form-dua">
                    <label>Jenis kendaraan
                        <select name="id_tarif" bind:value={idTarif} required>
                            <option value="">Pilih jenis</option>
                            {#each tarif as x (x.id)}
                                <option value={x.id}>{kapital(x.jenis_kendaraan)} · {rupiah(x.tarif_per_jam)}/jam</option>
                            {/each}
                        </select>
                    </label>
                    <label>Area parkir
                        <select name="id_area" bind:value={idArea} required>
                            <option value="">Pilih area</option>
                            {#each panel.areas as x (x.id)}
                                {@const sisa = Math.max(0, x.kapasitas - x.terisi)}
                                <option value={x.id} disabled={sisa === 0}>{x.nama_area} · {sisa ? `sisa ${sisa}` : 'penuh'}</option>
                            {/each}
                        </select>
                    </label>
                </div>
                <button class="btn-glow" type="submit" disabled={simpan}><Ikon nama="print" /> Simpan & cetak karcis</button>
            </form>
        </article>

        <article class="o-card">
            <header><h3>Kendaraan keluar</h3><span>hitung biaya lalu bayar</span></header>
            <form class="form-inline o-form" bind:this={fKeluar} onsubmit={e => { e.preventDefault(); cekBiaya(cari.trim()); }}>
                <input name="q" bind:value={cari} placeholder="Kode tiket atau plat nomor" required autocomplete="off" aria-label="Kode tiket atau plat nomor">
                <button class="o-btn" type="submit">Cek biaya</button>
            </form>
            {#if menghitung}
                <p class="o-note"><span class="spinner"></span> Menghitung biaya...</p>
            {:else if tagihan}
                {@const t = tagihan.transaksi}
                <div class="detail">
                    <div class="detail-head">
                        <span class="plat">{t.plat_nomor}</span>
                        <span class="mono small">{t.kode_tiket}</span>
                    </div>
                    <dl>
                        <dt>Jenis</dt><dd>{kapital(t.jenis_kendaraan)}</dd>
                        <dt>Area</dt><dd>{t.nama_area}</dd>
                        <dt>Masuk</dt><dd>{tanggal(t.waktu_masuk)}</dd>
                        <dt>Lama</dt><dd>{lama(t.waktu_masuk)} · dihitung {tagihan.estimasi.durasi_jam} jam</dd>
                    </dl>
                    <div class="total"><span>Total bayar</span><b>{rupiah(tagihan.estimasi.total_bayar)}</b></div>
                    <div class="detail-aksi">
                        <button class="o-btn ghost" type="button" onclick={bersihkanKeluar}>Batal</button>
                        <button class="btn-glow" type="button" disabled={membayar} onclick={bayar}><Ikon nama="print" /> Terima bayar & cetak struk</button>
                    </div>
                </div>
            {:else if pesanKeluar}
                <p class="o-note" class:err={errorKeluar}>{pesanKeluar}</p>
            {:else}
                <p class="o-note">{SAPA_KELUAR}</p>
            {/if}
        </article>
    </div>

    <article class="o-card o-card-tabel">
        <header>
            <h3>Daftar kendaraan di dalam</h3>
            <input type="search" bind:value={saring} class="o-cari" placeholder="Saring plat / tiket..." aria-label="Saring kendaraan">
        </header>
        <div class="o-table">
            {#if error}
                <p class="o-note err">{error}</p>
            {:else if daftar.length}
                <table>
                    <thead><tr><th>Plat</th><th>Kode Tiket</th><th>Jenis</th><th>Area</th><th>Masuk</th><th>Lama</th><th class="right">Aksi</th></tr></thead>
                    <tbody>
                        {#each daftar as x (x.kode_tiket)}
                            <tr>
                                <td><span class="plat">{x.plat_nomor}</span></td>
                                <td class="mono">{x.kode_tiket}</td>
                                <td>{kapital(x.jenis_kendaraan)}</td>
                                <td>{x.nama_area}</td>
                                <td>{tanggal(x.waktu_masuk)}</td>
                                <td>{lama(x.waktu_masuk)}</td>
                                <td class="right"><button class="o-btn o-btn-kecil" type="button" onclick={() => prosesKeluar(x.kode_tiket)}>Proses keluar</button></td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {:else}
                <p class="o-kosong">{saring.trim() ? 'Tidak ada yang cocok.' : 'Belum ada kendaraan di dalam.'}</p>
            {/if}
        </div>
    </article>
</section>

{#if pratinjau}
    <PratinjauStruk judul={pratinjau.judul} data={pratinjau.data} onclose={() => pratinjau = null} />
{/if}

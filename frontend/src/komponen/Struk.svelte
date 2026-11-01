<script lang="ts">
    import { auth } from '../lib/auth.svelte';
    import { kapital, rupiah, tanggal } from '../lib/format';
    import type { Struk, Tiket } from '../lib/tipe';

    // Kertas thermal. Tanpa waktu_keluar berarti karcis masuk, dengan waktu_keluar berarti struk pembayaran.
    let { data }: { data: Tiket | Struk } = $props();

    const struk = $derived('waktu_keluar' in data ? data : null);
    const petugas = $derived((struk ? struk.petugas_keluar : data.petugas_masuk) || auth.user?.nama_lengkap || '-');
</script>

{#snippet baris(label: string, nilai: string)}
    <div class="struk-row"><span>{label}</span><b>{nilai}</b></div>
{/snippet}

<div class="struk">
    <div class="struk-head"><b>PARKIR BEBAS</b><small>{struk ? 'STRUK PEMBAYARAN' : 'KARCIS MASUK'}</small></div>
    <div class="struk-kode">{data.kode_tiket}</div>
    {@render baris('Plat Nomor', data.plat_nomor)}
    {@render baris('Jenis', kapital(data.jenis_kendaraan))}
    {@render baris('Area', data.nama_area)}
    {@render baris('Masuk', tanggal(data.waktu_masuk))}
    {#if struk}
        {@render baris('Keluar', tanggal(struk.waktu_keluar))}
        {@render baris('Durasi', `${struk.durasi_jam} jam`)}
    {/if}
    {@render baris('Tarif', `${rupiah(data.tarif_per_jam)}/jam`)}
    {#if struk}
        <div class="struk-total"><span>TOTAL</span><b>{rupiah(struk.total_bayar)}</b></div>
    {/if}
    {@render baris('Petugas', petugas)}
    {#if struk}
        <p class="struk-foot">Terima kasih.<br>Hati-hati di jalan!</p>
    {:else}
        <p class="struk-foot">Simpan karcis ini.<br>Kehilangan karcis menjadi tanggung jawab pemilik.</p>
    {/if}
</div>

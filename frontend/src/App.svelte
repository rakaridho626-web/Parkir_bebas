<script lang="ts">
    import Landing from './halaman/Landing.svelte';
    import Panel from './halaman/Panel.svelte';
    import FormModal from './komponen/FormModal.svelte';
    import Modal from './komponen/Modal.svelte';
    import { auth } from './lib/auth.svelte';
    import { ui } from './lib/ui.svelte';
    import type { Role } from './lib/tipe';

    // Halaman yang boleh dibuka tiap role (sesuai SPK).
    const AKSES: Record<Role, string[]> = {
        owner: ['dashboard', 'laporan'],
        petugas: ['dashboard', 'transaksi'],
        admin: ['dashboard', 'area', 'tarif', 'kendaraan', 'users', 'log']
    };

    let alamat = $state(location.hash);
    const diminta = $derived(alamat.replace('#/', ''));
    const halaman = $derived(auth.user && AKSES[auth.user.role].includes(diminta) ? diminta : 'dashboard');

    // Halaman tidak boleh dibuka atau tidak ada: arahkan ke dashboard.
    $effect(() => {
        if (auth.user && halaman !== diminta) location.hash = '#/dashboard';
    });
</script>

<svelte:window onhashchange={() => alamat = location.hash} />

<Landing aktif={!auth.user} />
{#if auth.user}
    <Panel user={auth.user} {halaman} />
{/if}

{#if ui.form}
    <FormModal form={ui.form} onclose={() => ui.form = null} />
{/if}

{#if ui.konfirmasi}
    {@const k = ui.konfirmasi}
    <Modal title="Konfirmasi" onclose={() => k.jawab(false)}>
        <p>{k.pesan}</p>
        {#snippet footer()}
            <button class="btn" type="button" onclick={() => k.jawab(false)}>Batal</button>
            <button class="btn btn-danger" type="button" onclick={() => k.jawab(true)}>{k.okLabel}</button>
        {/snippet}
    </Modal>
{/if}

<div class="toast-root">
    {#each ui.toasts as t (t.id)}
        <div class="toast toast-{t.tipe}" class:hide={t.hilang}>{t.pesan}</div>
    {/each}
</div>

<script lang="ts">
    import Modal from './Modal.svelte';
    import type { FormModal } from '../lib/ui.svelte';
    import type { Field } from '../lib/tipe';

    // Modal berisi form. Kalau onSubmit gagal, pesannya tampil di form dan modal tetap terbuka.
    let { form, onclose }: { form: FormModal; onclose: () => void } = $props();

    let el: HTMLFormElement;
    let error = $state('');
    let mengirim = $state(false);

    const nilai = (f: Field) => String(form.data[f.name] ?? '');

    // Kumpulkan isi form jadi objek. Angka diubah ke number, plat diubah ke huruf besar.
    async function kirim(e: SubmitEvent) {
        e.preventDefault();
        if (!el.reportValidity()) return;
        const values: Record<string, string | number> = {};
        for (const f of form.fields) {
            const input = el.elements.namedItem(f.name) as HTMLInputElement | HTMLSelectElement;
            const teks = input.value.trim();
            values[f.name] = f.type === 'number' ? Number(teks) : f.upper ? teks.toUpperCase() : teks;
        }
        mengirim = true;
        try {
            await form.onSubmit(values);
            onclose();
        } catch (err) {
            error = (err as Error).message;
            mengirim = false;
        }
    }

    $effect(() => { el.querySelector<HTMLElement>('input, select')?.focus(); });
</script>

<Modal title={form.title} {onclose}>
    <form class="form" id="modal-form" novalidate bind:this={el} onsubmit={kirim}>
        {#each form.fields as f}
            <label>
                {f.label}
                {#if f.type === 'select'}
                    <select name={f.name} required={f.required}>
                        <option value="">— Pilih —</option>
                        {#each f.options ?? [] as o}
                            <option value={o.value} selected={o.value === nilai(f)}>{o.label}</option>
                        {/each}
                    </select>
                {:else}
                    <input name={f.name} type={f.type ?? 'text'} value={nilai(f)} required={f.required} min={f.min}
                        placeholder={f.placeholder} class:upper={f.upper} autocomplete="off">
                {/if}
                {#if f.hint}<small class="muted">{f.hint}</small>{/if}
            </label>
        {/each}
        {#if error}<p class="form-error">{error}</p>{/if}
    </form>
    {#snippet footer()}
        <button class="btn" type="button" onclick={onclose}>Batal</button>
        <button class="btn btn-primary" type="submit" form="modal-form" disabled={mengirim}>Simpan</button>
    {/snippet}
</Modal>

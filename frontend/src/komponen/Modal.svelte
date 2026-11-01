<script lang="ts">
    import type { Snippet } from 'svelte';
    import Ikon from './Ikon.svelte';

    let { title, onclose, children, footer }: {
        title: string;
        onclose: () => void;
        children: Snippet;
        footer?: Snippet;
    } = $props();

    let wrap: HTMLElement;
</script>

<svelte:document onkeydown={e => { if (e.key === 'Escape') onclose(); }} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="modal-wrap" bind:this={wrap} onclick={e => { if (e.target === wrap) onclose(); }}>
    <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div class="modal-head">
            <h3>{title}</h3>
            <button class="icon-btn" type="button" aria-label="Tutup" onclick={onclose}><Ikon nama="x" /></button>
        </div>
        <div class="modal-body">{@render children()}</div>
        {#if footer}<div class="modal-foot">{@render footer()}</div>{/if}
    </div>
</div>

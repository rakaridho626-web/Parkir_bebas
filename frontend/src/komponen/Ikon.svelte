<script lang="ts">
    import { IKON, type NamaIkon } from '../lib/ikon';

    let { nama }: { nama: NamaIkon } = $props();
</script>

<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">{@html IKON[nama]}</svg>

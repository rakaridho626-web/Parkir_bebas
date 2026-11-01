import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Frontend jalan di port 5173, backend tetap di port 3000.
export default defineConfig({
    plugins: [svelte()],
    server: { port: 5173, strictPort: true },
    preview: { port: 5173, strictPort: true }
});

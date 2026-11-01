import { mount, unmount, type Component } from 'svelte';

// Cetak satu komponen saja (struk / laporan).
// CSS @media print hanya menampilkan #print-area. Setelah dialog cetak ditutup, kembalikan seperti semula.
export function cetak<P extends Record<string, unknown>>(komponen: Component<P>, props: P) {
    const area = document.getElementById('print-area')!;
    const isi = mount(komponen, { target: area, props });
    document.body.classList.add('printing');
    window.addEventListener('afterprint', () => {
        document.body.classList.remove('printing');
        unmount(isi);
    }, { once: true });
    window.print();
}

// Pindahkan elemen ke dalam panel (.owner) supaya menutupi seluruh layar: use:kePanel.
export function kePanel(el: HTMLElement) {
    document.querySelector('.owner')?.appendChild(el);
}

// Fokus otomatis saat elemen muncul: use:fokus.
export function fokus(el: HTMLElement) {
    el.focus();
}

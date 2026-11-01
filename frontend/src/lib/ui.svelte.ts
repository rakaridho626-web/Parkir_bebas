import type { Field } from './tipe';

// Keadaan notifikasi dan dialog. Komponennya digambar sekali di App.svelte.

export interface Toast { id: number; pesan: string; tipe: 'ok' | 'err'; hilang: boolean; }

export interface FormModal {
    title: string;
    fields: Field[];
    data: Record<string, unknown>;
    onSubmit: (values: Record<string, string | number>) => Promise<void>;
}

export interface Konfirmasi {
    pesan: string;
    okLabel: string;
    jawab: (ya: boolean) => void;
}

export const ui = $state<{ toasts: Toast[]; form: FormModal | null; konfirmasi: Konfirmasi | null }>({
    toasts: [], form: null, konfirmasi: null
});

let nomor = 0;

// Notifikasi kecil di pojok kanan bawah yang hilang sendiri.
export function toast(pesan: string, tipe: Toast['tipe'] = 'ok') {
    const id = ++nomor;
    ui.toasts.push({ id, pesan, tipe, hilang: false });
    setTimeout(() => {
        const t = ui.toasts.find(x => x.id === id);
        if (t) t.hilang = true;
    }, 2800);
    setTimeout(() => { ui.toasts = ui.toasts.filter(x => x.id !== id); }, 3200);
}

// Pengganti confirm() bawaan browser. Hasilnya true kalau pengguna menekan tombol OK.
export function konfirmasi(pesan: string, okLabel = 'Hapus'): Promise<boolean> {
    return new Promise(resolve => {
        ui.konfirmasi = {
            pesan, okLabel,
            jawab: ya => { ui.konfirmasi = null; resolve(ya); }
        };
    });
}

export function bukaForm(form: FormModal) {
    ui.form = form;
}

// Jalankan fn berkala, berhenti saat tab browser tidak dilihat. Hasilnya fungsi penghenti.
export function ulang(fn: () => void, ms: number): () => void {
    const t = setInterval(() => { if (!document.hidden) fn(); }, ms);
    return () => clearInterval(t);
}

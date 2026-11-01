import type { User } from './tipe';

// Data user yang sedang login. Disimpan di browser supaya tetap masuk setelah halaman dimuat ulang.
const KUNCI = 'parkir_user';

function bacaUser(): User | null {
    try { return JSON.parse(localStorage.getItem(KUNCI) ?? 'null'); } catch { return null; }
}

export const auth = $state<{ user: User | null }>({ user: bacaUser() });

export function simpanUser(user: User) {
    localStorage.setItem(KUNCI, JSON.stringify(user));
    auth.user = user;
}

export function hapusUser() {
    localStorage.removeItem(KUNCI);
    auth.user = null;
}

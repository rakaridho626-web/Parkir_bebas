import type { Area } from './tipe';

// Data area dipakai bersama: lantai parkir di latar ikut berubah dari halaman mana pun.
export const panel = $state<{ areas: Area[] }>({ areas: [] });

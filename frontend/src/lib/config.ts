// Alamat API backend. Kalau backend pindah alamat atau port, isi VITE_API_BASE di file .env.
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api';

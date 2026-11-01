<script lang="ts">
    import { api } from '../lib/api';
    import { simpanUser } from '../lib/auth.svelte';
    import { Scene } from '../lib/scene';
    import type { Role, User } from '../lib/tipe';

    // Landing page dan login. Kursor ke ujung atas = Owner, kiri bawah = Petugas, kanan bawah = Admin.
    let { aktif }: { aktif: boolean } = $props();

    const PINTU: { role: Role; label: string; posisi: string }[] = [
        { role: 'owner', label: 'Owner', posisi: 'ujung atas' },
        { role: 'petugas', label: 'Petugas', posisi: 'ujung kiri bawah' },
        { role: 'admin', label: 'Admin', posisi: 'ujung kanan bawah' }
    ];

    let view: HTMLElement;
    let canvas: HTMLCanvasElement;
    let zona = $state<Role | null>(null);
    let tanpaWebgl = $state(false);
    let error = $state<Partial<Record<Role, string>>>({});
    let mengirim = $state(false);
    const form: Partial<Record<Role, HTMLFormElement>> = {};

    // Nyalakan latar 3D saat landing tampil, hentikan saat disembunyikan supaya hemat CPU.
    $effect(() => {
        if (!aktif) return;
        setZona(null);
        if (!Scene.start(canvas)) tanpaWebgl = true;
        return () => Scene.stop();
    });

    // Aktifkan satu pintu: form muncul, kamera 3D ikut berpindah.
    function setZona(z: Role | null) {
        zona = z;
        Scene.setZona(z);
    }

    // Zona dari posisi kursor: muncul saat kursor mendekati ujung layar.
    function zonaDari(x: number, y: number): Role | null {
        const w = view.clientWidth, h = view.clientHeight;
        const dx = x - w / 2, dy = y - h / 2;
        if (Math.hypot(dx / (w / 2), dy / (h / 2)) < 0.32) return null;   // area tengah = netral
        const a = Math.atan2(dy, dx) * 180 / Math.PI;
        if (a > -150 && a < -30) return 'owner';
        if (a >= -30 && a <= 90) return 'admin';
        return 'petugas';
    }

    // Form yang sedang diisi tidak boleh tertutup karena kursor bergeser.
    function terkunci(): boolean {
        const f = zona && form[zona];
        if (!f) return false;
        return f.contains(document.activeElement) || [...f.elements].some(el => el instanceof HTMLInputElement && el.value);
    }

    // Kosongkan semua form dan hilangkan pesan error.
    function reset() {
        Object.values(form).forEach(f => f.reset());
        error = {};
        (document.activeElement as HTMLElement | null)?.blur();
    }

    const diKartu = (e: Event) => !!(e.target as HTMLElement).closest('.portal-card');

    function gerak(e: PointerEvent) {
        Scene.setMouse(e.clientX / view.clientWidth * 2 - 1, e.clientY / view.clientHeight * 2 - 1);
        if (diKartu(e) || terkunci()) return;
        setZona(zonaDari(e.clientX, e.clientY));
    }

    function tekan(e: PointerEvent) {
        if (diKartu(e)) return;
        reset();
        setZona(zonaDari(e.clientX, e.clientY));
    }

    function tombol(e: KeyboardEvent) {
        if (!aktif) return;
        if (e.key === 'Escape') { reset(); setZona(null); return; }
        // Tanpa mouse: panah atas = Owner, kiri = Petugas, kanan = Admin.
        const role = ({ ArrowUp: 'owner', ArrowLeft: 'petugas', ArrowRight: 'admin' } as const)[e.key as string];
        if (role && !terkunci()) {
            setZona(role);
            setTimeout(() => form[role]?.querySelector('input')?.focus(), 60);
        }
    }

    // Embun di kaca bereaksi lembut terhadap kursor.
    function miring(e: PointerEvent) {
        const card = e.currentTarget as HTMLElement;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
        card.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
        card.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
    }

    function lurus(e: PointerEvent) {
        const card = e.currentTarget as HTMLElement;
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
    }

    // Kirim login. Kalau akunnya benar tapi pintunya salah, tolak dan beri tahu pintu yang benar.
    async function login(e: SubmitEvent, role: Role) {
        e.preventDefault();
        const f = e.currentTarget as HTMLFormElement;
        if (!f.reportValidity()) return;
        const data = new FormData(f);
        error = {};
        mengirim = true;
        try {
            const res = await api.post<{ user: User }>('/auth/login', {
                username: String(data.get('username')).trim(),
                password: data.get('password')
            });
            if (res.user.role !== role) {
                const p = PINTU.find(x => x.role === res.user.role);
                throw new Error(`Akun ini terdaftar sebagai ${p?.label ?? res.user.role}. Silakan arahkan kursor ke ${p?.posisi ?? ''}.`);
            }
            reset();
            setZona(null);
            simpanUser(res.user);
        } catch (err) {
            error = { [role]: (err as Error).message };
        } finally {
            mengirim = false;
        }
    }
</script>

<svelte:document onkeydown={tombol} />

<div class="landing" class:no-webgl={tanpaWebgl} hidden={!aktif} data-zona={zona ?? ''} role="presentation"
    bind:this={view} onpointermove={gerak} onpointerdown={tekan}>
    <canvas id="scene" aria-hidden="true" bind:this={canvas}></canvas>
    <div class="landing-vignette"></div>

    <div class="landing-hero">
        <p class="eyebrow">Sistem Manajemen Parkir</p>
        <h1>Parkir<br><span>Bebas</span></h1>
        <p class="landing-hint">Arahkan kursor ke ujung layar untuk masuk</p>
    </div>

    <div id="portals">
        {#each PINTU as p (p.role)}
            <section class="portal portal-{p.role}" class:aktif={zona === p.role} data-role={p.role}>
                <span class="embun-tepi" aria-hidden="true"></span>
                <span class="portal-embun" aria-hidden="true"></span>
                <span class="portal-glow" aria-hidden="true"></span>
                <form class="portal-card" autocomplete="on" novalidate bind:this={form[p.role]}
                    onpointermove={miring} onpointerleave={lurus} onsubmit={e => login(e, p.role)}>
                    <p class="embun-role">{p.label}</p>
                    <label><span>Username</span><input name="username" placeholder="ketik username..." autocomplete="username" required></label>
                    <label><span>Password</span><input name="password" type="password" placeholder="ketik password..." autocomplete="current-password" required></label>
                    {#if error[p.role]}<p class="form-error">{error[p.role]}</p>{/if}
                    <button class="embun-submit" type="submit" disabled={mengirim}>Masuk {p.label} →</button>
                </form>
            </section>
        {/each}
    </div>
</div>

// ========================================================
// LATAR 3D LANDING PAGE (WebGL Murni — Kawasan Gedung & Parkir Hidup 3D)
// Menampilkan:
// 1. Gedung-gedung pencakar langit & lobi di sekeliling area parkir (Utara, Selatan, Barat, Timur)
// 2. Mobil (Sedan/SUV) yang pintunya terbuka saat parkir + pengemudi keluar berjalan ke gedung
// 3. Orang-orang bersepeda (roda berputar + kaki mengayuh pedal) di jalur sepeda
// 4. Petugas parkir di pos gerbang (melambaikan tongkat lalin bercahaya) & petugas patroli
// 5. Pejalan kaki di trotoar sekitar gedung dan area parkir
// ========================================================

// Cara kerja singkat: semua benda digambar sebagai garis dan titik lewat WebGL.
// Tiap frame: update() menggerakkan benda, gambar() menampilkannya ke canvas.
type Garis = number[];       // satu garis: x0,y0,z0,x1,y1,z1
type Warna = number[];       // RGB 0 sampai 1
type Titik = [number, number, number];
type Zona = 'none' | 'owner' | 'petugas' | 'admin';
type Benda = Record<string, any>;   // kendaraan, orang, dan sepeda: bentuknya beda-beda tiap jenis
interface Slot { x: number; sg: number; isi: boolean; idx: number; }

export const Scene = (() => {
    // Warna aksen tiap zona (RGB 0 sampai 1). none = kursor di tengah.
    const WARNA: Record<Zona, Warna> = {
        none: [0.34, 0.62, 1.00],
        owner: [0.70, 0.56, 1.00],
        petugas: [0.20, 0.88, 0.98],
        admin: [0.42, 0.70, 1.00]
    };

    // Posisi kamera tiap zona. yaw = putar kiri-kanan, pitch = sudut dari atas,
    // dist = jarak, tx/tz = titik yang dilihat.
    const KAMERA: Record<Zona, { yaw: number; pitch: number; dist: number; tx: number; tz: number }> = {
        none: { yaw: 0.20, pitch: 0.44, dist: 33, tx: 0, tz: -1 },
        owner: { yaw: 0, pitch: 1.02, dist: 46, tx: 0, tz: -6 },
        petugas: { yaw: -0.52, pitch: 0.34, dist: 21, tx: -23, tz: 1 },
        admin: { yaw: 0.58, pitch: 0.42, dist: 26, tx: 4, tz: -3 }
    };

    // Ukuran area parkir: lebar slot, panjang slot, setengah lebar jalan, jumlah slot per baris.
    const SLOT_W = 2.8, SLOT_D = 5.5, LANE = 3.2, N_SLOT = 14;
    const X0 = -N_SLOT * SLOT_W / 2;
    const X1 = X0 + N_SLOT * SLOT_W;
    const GERBANG = [-26, 26];
    const LAJU = 7.5;

    // gl = konteks WebGL, prog = program shader, u = lokasi variabel shader.
    let gl: WebGLRenderingContext, canvas: HTMLCanvasElement, prog: WebGLProgram;
    const u: Record<string, any> = {};
    let bufDots: WebGLBuffer, bufStatis: WebGLBuffer, bufDinamis: WebGLBuffer, nDots = 0, nStatis = 0;
    let running = false, last = 0, waktu = 0, spawnTimer = 0;
    let zona: Zona = 'none';
    const mouse = { x: 0, y: 0 };
    const cam = { ...KAMERA.none, warna: [...WARNA.none] };
    const palang = GERBANG.map(() => 0);
    const slots: Slot[] = [];
    const kendaraan: Benda[] = [];
    const warga: Benda[] = [];       // pejalan kaki & pengemudi yang keluar dari mobil
    const pesepeda: Benda[] = [];    // orang yang bersepeda
    const petugas: Benda[] = [];     // petugas gerbang & petugas patroli
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Matriks (column-major) ----------
    // Matriks perspektif: benda jauh terlihat lebih kecil.
    function perspective(fov: number, asp: number, n: number, f: number) {
        const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f);
        return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0];
    }

    // Matriks kamera: e = posisi mata, c = titik yang dilihat.
    function lookAt(e: number[], c: number[]) {
        let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
        let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
        let xx = zz, xy = 0, xz = -zx;
        l = Math.hypot(xx, xz); xx /= l; xz /= l;
        const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
        return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
            -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
    }

    // Perkalian dua matriks 4x4.
    function kali(a: ArrayLike<number>, b: ArrayLike<number>) {
        const o = new Float32Array(16);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
            let s = 0;
            for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
            o[i * 4 + j] = s;
        }
        return o;
    }

    // ---------- Geometri Dasar ----------
    // Tambah 12 garis rusuk sebuah kotak ke daftar s.
    function kotak(s: Garis[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
        const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
        [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
            .forEach(([a, b]) => s.push([...p[a], ...p[b]]));
    }

    // Tambah garis kabin mobil (atas lebih sempit dari bawah).
    function kabin(s: Garis[], bx0: number, bx1: number, tx0: number, tx1: number, y0: number, y1: number, w: number) {
        const p = [[bx0, y0, -w], [bx1, y0, -w], [bx1, y0, w], [bx0, y0, w], [tx0, y1, -w * .82], [tx1, y1, -w * .82], [tx1, y1, w * .82], [tx0, y1, w * .82]];
        [[4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
            .forEach(([a, b]) => s.push([...p[a], ...p[b]]));
    }

    // Tambah roda berbentuk segi delapan.
    function roda(s: Garis[], cx: number, cy: number, cz: number, r: number) {
        for (let i = 0; i < 10; i++) {
            const a = i / 10 * Math.PI * 2, b = (i + 1) / 10 * Math.PI * 2;
            s.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz, cx + Math.cos(b) * r, cy + Math.sin(b) * r, cz]);
        }
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * Math.PI * 2;
            s.push([cx, cy, cz, cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, cz]);
        }
    }

    // 1. Sedan 3D
    const MOBIL: Garis[] = [];
    kotak(MOBIL, -2.15, 2.15, 0.32, 0.96, -0.92, 0.92);
    kotak(MOBIL, -1.95, 1.95, 0.45, 0.88, -0.82, 0.82);
    kabin(MOBIL, -1.25, 0.85, -0.85, 0.35, 0.96, 1.58, 0.86);
    MOBIL.push(
        [2.15, 0.52, -0.78, 2.15, 0.52, 0.78],
        [2.15, 0.74, -0.68, 2.15, 0.74, 0.68],
        [-2.15, 0.76, -0.78, -2.15, 0.76, 0.78],
        [0.85, 0.96, -0.86, 2.15, 0.82, -0.86],
        [0.85, 0.96, 0.86, 2.15, 0.82, 0.86]
    );
    [[-1.32, -0.96], [-1.32, 0.96], [1.32, -0.96], [1.32, 0.96]].forEach(([x, z]) => roda(MOBIL, x, 0.38, z, 0.38));

    // 2. SUV 3D
    const SUV: Garis[] = [];
    kotak(SUV, -2.25, 2.20, 0.36, 1.08, -0.98, 0.98);
    kabin(SUV, -1.85, 0.95, -1.55, 0.42, 1.08, 1.82, 0.92);
    SUV.push(
        [-1.45, 1.88, -0.68, 0.32, 1.88, -0.68],
        [-1.45, 1.88, 0.68, 0.32, 1.88, 0.68],
        [2.20, 0.62, -0.82, 2.20, 0.62, 0.82],
        [2.20, 0.84, -0.82, 2.20, 0.84, 0.82]
    );
    [[-1.38, -1.0], [-1.38, 1.0], [1.38, -1.0], [1.38, 1.0]].forEach(([x, z]) => roda(SUV, x, 0.42, z, 0.42));

    // 3. Motor 3D
    const MOTOR: Garis[] = [];
    roda(MOTOR, -0.78, 0.34, 0, 0.34);
    roda(MOTOR, 0.78, 0.34, 0, 0.34);
    MOTOR.push(
        [-0.78, 0.34, 0, -0.1, 0.84, 0], [-0.1, 0.84, 0, 0.55, 0.78, 0], [0.55, 0.78, 0, 0.78, 0.34, 0],
        [-0.1, 0.84, 0, 0.28, 0.34, 0], [0.55, 0.78, 0, 0.62, 1.18, 0], [0.62, 1.18, -0.38, 0.62, 1.18, 0.38],
        [-0.65, 0.88, 0, 0.12, 0.92, 0]
    );

    // Pilih bentuk kendaraan secara acak.
    const pilihModel = () => {
        const r = Math.random();
        if (r < 0.20) return MOTOR;
        if (r < 0.58) return MOBIL;
        return SUV;
    };

    // ---------- Helper Gambar Gedung 3D di Sekeliling ----------
    // Tambah satu garis: titik a ke titik b dengan warna c.
    function garis(arr: number[], a: number[], b: number[], c: Warna) { arr.push(...a, ...c, ...b, ...c); }

    // Gambar gedung: garis lantai, kolom kaca, dan atap.
    function buatGedung(L: number[], x0: number, x1: number, z0: number, z1: number, tinggi: number, lantaiStep: number, cUtama: Warna, cDalam: Warna, punyaMenara = false) {
        const g: Garis[] = [];
        kotak(g, x0, x1, 0, tinggi, z0, z1);
        g.forEach(s => garis(L, s.slice(0, 3), s.slice(3), cUtama));

        // Garis lantai bertingkat (slab tiap lantai)
        for (let y = lantaiStep; y < tinggi; y += lantaiStep) {
            garis(L, [x0, y, z0], [x1, y, z0], cDalam);
            garis(L, [x1, y, z0], [x1, y, z1], cDalam);
            garis(L, [x1, y, z1], [x0, y, z1], cDalam);
            garis(L, [x0, y, z1], [x0, y, z0], cDalam);
        }

        // Kolom fasad vertikal kaca gedung
        const lebarX = x1 - x0, lebarZ = z1 - z0;
        const nKolX = Math.max(2, Math.floor(lebarX / 2.6));
        for (let i = 1; i < nKolX; i++) {
            const x = x0 + (lebarX * i) / nKolX;
            garis(L, [x, 0, z0], [x, tinggi, z0], cDalam);
            garis(L, [x, 0, z1], [x, tinggi, z1], cDalam);
        }
        const nKolZ = Math.max(2, Math.floor(lebarZ / 2.6));
        for (let i = 1; i < nKolZ; i++) {
            const z = z0 + (lebarZ * i) / nKolZ;
            garis(L, [x0, 0, z], [x0, tinggi, z], cDalam);
            garis(L, [x1, 0, z], [x1, tinggi, z], cDalam);
        }

        // Mahkota atap (rooftop crown) + menara antena
        const m = 0.7;
        if (lebarX > 3 && lebarZ > 3) {
            const crown: Garis[] = [];
            kotak(crown, x0 + m, x1 - m, tinggi, tinggi + 1.4, z0 + m, z1 - m);
            crown.forEach(s => garis(L, s.slice(0, 3), s.slice(3), cUtama));
            if (punyaMenara) {
                const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
                garis(L, [cx, tinggi + 1.4, cz], [cx, tinggi + 5.2, cz], cUtama);
                garis(L, [cx - 0.8, tinggi + 2.8, cz], [cx + 0.8, tinggi + 2.8, cz], cDalam);
                garis(L, [cx, tinggi + 2.8, cz - 0.8], [cx, tinggi + 2.8, cz + 0.8], cDalam);
            }
        }
    }

    // ---------- Buffer Statis: Kompleks Parkir + Gedung Sekeliling + Trotoar ----------
    // Bangun semua benda yang tidak bergerak. Cukup sekali, lalu disimpan ke memori GPU supaya ringan.
    function bangunStatis() {
        const dots = [];
        for (let x = -72; x <= 72; x += 1.6) for (let z = -52; z <= 46; z += 1.6) {
            dots.push(x, -0.06, z, 1, 1, 1, 0.55);
        }
        for (let i = 0; i < 380; i++) {
            const px = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 110 - 55;
            const pz = (Math.sin(i * 78.233) * 29183.1234 % 1) * 76 - 38;
            const py = 0.8 + Math.abs(Math.sin(i * 45.164)) * 15.0;
            dots.push(px, py, pz, 1, 1, 1, 0.45);
        }

        const L: number[] = [];
        const terang = [0.48, 0.78, 1.0, 0.90];
        const marka = [0.35, 0.62, 1.0, 0.72];
        const struktur = [0.30, 0.58, 1.0, 0.44];
        const gedungUtama = [0.32, 0.62, 1.0, 0.50];
        const gedungDalam = [0.25, 0.50, 0.92, 0.22];
        const redup = [0.28, 0.52, 0.95, 0.25];
        const sangatRedup = [0.22, 0.44, 0.88, 0.14];

        // =====================================================
        // 1. GEDUNG-GEDUNG 3D DI SEKELILING KAWASAN PARKIR
        // =====================================================
        // A. Kawasan Gedung Utara (Belakang Parkir — Menara Kembar + Lobi Utama + Skybridge)
        buatGedung(L, -36, -24, -27, -16, 18.5, 2.3, gedungUtama, gedungDalam, true);
        buatGedung(L, -22, -8, -26, -15, 13.8, 2.3, gedungUtama, gedungDalam, false);
        // Gedung Lobby Utama Tengah (tempat orang keluar-masuk gedung)
        buatGedung(L, -6, 6, -25, -14.5, 10.5, 2.1, terang, struktur, true);
        // Kanopi Teras Lobi Utama & Pintu Kaca Gedung Tengah
        const lobi: Garis[] = [];
        kotak(lobi, -4.2, 4.2, 0, 3.6, -14.5, -12.2);
        lobi.forEach(s => garis(L, s.slice(0, 3), s.slice(3), terang));
        buatGedung(L, 8, 22, -26, -15, 15.5, 2.2, gedungUtama, gedungDalam, false);
        buatGedung(L, 24, 36, -27, -16, 20.5, 2.3, gedungUtama, gedungDalam, true);
        // Skybridge (Jembatan Udara Antar Gedung Utara di y = 9.2..11.0)
        const sb1: Garis[] = [];
        kotak(sb1, -24, -22, 9.2, 11.0, -22, -19);
        kotak(sb1, -8, -6, 6.8, 8.4, -21, -18.5);
        kotak(sb1, 6, 8, 6.8, 8.4, -21, -18.5);
        kotak(sb1, 22, 24, 9.2, 11.0, -22, -19);
        sb1.forEach(s => garis(L, s.slice(0, 3), s.slice(3), struktur));

        // B. Kawasan Gedung Sayap Barat (Kiri Gerbang Masuk)
        buatGedung(L, -48, -35, -19, -7, 14.0, 2.3, gedungUtama, gedungDalam, true);
        buatGedung(L, -48, -36, 7, 19, 11.5, 2.3, gedungUtama, gedungDalam, false);

        // C. Kawasan Gedung Sayap Timur (Kanan Gerbang Keluar)
        buatGedung(L, 35, 48, -19, -7, 16.0, 2.3, gedungUtama, gedungDalam, true);
        buatGedung(L, 36, 48, 7, 19, 12.5, 2.3, gedungUtama, gedungDalam, false);

        // D. Kawasan Gedung Selatan / Depan (Bangunan Rendah & Plaza Sepeda, supaya tidak menghalangi kamera)
        buatGedung(L, -34, -20, 15.5, 23, 6.6, 2.2, struktur, gedungDalam, false);
        buatGedung(L, 20, 34, 15.5, 23, 6.6, 2.2, struktur, gedungDalam, false);

        // =====================================================
        // 2. TROTOAR PEJALAN KAKI, ZEBRA CROSS, & JALUR SEPEDA
        // =====================================================
        // Trotoar depan deretan gedung utara (z = -14.5 .. -10.5)
        garis(L, [-38, 0.04, -10.8], [38, 0.04, -10.8], marka);
        garis(L, [-38, 0.04, -14.2], [38, 0.04, -14.2], struktur);
        for (let x = -36; x <= 36; x += 3) {
            garis(L, [x, 0.03, -14.2], [x, 0.03, -10.8], sangatRedup);
        }
        // Jalur Khusus Sepeda (Bike Lane) di Selatan (z = 11.2 .. 13.4)
        garis(L, [-48, 0.04, 11.2], [48, 0.04, 11.2], marka);
        garis(L, [-48, 0.04, 13.4], [48, 0.04, 13.4], marka);
        for (let x = -46; x < 46; x += 3.2) {
            garis(L, [x, 0.04, 12.3], [x + 1.6, 0.04, 12.3], redup);
        }

        // =====================================================
        // 3. SLOT PARKIR, KANOPI ATAP 3D, & POS PETUGAS GERBANG
        // =====================================================
        for (const sg of [-1, 1]) {
            const zDalam = sg * LANE, zLuar = sg * (LANE + SLOT_D);
            const zPilar = sg * (LANE + SLOT_D + 0.7);
            const yAtap = 4.5, yPuncak = 5.2;

            for (let i = 0; i <= N_SLOT; i++) {
                const x = X0 + i * SLOT_W;
                garis(L, [x, 0, zDalam + sg * 0.35], [x, 0, zLuar], marka);
                garis(L, [x, 0.08, zDalam + sg * 0.55], [x, 0.08, zLuar], redup);

                if (i < N_SLOT) {
                    const xm = x + SLOT_W / 2;
                    garis(L, [xm - 0.85, 0.05, zLuar - sg * 0.6], [xm + 0.85, 0.05, zLuar - sg * 0.6], terang);
                }

                if (i % 2 === 0) {
                    const pBox: Garis[] = [];
                    kotak(pBox, x - 0.13, x + 0.13, 0, yAtap, zPilar - 0.13, zPilar + 0.13);
                    pBox.forEach(s => garis(L, s.slice(0, 3), s.slice(3), struktur));
                    garis(L, [x, yAtap, zPilar], [x, yPuncak, zDalam + sg * 0.4], struktur);
                    garis(L, [x, yAtap - 0.5, zPilar], [x, yPuncak, zDalam + sg * 0.4], redup);
                }
            }

            garis(L, [X0, yAtap, zPilar], [X1, yAtap, zPilar], struktur);
            garis(L, [X0, yPuncak, zDalam + sg * 0.4], [X1, yPuncak, zDalam + sg * 0.4], marka);
            garis(L, [X0, 0, zLuar], [X1, 0, zLuar], terang);
            garis(L, [-54, 0, zDalam], [X0, 0, zDalam], marka);
            garis(L, [X1, 0, zDalam], [54, 0, zDalam], marka);
        }

        // Gerbang Gantry Pintar + Pos Jaga Petugas 3D (Guard Booth)
        GERBANG.forEach((gx, idx) => {
            const gBox: Garis[] = [];
            kotak(gBox, gx - 0.35, gx + 0.35, 0, 4.4, -LANE - 0.9, -LANE - 0.2);
            kotak(gBox, gx - 0.35, gx + 0.35, 0, 4.4, LANE + 0.2, LANE + 0.9);
            kotak(gBox, gx - 0.45, gx + 0.45, 3.6, 4.4, -LANE - 0.9, LANE + 0.9);
            kotak(gBox, gx - 0.28, gx + 0.28, 0, 1.35, -LANE - 0.65, -LANE - 0.1);
            // Pos Jaga Petugas 3D (kabin kaca + atap miring di samping gerbang)
            const bx = gx + (idx === 0 ? -2.2 : 2.2);
            kotak(gBox, bx - 0.9, bx + 0.9, 0, 2.3, -LANE - 2.6, -LANE - 0.9);
            kotak(gBox, bx - 1.05, bx + 1.05, 2.3, 2.55, -LANE - 2.75, -LANE - 0.75);
            // Meja monitor hologram di dalam pos petugas
            kotak(gBox, bx - 0.55, bx + 0.55, 0.9, 1.35, -LANE - 1.35, -LANE - 1.05);
            gBox.forEach(s => garis(L, s.slice(0, 3), s.slice(3), marka));
        });

        // Marka jalan tengah & panah
        for (let x = -50; x < 50; x += 2.8) garis(L, [x, 0, 0], [x + 1.4, 0, 0], struktur);
        for (const ax of [-36, -16, 0, 16, 36]) {
            garis(L, [ax - 0.6, 0.02, -0.85], [ax + 0.9, 0.02, 0], terang);
            garis(L, [ax - 0.6, 0.02, 0.85], [ax + 0.9, 0.02, 0], terang);
        }

        nDots = dots.length / 7;
        nStatis = L.length / 7;
        gl.bindBuffer(gl.ARRAY_BUFFER, bufDots);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dots), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufStatis);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(L), gl.STATIC_DRAW);
    }

    // ---------- Simulasi Kendaraan, Orang Keluar Mobil, Pesepeda, & Petugas ----------
    // Posisi z tengah slot. s.sg = -1 baris utara, +1 baris selatan.
    const zSlot = (s: Slot) => s.sg * (LANE + SLOT_D / 2);

    // Pilih slot kosong acak, lalu buat kendaraan beserta rute ke slot itu.
    function buatKendaraanMasuk(xMulai = -50) {
        const kosong = slots.filter(s => !s.isi);
        if (!kosong.length) return;
        const s = kosong[Math.floor(Math.random() * kosong.length)];
        s.isi = true;
        const zc = zSlot(s), sg = s.sg;
        const xStart = Math.min(xMulai, s.x - 6);
        kendaraan.push({
            jenis: pilihModel(),
            x: xStart, z: 0, h: 0, hTarget: 0, slot: s, fase: 'masuk', tunggu: 0,
            pintu: 0, sudahTurun: false,
            path: [
                { x: xStart, z: 0 },
                { x: s.x - 5, z: 0 },
                { x: s.x - 2.2, z: sg * 0.8 },
                { x: s.x - 0.5, z: sg * 2.6 },
                { x: s.x, z: sg * (LANE + 0.6) },
                { x: s.x, z: zc }
            ],
            i: 0
        });
    }

    // Spawn pengemudi yang baru keluar dari pintu mobil lalu jalan kaki ke lobi gedung
    function spawnOrangKeluarMobil(v: Benda) {
        const cs = Math.cos(v.h), sn = Math.sin(v.h);
        // Posisi tepat di samping pintu kiri mobil
        const ox = v.x - 1.15 * sn;
        const oz = v.z + 1.15 * cs;
        const zTrotoar = v.z < 0 ? -12.4 : 10.2;
        const xLobi = v.z < 0 ? (Math.random() * 6 - 3) : (v.x + (Math.random() * 14 - 7));
        warga.push({
            x: ox, z: oz, h: 0, fase: Math.random() * 6, laju: 2.3,
            path: [
                { x: ox, z: oz },
                { x: ox, z: zTrotoar },
                { x: xLobi, z: zTrotoar },
                { x: xLobi, z: v.z < 0 ? -14.2 : 12.0 }
            ],
            i: 0, sementara: true
        });
    }

    // Isi awal saat scene dibuka: kendaraan, petugas, pesepeda, dan pejalan kaki.
    function isiAwal() {
        slots.length = 0;
        kendaraan.length = 0;
        warga.length = 0;
        pesepeda.length = 0;
        petugas.length = 0;

        for (const sg of [-1, 1]) for (let i = 0; i < N_SLOT; i++) {
            slots.push({ x: X0 + SLOT_W * (i + 0.5), sg, isi: false, idx: slots.length });
        }

        // 1. Kendaraan terparkir (sebagian baru saja parkir dengan pintu terbuka & orang keluar!)
        slots.forEach((s, idx) => {
            if ((idx * 7 + 3) % 11 < 6) {
                s.isi = true;
                const baruParkir = idx === 4 || idx === 11 || idx === 20;
                const v = {
                    jenis: baruParkir ? MOBIL : pilihModel(),
                    x: s.x, z: zSlot(s), h: s.sg * Math.PI / 2,
                    diam: !baruParkir,
                    fase: baruParkir ? 'parkir' : 'diam',
                    tunggu: baruParkir ? 5.5 : 0,
                    pintu: baruParkir ? 0.85 : 0,
                    sudahTurun: false,
                    slot: s
                };
                kendaraan.push(v);
                if (baruParkir) {
                    v.sudahTurun = true;
                    spawnOrangKeluarMobil(v);
                }
            }
        });

        // 2. Tiga kendaraan sedang melaju masuk
        buatKendaraanMasuk(-28);
        buatKendaraanMasuk(-10);
        buatKendaraanMasuk(-40);

        // 3. Petugas Parkir (2 di pos gerbang masuk/keluar + 2 patroli di koridor slot)
        petugas.push(
            { tipe: 'pos', x: GERBANG[0] - 1.1, z: -LANE - 0.65, h: 0.35, fase: 0 },
            { tipe: 'pos', x: GERBANG[1] + 1.1, z: -LANE - 0.65, h: -0.35, fase: 1.5 },
            { tipe: 'patroli', x: -12, z: -LANE - 5.9, minX: -18, maxX: 18, arah: 1, h: 0, fase: 0 },
            { tipe: 'patroli', x: 8, z: LANE + 5.9, minX: -18, maxX: 18, arah: -1, h: Math.PI, fase: 2.1 }
        );

        // 4. Orang Bersepeda (4 pesepeda mengayuh di jalur sepeda & tepi kawasan)
        for (let i = 0; i < 4; i++) {
            const arah = i % 2 === 0 ? 1 : -1;
            pesepeda.push({
                x: -36 + i * 22,
                z: arah > 0 ? 12.0 : 12.8,
                arah,
                h: arah > 0 ? 0 : Math.PI,
                laju: 4.8 + (i % 2) * 0.9,
                kayuh: i * 1.7
            });
        }

        // 5. Pejalan Kaki Mondar-Mandir di Trotoar Depan Gedung & Lobi
        for (let i = 0; i < 6; i++) {
            const arah = i % 2 === 0 ? 1 : -1;
            warga.push({
                x: -28 + i * 11,
                z: -11.6 - (i % 3) * 0.7,
                arah,
                h: arah > 0 ? 0 : Math.PI,
                laju: 1.9 + (i % 3) * 0.3,
                fase: i * 1.3,
                sementara: false
            });
        }
    }

    // Selisih sudut terpendek, supaya kendaraan belok lewat arah terdekat.
    function selisihSudut(a: number, b: number) {
        let d = a - b;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return d;
    }

    // Gerakkan v mengikuti titik rute (v.path). Hasilnya true kalau sudah sampai titik terakhir.
    function jalan(v: Benda, dt: number) {
        let sisa = (v.laju || LAJU) * dt * (v.mundur ? 0.5 : 1);
        while (sisa > 0 && v.i < v.path.length - 1) {
            const b = v.path[v.i + 1];
            const dx = b.x - v.x, dz = b.z - v.z, d = Math.hypot(dx, dz);
            v.mundur = !!b.mundur;
            if (d > 0.001) v.hTarget = Math.atan2(dz, dx) + (b.mundur ? Math.PI : 0);
            if (d <= sisa) { v.x = b.x; v.z = b.z; v.i++; sisa -= d; }
            else { v.x += dx / d * sisa; v.z += dz / d * sisa; sisa = 0; }
        }
        if (v.hTarget !== undefined) v.h += selisihSudut(v.hTarget, v.h) * Math.min(1, dt * 6);
        return v.i >= v.path.length - 1;
    }

    // Perbarui posisi semua benda. dt = detik sejak frame sebelumnya, supaya kecepatan sama di semua komputer.
    function update(dt: number) {
        spawnTimer -= dt;
        const bergerak = kendaraan.filter(v => !v.diam);
        if (spawnTimer <= 0 && bergerak.length < 4) {
            buatKendaraanMasuk(-52);
            spawnTimer = 2.0 + Math.random() * 2.0;
        }

        // Update Kendaraan + Animasi Pintu Mobil Terbuka & Orang Keluar Mobil
        for (let n = kendaraan.length - 1; n >= 0; n--) {
            const v = kendaraan[n];
            if (v.diam) continue;
            if (v.fase === 'masuk' && jalan(v, dt)) {
                v.fase = 'parkir';
                v.tunggu = 5.5 + Math.random() * 4.0;
                v.pintu = 0;
                v.sudahTurun = false;
            } else if (v.fase === 'parkir') {
                v.tunggu -= dt;
                // Buka pintu saat baru parkir & keluarkan pengemudi!
                if (v.tunggu > 1.8 && v.jenis !== MOTOR) {
                    v.pintu = Math.min(0.92, (v.pintu || 0) + dt * 2.2);
                    if (v.pintu > 0.65 && !v.sudahTurun) {
                        v.sudahTurun = true;
                        spawnOrangKeluarMobil(v);
                    }
                } else {
                    v.pintu = Math.max(0, (v.pintu || 0) - dt * 2.5);
                }
                if (v.tunggu <= 0) {
                    const s = v.slot;
                    v.pintu = 0;
                    v.fase = 'keluar';
                    v.i = 0;
                    v.path = [{ x: v.x, z: v.z }, { x: s.x, z: s.sg * 1.2, mundur: true }, { x: s.x + 3.5, z: 0 }, { x: 54, z: 0 }];
                }
            } else if (v.fase === 'keluar') {
                if (v.i >= 1 && v.slot) { v.slot.isi = false; v.slot = null; }
                if (jalan(v, dt)) kendaraan.splice(n, 1);
            }
        }

        // Update Pejalan Kaki & Pengemudi yang Keluar dari Mobil
        for (let i = warga.length - 1; i >= 0; i--) {
            const w = warga[i];
            w.fase += dt * 7.5;
            if (w.sementara) {
                if (jalan(w, dt)) warga.splice(i, 1);
            } else {
                w.x += w.arah * w.laju * dt;
                if (w.x > 34) { w.arah = -1; w.h = Math.PI; }
                if (w.x < -34) { w.arah = 1; w.h = 0; }
            }
        }

        // Update Pesepeda
        pesepeda.forEach(sp => {
            sp.x += sp.arah * sp.laju * dt;
            sp.kayuh += dt * 9.5;
            if (sp.x > 46) sp.x = -46;
            if (sp.x < -46) sp.x = 46;
        });

        // Update Petugas Patroli
        petugas.forEach(pt => {
            pt.fase += dt * 6.0;
            if (pt.tipe === 'patroli') {
                pt.x += pt.arah * 1.45 * dt;
                if (pt.x > pt.maxX) { pt.arah = -1; pt.h = Math.PI; }
                if (pt.x < pt.minX) { pt.arah = 1; pt.h = 0; }
            }
        });

        // Palang gerbang
        GERBANG.forEach((gx, k) => {
            const dekat = kendaraan.some(v => !v.diam && Math.abs(v.x - gx) < 7 && Math.abs(v.z) < LANE);
            const target = dekat ? 1.38 : 0;
            palang[k] += (target - palang[k]) * Math.min(1, dt * 4.5);
        });

        // Kamera
        const t = KAMERA[zona];
        const k = 1 - Math.exp(-dt * 2.6);
        const driftYaw = zona === 'none' && !reduce ? Math.sin(waktu * 0.16) * 0.26 : 0;
        const driftPitch = zona === 'none' && !reduce ? Math.cos(waktu * 0.11) * 0.04 : 0;
        cam.yaw += (t.yaw + driftYaw + mouse.x * 0.14 - cam.yaw) * k;
        cam.pitch += (t.pitch + driftPitch - mouse.y * 0.07 - cam.pitch) * k;
        cam.dist += (t.dist - cam.dist) * k;
        cam.tx += (t.tx - cam.tx) * k;
        cam.tz += (t.tz - cam.tz) * k;
        cam.warna = cam.warna.map((c, i) => c + (WARNA[zona][i] - c) * k);
    }

    // ---------- Gambar Karakter 3D (Orang, Petugas, & Pesepeda) ----------
    let dinamis = new Float32Array(90000);

    // Susun garis benda yang bergerak. Dijalankan tiap frame.
    function bangunDinamis() {
        let n = 0;
        const tulis = (x: number, y: number, z: number, c: Warna) => {
            if (n + 7 > dinamis.length) {
                const baru = new Float32Array(dinamis.length * 2);
                baru.set(dinamis);
                dinamis = baru;
            }
            dinamis[n++] = x; dinamis[n++] = y; dinamis[n++] = z;
            dinamis[n++] = c[0]; dinamis[n++] = c[1]; dinamis[n++] = c[2]; dinamis[n++] = c[3];
        };

        const aksen = [...cam.warna, 0.95];
        const aksenTerang = [Math.min(1, cam.warna[0] + 0.38), Math.min(1, cam.warna[1] + 0.38), 1.0, 0.95];
        const aksenLembut = [...cam.warna, 0.42];
        const parkir = [0.42, 0.68, 1.0, 0.56];
        const parkirScan = [...cam.warna, 0.78];
        const warnaWarga = [0.55, 0.88, 1.0, 0.88];
        const warnaPetugas = [0.20, 0.98, 0.85, 0.95];
        const warnaTongkat = [1.0, 0.48, 0.65, 1.0];
        const warnaSepeda = [0.35, 0.95, 0.90, 0.92];

        // Helper gambar manusia 3D (kepala, badan, ayunan kaki & tangan, topi petugas + tongkat lalin)
        function gambarManusia3D(ox: number, oz: number, arah: number, fase: number, col: Warna, adalahPetugas = false, lambaikan = false) {
            const cs = Math.cos(arah), sn = Math.sin(arah);
            const tr = (lx: number, ly: number, lz: number): Titik => [ox + lx * cs - lz * sn, ly, oz + lx * sn + lz * cs];
            const seg = (a: Titik, b: Titik, c = col) => { tulis(...tr(...a), c); tulis(...tr(...b), c); };

            const ayun = Math.sin(fase) * 0.28;
            // Kaki kiri & kanan
            seg([0, 0.78, -0.14], [ayun, 0.04, -0.14]);
            seg([0, 0.78, 0.14], [-ayun, 0.04, 0.14]);
            // Pinggul & Torso 3D
            seg([0, 0.78, -0.16], [0, 0.78, 0.16]);
            seg([0, 1.38, -0.22], [0, 1.38, 0.22]);
            seg([0, 0.78, -0.16], [0, 1.38, -0.22]);
            seg([0, 0.78, 0.16], [0, 1.38, 0.22]);
            seg([0, 0.78, 0], [0, 1.44, 0]);
            // Kepala Berlian / Oktagon 3D
            const rK = 0.16, yK = 1.60;
            seg([0, yK - rK, 0], [rK, yK, 0]);
            seg([rK, yK, 0], [0, yK + rK, 0]);
            seg([0, yK + rK, 0], [-rK, yK, 0]);
            seg([-rK, yK, 0], [0, yK - rK, 0]);
            seg([0, yK, -rK], [0, yK + rK, 0]);
            seg([0, yK, rK], [0, yK + rK, 0]);

            // Lengan kiri
            seg([0, 1.36, -0.22], [-ayun * 0.9, 0.90, -0.28]);
            // Lengan kanan (kalau petugas: angkat & lambaikan tongkat lampu lalin bercahaya!)
            if (adalahPetugas) {
                // Topi pet / visor petugas
                seg([-0.16, 1.72, -0.16], [0.26, 1.72, 0], aksenTerang);
                seg([-0.16, 1.72, 0.16], [0.26, 1.72, 0], aksenTerang);
                const sapa = lambaikan ? Math.sin(waktu * 8) * 0.28 : Math.sin(waktu * 2.5) * 0.12;
                const tx = 0.28, ty = 1.68 + sapa, tz = 0.34;
                seg([0, 1.36, 0.22], [tx, ty, tz]);
                // Tongkat komando lalin menyala (Traffic Baton)
                seg([tx, ty, tz], [tx + 0.22, ty + 0.48, tz + 0.1], warnaTongkat);
                // Cincin aura di kaki petugas
                for (let k = 0; k < 8; k++) {
                    const a1 = k / 8 * Math.PI * 2, a2 = (k + 1) / 8 * Math.PI * 2;
                    tulis(ox + Math.cos(a1) * 0.45, 0.03, oz + Math.sin(a1) * 0.45, col);
                    tulis(ox + Math.cos(a2) * 0.45, 0.03, oz + Math.sin(a2) * 0.45, col);
                }
            } else {
                seg([0, 1.36, 0.22], [ayun * 0.9, 0.90, 0.28]);
            }
        }

        // Helper gambar Orang Bersepeda 3D (Sepeda + Roda Berputar + Pengendara Mengayuh)
        function gambarPesepeda3D(sp: Benda) {
            const cs = Math.cos(sp.h), sn = Math.sin(sp.h);
            const tr = (lx: number, ly: number, lz: number): Titik => [sp.x + lx * cs - lz * sn, ly, sp.z + lx * sn + lz * cs];
            const seg = (a: Titik, b: Titik, c = warnaSepeda) => { tulis(...tr(...a), c); tulis(...tr(...b), c); };

            const r = 0.34;
            // Roda belakang (-0.58) & depan (+0.58) dengan jari-jari berputar
            for (const wx of [-0.58, 0.58]) {
                for (let i = 0; i < 8; i++) {
                    const a1 = i / 8 * Math.PI * 2 + sp.kayuh, a2 = (i + 1) / 8 * Math.PI * 2 + sp.kayuh;
                    seg([wx + Math.cos(a1) * r, r + Math.sin(a1) * r, 0], [wx + Math.cos(a2) * r, r + Math.sin(a2) * r, 0]);
                }
                // Jari-jari roda berputar
                for (let i = 0; i < 2; i++) {
                    const a = sp.kayuh + i * Math.PI / 2;
                    seg([wx - Math.cos(a) * r, r - Math.sin(a) * r, 0], [wx + Math.cos(a) * r, r + Math.sin(a) * r, 0]);
                }
            }
            // Rangka diamond sepeda + stang + sadel
            seg([-0.58, r, 0], [-0.05, r, 0]);           // chainstay
            seg([-0.58, r, 0], [-0.22, 0.82, 0]);        // seatstay
            seg([-0.05, r, 0], [-0.24, 0.88, 0]);        // seattube
            seg([-0.05, r, 0], [0.42, 0.84, 0]);         // downtube
            seg([-0.22, 0.82, 0], [0.42, 0.84, 0]);      // toptube
            seg([0.58, r, 0], [0.38, 1.06, 0]);          // fork + stem
            seg([0.38, 1.06, -0.28], [0.38, 1.06, 0.28], aksenTerang); // stang

            // Tubuh pengendara sepeda (condong ke depan + kaki mengayuh pedal)
            seg([-0.24, 0.90, 0], [0.12, 1.42, 0], aksenTerang); // punggung
            seg([0.12, 1.42, 0], [0.38, 1.06, -0.22], aksenTerang); // lengan kiri ke stang
            seg([0.12, 1.42, 0], [0.38, 1.06, 0.22], aksenTerang);  // lengan kanan ke stang
            // Kepala helm pesepeda
            seg([0.12, 1.44, 0], [0.22, 1.66, 0], aksenTerang);
            seg([0.08, 1.60, 0], [0.30, 1.60, 0], aksenTerang);
            // Kaki kiri & kanan mengayuh memutar pedal
            for (const [off, zOff] of [[0, -0.12], [Math.PI, 0.12]]) {
                const px = -0.05 + Math.cos(sp.kayuh + off) * 0.16;
                const py = r + Math.sin(sp.kayuh + off) * 0.16;
                const kx = -0.10 + Math.cos(sp.kayuh + off + 0.7) * 0.12;
                const ky = 0.64 + Math.sin(sp.kayuh + off + 0.7) * 0.10;
                seg([-0.24, 0.90, zOff], [kx, ky, zOff], warnaWarga);
                seg([kx, ky, zOff], [px, py, zOff], warnaWarga);
            }
            // Jejak angin neon di belakang sepeda
            seg([-0.95, 0.15, 0], [-2.1, 0.15, 0], [0.35, 0.95, 0.90, 0.28]);
        }

        // 1. Gambar semua Pejalan Kaki & Pengemudi yang baru keluar dari mobil
        warga.forEach(w => gambarManusia3D(w.x, w.z, w.h, w.fase, warnaWarga, false, false));

        // 2. Gambar semua Petugas (Pos Gerbang & Patroli)
        petugas.forEach((pt, idx) => {
            const adaMobilDekat = pt.tipe === 'pos' && kendaraan.some(v => !v.diam && Math.abs(v.x - pt.x) < 10);
            gambarManusia3D(pt.x, pt.z, pt.h, pt.tipe === 'patroli' ? pt.fase : 0, warnaPetugas, true, adaMobilDekat);
        });

        // 3. Gambar semua Orang Bersepeda
        pesepeda.forEach(sp => gambarPesepeda3D(sp));

        // 4. Berlian 3D Berputar di Slot Kosong
        slots.forEach(s => {
            if (!s.isi) {
                const sz = zSlot(s);
                const rot = waktu * 1.6 + s.idx * 0.5;
                const bob = 1.15 + Math.sin(waktu * 2.2 + s.idx) * 0.15;
                const r = 0.26;
                const dx = Math.cos(rot) * r, dz = Math.sin(rot) * r;
                const colOk = [0.22, 0.92, 0.78, 0.48];
                const pTop: Titik = [s.x, bob + 0.32, sz], pBot: Titik = [s.x, bob - 0.32, sz];
                const pts: Titik[] = [[s.x + dx, bob, sz + dz], [s.x - dz, bob, sz + dx], [s.x - dx, bob, sz - dz], [s.x + dz, bob, sz - dx]];
                for (let k = 0; k < 4; k++) {
                    const a = pts[k], b = pts[(k + 1) % 4];
                    tulis(...a, colOk); tulis(...b, colOk);
                    tulis(...pTop, colOk); tulis(...a, colOk);
                    tulis(...pBot, colOk); tulis(...a, colOk);
                }
            }
        });

        // 5. Kendaraan + Pintu Mobil Terbuka + Scanner 3D + Pita Jalur
        kendaraan.forEach((v, idx) => {
            const c = v.diam ? parkir : aksen;
            const cs = Math.cos(v.h), sn = Math.sin(v.h);
            const scanY = 0.38 + ((waktu * 0.75 + idx * 0.37) % 1) * 1.25;

            v.jenis.forEach((s: Garis) => {
                const dekatScan = Math.abs(s[1] - scanY) < 0.18 || Math.abs(s[4] - scanY) < 0.18;
                const col = !v.diam ? (dekatScan ? aksenTerang : aksen) : (dekatScan ? parkirScan : c);
                tulis(v.x + s[0] * cs - s[2] * sn, s[1], v.z + s[0] * sn + s[2] * cs, col);
                tulis(v.x + s[3] * cs - s[5] * sn, s[4], v.z + s[3] * sn + s[5] * cs, col);
            });

            // Animasi Pintu Pengemudi Terbuka (saat kendaraan baru parkir & orang keluar)
            if (v.pintu && v.pintu > 0.05) {
                const engselX = 0.65, engselZ = 0.92;
                const panjangPintu = 0.95;
                const dx = -Math.cos(v.pintu) * panjangPintu;
                const dz = Math.sin(v.pintu) * panjangPintu;
                const p0 = [v.x + engselX * cs - engselZ * sn, v.z + engselX * sn + engselZ * cs];
                const p1 = [v.x + (engselX + dx) * cs - (engselZ + dz) * sn, v.z + (engselX + dx) * sn + (engselZ + dz) * cs];
                tulis(p0[0], 0.42, p0[1], aksenTerang); tulis(p1[0], 0.42, p1[1], aksenTerang);
                tulis(p0[0], 0.96, p0[1], aksenTerang); tulis(p1[0], 0.96, p1[1], aksenTerang);
                tulis(p1[0], 0.42, p1[1], aksenTerang); tulis(p1[0], 0.96, p1[1], aksenTerang);
            }

            // Bingkai Alas & Cincin Pemindai 3D
            const px = v.jenis === MOTOR ? 1.05 : 2.35;
            const pz = v.jenis === MOTOR ? 0.55 : 1.14;
            const padCol = v.diam ? [0.35, 0.62, 1.0, 0.26] : aksenLembut;
            const sudutPad = [[-px, -pz], [px, -pz], [px, pz], [-px, pz]];
            for (let i = 0; i < 4; i++) {
                const a = sudutPad[i], b = sudutPad[(i + 1) % 4];
                const ax = v.x + a[0] * cs - a[1] * sn, az = v.z + a[0] * sn + a[1] * cs;
                const bx = v.x + b[0] * cs - b[1] * sn, bz = v.z + b[0] * sn + b[1] * cs;
                tulis(ax, 0.03, az, padCol);
                tulis(bx, 0.03, bz, padCol);
            }

            if (!v.diam) {
                for (const lz of [-0.58, 0.58]) {
                    const sx = v.x + 2.15 * cs - lz * sn, sz = v.z + 2.15 * sn + lz * cs;
                    const ex = v.x + 6.2 * cs - lz * 1.6 * sn, ez = v.z + 6.2 * sn + lz * 1.6 * cs;
                    tulis(sx, 0.08, sz, aksenTerang);
                    tulis(ex, 0.02, ez, [cam.warna[0], cam.warna[1], cam.warna[2], 0.0]);
                }

                if (v.path && v.i < v.path.length - 1) {
                    let prevX = v.x, prevZ = v.z;
                    for (let k = v.i + 1; k < v.path.length; k++) {
                        const pt = v.path[k];
                        for (const off of [-0.36, 0, 0.36]) {
                            const cLine = off === 0 ? aksenTerang : aksenLembut;
                            tulis(prevX, 0.04, prevZ + off, cLine);
                            tulis(pt.x, 0.04, pt.z + off, cLine);
                        }
                        prevX = pt.x; prevZ = pt.z;
                    }
                }

                if (v.slot && v.fase === 'masuk') {
                    const tx = v.slot.x, tz = zSlot(v.slot);
                    for (let ring = 0; ring < 2; ring++) {
                        const f = ((waktu * 0.95 + ring * 0.5) % 1);
                        const r = 0.45 + f * 1.25;
                        const colRing = [cam.warna[0], cam.warna[1], cam.warna[2], (1 - f) * 0.9];
                        for (let s = 0; s < 14; s++) {
                            const a1 = s / 14 * Math.PI * 2, a2 = (s + 1) / 14 * Math.PI * 2;
                            tulis(tx + Math.cos(a1) * r, 0.05, tz + Math.sin(a1) * r, colRing);
                            tulis(tx + Math.cos(a2) * r, 0.05, tz + Math.sin(a2) * r, colRing);
                        }
                    }
                    tulis(tx, 0.05, tz, aksenTerang);
                    tulis(tx, 3.8 + Math.sin(waktu * 4) * 0.35, tz, [cam.warna[0], cam.warna[1], cam.warna[2], 0.0]);
                }
            }
        });

        // 6. Palang Gerbang + Laser
        GERBANG.forEach((gx, k) => {
            const a = palang[k], L = LANE * 2 + 0.4, y0 = 1.15, z0 = -LANE - 0.35;
            for (const dy of [0, 0.18]) {
                tulis(gx, y0 + dy, z0, aksenTerang);
                tulis(gx, y0 + dy + Math.sin(a) * L, z0 + Math.cos(a) * L, aksenTerang);
            }
            const laserY = 0.3 + ((waktu * 1.4 + k * 0.5) % 1) * 3.1;
            tulis(gx, laserY, -LANE, aksenLembut);
            tulis(gx, laserY, LANE, aksenLembut);
        });
        return n / 7;
    }

    // Tiap titik = 7 angka: posisi (x, y, z) + warna (r, g, b, a).
    function pasangAtribut() {
        gl.vertexAttribPointer(u.aPos, 3, gl.FLOAT, false, 28, 0);
        gl.vertexAttribPointer(u.aCol, 4, gl.FLOAT, false, 28, 12);
    }

    // Gambar satu frame: atur kamera, lalu titik lantai, benda diam, benda bergerak.
    function gambar() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const cp = Math.cos(cam.pitch);
        const eye = [cam.tx + Math.sin(cam.yaw) * cp * cam.dist, Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist];
        const vp = kali(perspective(0.82, w / h, 0.5, 240), lookAt(eye, [cam.tx, 1.2, cam.tz]));

        gl.useProgram(prog);
        gl.uniformMatrix4fv(u.uVP, false, vp);
        gl.uniform3fv(u.uEye, eye);
        gl.uniform1f(u.uTime, waktu);
        gl.uniform2f(u.uFog, cam.dist * 0.70, cam.dist * 1.95);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufDots);
        pasangAtribut();
        gl.uniform4f(u.uTint, cam.warna[0], cam.warna[1], cam.warna[2], 1);
        gl.uniform1f(u.uPoint, Math.max(1.6, 2.5 * dpr));
        gl.uniform1f(u.uBulat, 1);
        gl.uniform1f(u.uWave, reduce ? 0 : 1);
        gl.drawArrays(gl.POINTS, 0, nDots);

        gl.uniform4f(u.uTint, 0, 0, 0, 0);
        gl.uniform1f(u.uPoint, 0);
        gl.uniform1f(u.uBulat, 0);
        gl.uniform1f(u.uWave, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufStatis);
        pasangAtribut();
        gl.drawArrays(gl.LINES, 0, nStatis);

        const nDin = bangunDinamis();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufDinamis);
        gl.bufferData(gl.ARRAY_BUFFER, dinamis.subarray(0, nDin * 7), gl.DYNAMIC_DRAW);
        pasangAtribut();
        gl.drawArrays(gl.LINES, 0, nDin);
    }

    // Loop animasi, dipanggil browser sekitar 60 kali per detik. dt dibatasi supaya tidak lompat setelah tab ditinggal.
    function frame(now: number) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000 || 0);
        last = now;
        waktu += dt;
        update(reduce ? dt * 0.4 : dt);
        gambar();
        requestAnimationFrame(frame);
    }

    // ---------- Shader ----------
    const VS = `
        attribute vec3 aPos;
        attribute vec4 aCol;
        uniform mat4 uVP;
        uniform vec3 uEye;
        uniform vec2 uFog;
        uniform float uTime, uWave, uPoint;
        varying vec4 vCol;
        void main() {
            vec3 p = aPos;
            p.y += uWave * sin(p.x * 0.16 + uTime * 0.9) * cos(p.z * 0.13 + uTime * 0.6) * 0.32;
            gl_Position = uVP * vec4(p, 1.0);
            float fog = clamp(1.0 - (distance(p, uEye) - uFog.x) / uFog.y, 0.0, 1.0);
            vCol = vec4(aCol.rgb, aCol.a * fog);
            gl_PointSize = uPoint * 18.0 / gl_Position.w;
        }`;
    const FS = `
        precision mediump float;
        uniform vec4 uTint;
        uniform float uBulat;
        varying vec4 vCol;
        void main() {
            vec4 c = vCol;
            if (uTint.a > 0.0) c.rgb = uTint.rgb;
            if (uBulat > 0.0) {
                vec2 d = gl_PointCoord - 0.5;
                float r = dot(d, d);
                if (r > 0.25) discard;
                c.a *= 1.0 - r * 3.0;
            }
            gl_FragColor = c;
        }`;

    // Compile kode shader. Kalau ada error, lemparkan pesannya.
    function shader(type: number, src: string) {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'Shader gagal dikompilasi');
        return s;
    }

    // Siapkan WebGL. Hasilnya false kalau browser tidak mendukung.
    function init(cv: HTMLCanvasElement) {
        canvas = cv;
        const konteks = canvas.getContext('webgl', { antialias: true, alpha: true });
        if (!konteks) return false;
        gl = konteks;
        prog = gl.createProgram();
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'Program gagal ditautkan');
        ['uVP', 'uEye', 'uFog', 'uTime', 'uWave', 'uPoint', 'uBulat', 'uTint'].forEach(n => u[n] = gl.getUniformLocation(prog, n));
        u.aPos = gl.getAttribLocation(prog, 'aPos');
        u.aCol = gl.getAttribLocation(prog, 'aCol');
        gl.enableVertexAttribArray(u.aPos);
        gl.enableVertexAttribArray(u.aCol);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
        bufDots = gl.createBuffer();
        bufStatis = gl.createBuffer();
        bufDinamis = gl.createBuffer();
        bangunStatis();
        isiAwal();
        return true;
    }

    return {
        // Mulai animasi. Hasilnya false kalau WebGL tidak tersedia.
        start(cv: HTMLCanvasElement) {
            if (!gl && !init(cv)) return false;
            if (running) return true;
            running = true;
            last = performance.now();
            requestAnimationFrame(frame);
            return true;
        },
        // Hentikan animasi.
        stop() { running = false; },
        // Pindahkan kamera ke zona owner, petugas, atau admin.
        setZona(z: Zona | null) { zona = z || 'none'; },
        // Posisi kursor -1 sampai 1, untuk efek kamera bergeser.
        setMouse(x: number, y: number) { mouse.x = x; mouse.y = y; }
    };
})();

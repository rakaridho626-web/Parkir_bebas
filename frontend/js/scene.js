// ========================================================
// LATAR 3D LANDING PAGE (WebGL murni, tanpa library)
// Area parkir geometris: lantai titik bergelombang, garis slot,
// mobil & motor wireframe yang keluar-masuk, palang gerbang.
// Kamera berpindah sesuai zona kursor (owner / petugas / admin).
// ========================================================

const Scene = (() => {
    // Warna aksen tiap zona (RGB 0..1)
    const WARNA = {
        none: [0.30, 0.55, 1.00],
        owner: [0.68, 0.56, 1.00],
        petugas: [0.20, 0.85, 0.95],
        admin: [0.40, 0.68, 1.00]
    };
    // Posisi kamera tiap zona
    const KAMERA = {
        none: { yaw: 0, pitch: 0.52, dist: 38, tx: 0, tz: 0 },
        owner: { yaw: 0, pitch: 1.12, dist: 50, tx: 0, tz: -9 },
        petugas: { yaw: -0.55, pitch: 0.36, dist: 23, tx: -30, tz: 1 },
        admin: { yaw: 0.6, pitch: 0.45, dist: 28, tx: 2, tz: -4 }
    };

    // Ukuran area parkir
    const SLOT_W = 2.8, SLOT_D = 5.5, LANE = 3.2, N_SLOT = 14;
    const X0 = -N_SLOT * SLOT_W / 2;
    const GERBANG = [-27, 27];
    const LAJU = 7;

    let gl, canvas, prog, u = {};
    let bufDots, bufStatis, bufDinamis, nDots = 0, nStatis = 0;
    let running = false, last = 0, waktu = 0, spawnTimer = 0;
    let zona = 'none';
    const mouse = { x: 0, y: 0 };
    const cam = { ...KAMERA.none, warna: [...WARNA.none] };
    const palang = GERBANG.map(() => 0);   // sudut buka palang (radian)
    const slots = [];
    const kendaraan = [];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Matriks (column-major) ----------
    function perspective(fov, asp, n, f) {
        const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f);
        return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0];
    }

    function lookAt(e, c) {
        let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
        let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
        let xx = zz, xy = 0, xz = -zx;                       // up = (0,1,0) x z
        l = Math.hypot(xx, xz); xx /= l; xz /= l;
        const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
        return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
            -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
    }

    function kali(a, b) {
        const o = new Float32Array(16);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
            let s = 0;
            for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
            o[i * 4 + j] = s;
        }
        return o;
    }

    // ---------- Bentuk geometri (daftar segmen garis lokal) ----------
    function kotak(s, x0, x1, y0, y1, z0, z1) {
        const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
        [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
            .forEach(([a, b]) => s.push([...p[a], ...p[b]]));
    }

    function kabin(s, bx0, bx1, tx0, tx1, y0, y1, w) {
        const p = [[bx0, y0, -w], [bx1, y0, -w], [bx1, y0, w], [bx0, y0, w], [tx0, y1, -w * .85], [tx1, y1, -w * .85], [tx1, y1, w * .85], [tx0, y1, w * .85]];
        [[4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
            .forEach(([a, b]) => s.push([...p[a], ...p[b]]));
    }

    function roda(s, cx, cy, cz, r) {
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2, b = (i + 1) / 8 * Math.PI * 2;
            s.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz, cx + Math.cos(b) * r, cy + Math.sin(b) * r, cz]);
        }
    }

    const MOBIL = [];
    kotak(MOBIL, -2.1, 2.1, 0.35, 1.0, -0.9, 0.9);
    kabin(MOBIL, -1.2, 0.9, -0.85, 0.35, 1.0, 1.6, 0.85);
    [[-1.3, -0.95], [-1.3, 0.95], [1.3, -0.95], [1.3, 0.95]].forEach(([x, z]) => roda(MOBIL, x, 0.38, z, 0.38));

    const MOTOR = [];
    roda(MOTOR, -0.75, 0.33, 0, 0.33);
    roda(MOTOR, 0.75, 0.33, 0, 0.33);
    MOTOR.push([-0.75, 0.33, 0, -0.1, 0.8, 0], [-0.1, 0.8, 0, 0.55, 0.75, 0], [0.55, 0.75, 0, 0.75, 0.33, 0],
        [-0.1, 0.8, 0, 0.3, 0.33, 0], [0.55, 0.75, 0, 0.6, 1.15, 0], [0.6, 1.15, -0.35, 0.6, 1.15, 0.35],
        [-0.6, 0.85, 0, 0.1, 0.9, 0]);

    // ---------- Buffer statis: lantai titik & marka parkir ----------
    function garis(arr, a, b, c) { arr.push(...a, ...c, ...b, ...c); }

    function bangunStatis() {
        const dots = [];
        for (let x = -66; x <= 66; x += 1.6) for (let z = -48; z <= 36; z += 1.6) dots.push(x, -0.05, z, 1, 1, 1, 0.55);

        const L = [];
        const marka = [0.35, 0.6, 1.0, 0.75];
        const redup = [0.35, 0.6, 1.0, 0.3];
        const xAkhir = X0 + N_SLOT * SLOT_W;
        for (const sg of [-1, 1]) {
            const zDalam = sg * LANE, zLuar = sg * (LANE + SLOT_D);
            for (let i = 0; i <= N_SLOT; i++) {
                const x = X0 + i * SLOT_W;
                garis(L, [x, 0, zDalam + sg * 0.4], [x, 0, zLuar], marka);
            }
            garis(L, [X0, 0, zLuar], [xAkhir, 0, zLuar], marka);
            // tepi jalan masuk & keluar
            garis(L, [-50, 0, zDalam], [X0, 0, zDalam], redup);
            garis(L, [xAkhir, 0, zDalam], [50, 0, zDalam], redup);
            garis(L, [X0 - 6, 0, zLuar], [X0 - 6, 0, zDalam], redup);
        }
        // garis putus-putus tengah jalur
        for (let x = -48; x < 48; x += 3) garis(L, [x, 0, 0], [x + 1.5, 0, 0], redup);
        // panah arah masuk
        for (const ax of [-36, -14, 8, 34]) {
            garis(L, [ax, 0, -0.9], [ax + 1.2, 0, 0], marka);
            garis(L, [ax, 0, 0.9], [ax + 1.2, 0, 0], marka);
        }
        // tiang gerbang
        const tiang = [];
        GERBANG.forEach(gx => kotak(tiang, gx - 0.25, gx + 0.25, 0, 1.3, -LANE - 0.6, -LANE - 0.1));
        tiang.forEach(s => garis(L, s.slice(0, 3), s.slice(3), marka));
        // huruf "P" besar di lantai
        const P = [[-1, -1.5], [-1, 1.5], [-1, 1.5], [0.6, 1.5], [0.6, 1.5], [1, 1], [1, 1], [1, 0.4], [1, 0.4], [0.6, 0], [0.6, 0], [-1, 0]];
        for (let i = 0; i < P.length; i += 2) {
            garis(L, [-40 + P[i][0] * 1.4, 0, 9 - P[i][1] * 1.4], [-40 + P[i + 1][0] * 1.4, 0, 9 - P[i + 1][1] * 1.4], marka);
        }

        nDots = dots.length / 7;
        nStatis = L.length / 7;
        gl.bindBuffer(gl.ARRAY_BUFFER, bufDots);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dots), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufStatis);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(L), gl.STATIC_DRAW);
    }

    // ---------- Kendaraan ----------
    const zSlot = s => s.sg * (LANE + SLOT_D / 2);

    function isiAwal() {
        slots.length = 0;
        kendaraan.length = 0;
        for (const sg of [-1, 1]) for (let i = 0; i < N_SLOT; i++) {
            slots.push({ x: X0 + SLOT_W * (i + 0.5), sg, isi: false });
        }
        slots.forEach(s => {
            if (Math.random() < 0.5) {
                s.isi = true;
                kendaraan.push({ jenis: Math.random() < 0.25 ? MOTOR : MOBIL, x: s.x, z: zSlot(s), h: s.sg * Math.PI / 2, diam: true });
            }
        });
    }

    function selisihSudut(a, b) {
        let d = a - b;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return d;
    }

    function spawn() {
        const kosong = slots.filter(s => !s.isi);
        if (!kosong.length) return;
        const s = kosong[Math.floor(Math.random() * kosong.length)];
        s.isi = true;
        const zc = zSlot(s), sg = s.sg;
        kendaraan.push({
            jenis: Math.random() < 0.3 ? MOTOR : MOBIL,
            x: -52, z: 0, h: 0, hTarget: 0, slot: s, fase: 'masuk', tunggu: 0,
            path: [{ x: -52, z: 0 }, { x: s.x - 5, z: 0 }, { x: s.x - 2.2, z: sg * 0.8 }, { x: s.x - 0.5, z: sg * 2.6 }, { x: s.x, z: sg * (LANE + 0.6) }, { x: s.x, z: zc }],
            i: 0
        });
    }

    function jalan(v, dt) {
        let sisa = LAJU * dt * (v.mundur ? 0.5 : 1);
        while (sisa > 0 && v.i < v.path.length - 1) {
            const b = v.path[v.i + 1];
            const dx = b.x - v.x, dz = b.z - v.z, d = Math.hypot(dx, dz);
            v.mundur = !!b.mundur;
            if (d > 0.001) v.hTarget = Math.atan2(dz, dx) + (b.mundur ? Math.PI : 0);
            if (d <= sisa) { v.x = b.x; v.z = b.z; v.i++; sisa -= d; }
            else { v.x += dx / d * sisa; v.z += dz / d * sisa; sisa = 0; }
        }
        v.h += selisihSudut(v.hTarget, v.h) * Math.min(1, dt * 5);
        return v.i >= v.path.length - 1;
    }

    function update(dt) {
        spawnTimer -= dt;
        const bergerak = kendaraan.filter(v => !v.diam);
        if (spawnTimer <= 0 && bergerak.length < 4) {
            spawn();
            spawnTimer = 2.5 + Math.random() * 2.5;
        }

        for (let n = kendaraan.length - 1; n >= 0; n--) {
            const v = kendaraan[n];
            if (v.diam) continue;
            if (v.fase === 'masuk' && jalan(v, dt)) {
                v.fase = 'parkir';
                v.tunggu = 3 + Math.random() * 5;
            } else if (v.fase === 'parkir') {
                v.tunggu -= dt;
                if (v.tunggu <= 0) {
                    const s = v.slot;
                    v.fase = 'keluar';
                    v.i = 0;
                    v.path = [{ x: v.x, z: v.z }, { x: s.x, z: s.sg * 1.2, mundur: true }, { x: s.x + 3.5, z: 0 }, { x: 54, z: 0 }];
                }
            } else if (v.fase === 'keluar') {
                if (v.i >= 1 && v.slot) { v.slot.isi = false; v.slot = null; }
                if (jalan(v, dt)) kendaraan.splice(n, 1);
            }
        }

        // Palang terbuka kalau ada kendaraan mendekat
        GERBANG.forEach((gx, k) => {
            const dekat = kendaraan.some(v => !v.diam && Math.abs(v.x - gx) < 6 && Math.abs(v.z) < LANE);
            const target = dekat ? 1.35 : 0;
            palang[k] += (target - palang[k]) * Math.min(1, dt * 4);
        });

        // Kamera & warna mengejar target zona
        const t = KAMERA[zona];
        const k = 1 - Math.exp(-dt * 2.6);
        const drift = zona === 'none' && !reduce ? Math.sin(waktu * 0.12) * 0.25 : 0;
        cam.yaw += (t.yaw + drift + mouse.x * 0.12 - cam.yaw) * k;
        cam.pitch += (t.pitch - mouse.y * 0.06 - cam.pitch) * k;
        cam.dist += (t.dist - cam.dist) * k;
        cam.tx += (t.tx - cam.tx) * k;
        cam.tz += (t.tz - cam.tz) * k;
        cam.warna = cam.warna.map((c, i) => c + (WARNA[zona][i] - c) * k);
    }

    // ---------- Gambar ----------
    let dinamis = new Float32Array(30000);

    function bangunDinamis() {
        let n = 0;
        const tulis = (x, y, z, c) => {
            if (n + 7 > dinamis.length) {
                const baru = new Float32Array(dinamis.length * 2);
                baru.set(dinamis);
                dinamis = baru;
            }
            dinamis[n++] = x; dinamis[n++] = y; dinamis[n++] = z;
            dinamis[n++] = c[0]; dinamis[n++] = c[1]; dinamis[n++] = c[2]; dinamis[n++] = c[3];
        };

        const aksen = [...cam.warna, 0.95];
        const parkir = [0.45, 0.6, 1.0, 0.4];
        kendaraan.forEach(v => {
            const c = v.diam ? parkir : aksen;
            const cs = Math.cos(v.h), sn = Math.sin(v.h);
            v.jenis.forEach(s => {
                tulis(v.x + s[0] * cs - s[2] * sn, s[1], v.z + s[0] * sn + s[2] * cs, c);
                tulis(v.x + s[3] * cs - s[5] * sn, s[4], v.z + s[3] * sn + s[5] * cs, c);
            });
        });

        // Lengan palang (berputar ke atas)
        GERBANG.forEach((gx, k) => {
            const a = palang[k], L = LANE * 2 + 0.4, y0 = 1.15, z0 = -LANE - 0.35;
            for (const dy of [0, 0.18]) {
                tulis(gx, y0 + dy, z0, aksen);
                tulis(gx, y0 + dy + Math.sin(a) * L, z0 + Math.cos(a) * L, aksen);
            }
        });
        return n / 7;
    }

    function pasangAtribut() {
        gl.vertexAttribPointer(u.aPos, 3, gl.FLOAT, false, 28, 0);
        gl.vertexAttribPointer(u.aCol, 4, gl.FLOAT, false, 28, 12);
    }

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
        const vp = kali(perspective(0.85, w / h, 0.5, 200), lookAt(eye, [cam.tx, 0, cam.tz]));

        gl.useProgram(prog);
        gl.uniformMatrix4fv(u.uVP, false, vp);
        gl.uniform3fv(u.uEye, eye);
        gl.uniform1f(u.uTime, waktu);
        gl.uniform2f(u.uFog, cam.dist * 0.55, cam.dist * 1.5);

        // Lantai titik (bergelombang, warna aksen)
        gl.bindBuffer(gl.ARRAY_BUFFER, bufDots);
        pasangAtribut();
        gl.uniform4f(u.uTint, ...cam.warna, 1);
        gl.uniform1f(u.uPoint, Math.max(1.5, 2.4 * dpr));
        gl.uniform1f(u.uBulat, 1);
        gl.uniform1f(u.uWave, reduce ? 0 : 1);
        gl.drawArrays(gl.POINTS, 0, nDots);

        // Marka parkir & kendaraan
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

    function frame(now) {
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
            p.y += uWave * sin(p.x * 0.16 + uTime * 0.9) * cos(p.z * 0.13 + uTime * 0.6) * 0.35;
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

    function shader(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
    }

    function init(cv) {
        canvas = cv;
        gl = canvas.getContext('webgl', { antialias: true, alpha: true });
        if (!gl) return false;
        prog = gl.createProgram();
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        ['uVP', 'uEye', 'uFog', 'uTime', 'uWave', 'uPoint', 'uBulat', 'uTint'].forEach(n => u[n] = gl.getUniformLocation(prog, n));
        u.aPos = gl.getAttribLocation(prog, 'aPos');
        u.aCol = gl.getAttribLocation(prog, 'aCol');
        gl.enableVertexAttribArray(u.aPos);
        gl.enableVertexAttribArray(u.aCol);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);   // additive → efek neon
        bufDots = gl.createBuffer();
        bufStatis = gl.createBuffer();
        bufDinamis = gl.createBuffer();
        bangunStatis();
        isiAwal();
        return true;
    }

    return {
        // Mulai animasi. Mengembalikan false kalau browser tidak mendukung WebGL.
        start(cv) {
            if (!gl && !init(cv)) return false;
            if (running) return true;
            running = true;
            last = performance.now();
            requestAnimationFrame(frame);
            return true;
        },
        stop() { running = false; },
        setZona(z) { zona = z || 'none'; },
        setMouse(x, y) { mouse.x = x; mouse.y = y; }
    };
})();

// ========================================================
// VISUAL 3D (CSS 3D) & OLAH DATA GRAFIK
// Dipakai halaman Rekap, Transaksi, dan Data Master.
// ========================================================

// ---------- Visual 3D: batang (CSS 3D cuboid) ----------
// Grafik batang. data = [{ label, nilai }]. Tiap batang terdiri dari 3 sisi: depan, samping, atas.
// Tinggi batang dihitung relatif terhadap nilai terbesar. Batang tumbuh saat elemen induk diberi kelas 'tumbuh'.
function batang3D(data, { tinggi = 200, lebar = 34, dalam = 26, format = x => x, kelas = '' } = {}) {
    const max = Math.max(1, ...data.map(d => d.nilai));
    if (data.length > 12) kelas += ' banyak';
    return `<div class="chart3d ${kelas}" style="--H:${tinggi}px;--W:${lebar}px;--D:${dalam}px">
        <div class="bars3d">
            <div class="bars-floor"></div>
            ${data.map((d, i) => `
                <div class="bar3d ${d.nilai === max && d.nilai > 0 ? 'max' : ''}" style="--i:${i};--hp:${(d.nilai / max * tinggi).toFixed(1)}px" title="${UI.esc(d.label)}: ${UI.esc(format(d.nilai))}">
                    <i class="f-front"></i><i class="f-side"></i><i class="f-top"></i>
                    ${d.nilai > 0 ? `<span class="bar-val">${UI.esc(format(d.nilai))}</span>` : ''}
                    <span class="bar-label">${UI.esc(d.label)}</span>
                </div>`).join('')}
        </div>
    </div>`;
}

// ---------- Visual 3D: donat bertumpuk ----------
// Warna potongan donat, dipakai berurutan.
const WARNA_JENIS = ['#4d8cff', '#33d9f2', '#a98fff', '#ffb547', '#ff6b8b'];

// Grafik donat. items = [{ jenis, jumlah, nilai }]. Kalau semua nilai 0, tampil abu-abu kosong.
// Kesan tebal didapat dari 14 lapis lingkaran yang ditumpuk.
function donat3D(items, labelTengah = 'kendaraan') {
    const total = items.reduce((a, b) => a + b.nilai, 0);
    let sudut = 0;
    const stops = total > 0 ? items.map((it, i) => {
        const awal = sudut;
        sudut += it.nilai / total * 360;
        return `${WARNA_JENIS[i % WARNA_JENIS.length]} ${awal}deg ${sudut}deg`;
    }).join(', ') : '';
    const lapis = 14;
    return `<div class="donut3d">
        <div class="donut-stack" style="--g:conic-gradient(${stops || '#1c2b55 0deg 360deg'})">
            ${[...Array(lapis).keys()].map(i =>
                `<i style="--z:${i * 2}px;--b:${(0.35 + i / lapis * 0.65).toFixed(2)}"></i>`).join('')}
        </div>
        <div class="donut-center"><b>${items.reduce((a, b) => a + b.jumlah, 0)}</b><small>${UI.esc(labelTengah)}</small></div>
    </div>`;
}

// Grafik batang berputar mengikuti kursor. Cukup dipasang sekali di elemen pembungkus.
function pasangPutarChart(container) {
    container.addEventListener('pointermove', e => {
        const chart = e.target.closest('.chart3d');
        if (!chart) return;
        const r = chart.getBoundingClientRect();
        chart.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 50 - 18).toFixed(1)}deg`);
        chart.style.setProperty('--rx', `${(-14 - ((e.clientY - r.top) / r.height - 0.5) * 16).toFixed(1)}deg`);
    });
}

// ---------- Olah data rekap ----------
// Hitung pendapatan per hari. Hari tanpa transaksi tetap muncul dengan nilai 0.
function kelompokHari(rows, start, end) {
    const hari = [];
    for (let d = new Date(start + 'T00:00'); d <= new Date(end + 'T00:00'); d.setDate(d.getDate() + 1)) {
        hari.push(d.toLocaleDateString('sv-SE'));
    }
    const total = rows.reduce((acc, r) => {
        const k = new Date(r.waktu_keluar).toLocaleDateString('sv-SE');
        acc[k] = (acc[k] || 0) + Number(r.total_bayar);
        return acc;
    }, {});
    let data = hari.map(k => ({ kunci: k, nilai: total[k] || 0 }));

    // Rentang lebih dari 31 hari dikelompokkan per minggu supaya batang tidak terlalu rapat.
    if (data.length > 31) {
        const minggu = [];
        for (let i = 0; i < data.length; i += 7) {
            const potong = data.slice(i, i + 7);
            minggu.push({ kunci: potong[0].kunci, nilai: potong.reduce((a, b) => a + b.nilai, 0), minggu: true });
        }
        data = minggu;
    }
    return data.map(d => {
        const tgl = new Date(d.kunci + 'T00:00');
        return { ...d, label: (d.minggu ? 'mg ' : '') + tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) };
    });
}

// Kelompokkan baris per jenis kendaraan, lalu urutkan dari nilai terbesar.
// nilai memakai total_bayar. Untuk data kendaraan yang tidak punya total_bayar, tiap baris dihitung 1.
function perJenis(rows) {
    return Object.values(rows.reduce((acc, r) => {
        const k = UI.kapital(r.jenis_kendaraan);
        acc[k] = acc[k] || { jenis: k, jumlah: 0, nilai: 0 };
        acc[k].jumlah++;
        acc[k].nilai += Number(r.total_bayar || r.tarif_per_jam || 1);
        return acc;
    }, {})).sort((a, b) => b.nilai - a.nilai);
}

// Hitung jumlah kendaraan masuk per jam (00 sampai 23).
function perJam(rows) {
    const jam = Array(24).fill(0);
    rows.forEach(r => jam[new Date(r.waktu_masuk || r.waktu).getHours()]++);
    return jam.map((n, i) => ({ label: String(i).padStart(2, '0'), nilai: n }));
}

// Rupiah versi pendek untuk label grafik: 15000 jadi 15rb, 2500000 jadi 2.5jt.
const rupiahSingkat = n => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.0', '')}jt`
    : n >= 1e3 ? `${Math.round(n / 1e3)}rb` : String(n);

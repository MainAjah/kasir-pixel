// Ikon menu dari gambar pemilik: buang latar (tumbuh dari tepi), potong rapat,
// lalu susutkan ke kisi paling besar MAX × MAX dengan warna terbanyak per sel
// (tetap tajam, tanpa campuran warna). node ikon.cjs <masuk.png> <keluar.png> <MAX>
const { decode, encode } = require('./png.cjs');
const [, , src, dst, maxArg] = process.argv;
const MAX = Number(maxArg || 36);
const NEAR_WHITE = Number(process.env.NEAR_WHITE || 0);
const MIN_PART = Number(process.env.MIN_PART || 400); // luas bagian terkecil yang disimpan (piksel sumber)
const BG_DARK = Number(process.env.BG_DARK || 0); // latar gelap: jumlah kanal paling besar
const BG_WHITE = Number(process.env.BG_WHITE || 0); // latar putih murni: kanal terkecil paling kecil

const { w, h, px } = decode(src);
const at = (x, y) => (y * w + x) * 4;
const dist = (i, j) =>
    Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2]);

// 1. Latar: tumbuh dari tepi selama warna bertetangga mirip (atau hampir putih bila NEAR_WHITE).
const bg = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) stack.push([x, 0], [x, h - 1]);
for (let y = 0; y < h; y++) stack.push([0, y], [w - 1, y]);
for (const [x, y] of stack) bg[y * w + x] = 1;
// Piksel transparan (gambar ber-alpha) selalu latar.
for (let i = 0; i < w * h; i++) if (px[i * 4 + 3] < 128) bg[i] = 1;
while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || bg[ny * w + nx]) continue;
        const ni = at(nx, ny);
        const sum = px[ni] + px[ni + 1] + px[ni + 2];
        if (BG_DARK) {
            // Latar hitam: tumbuh hanya lewat piksel yang hampir hitam.
            if (sum > BG_DARK) continue;
        } else if (BG_WHITE) {
            // Latar putih murni: benda bening keputihan (botol) tidak ikut terhapus.
            if (Math.min(px[ni], px[ni + 1], px[ni + 2]) < BG_WHITE) continue;
        } else {
            const nearWhite = NEAR_WHITE && sum > NEAR_WHITE;
            if (!nearWhite && dist(at(x, y), ni) > 36) continue;
            if (sum < 150) continue; // garis tepi gelap tidak pernah latar
        }
        bg[ny * w + nx] = 1;
        stack.push([nx, ny]);
    }
}

// 1b. GLOBAL_WHITE: semua piksel terang (jumlah kanal > nilai) dianggap latar,
// untuk gambar tanpa bagian putih (latar kotak-kotak yang terkurung tali).
if (process.env.GLOBAL_WHITE) {
    for (let i = 0; i < w * h; i++) {
        const k = i * 4;
        if (px[k] + px[k + 1] + px[k + 2] > Number(process.env.GLOBAL_WHITE)) bg[i] = 1;
    }
}

// 1c. ENCLOSED: daerah putih yang terkurung garis gelap (celah di dalam kabel)
// juga latar. Putih badan benda selalu bersebelahan dengan bayangan abu-abu.
if (process.env.ENCLOSED) {
    const LIGHT = Number(process.env.ENCLOSED);
    const seen = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
        const k = i * 4;
        if (bg[i] || seen[i] || px[k] + px[k + 1] + px[k + 2] <= LIGHT) continue;
        const region = [];
        const st = [i];
        seen[i] = 1;
        let edge = 0, darkEdge = 0;
        while (st.length) {
            const j = st.pop();
            region.push(j);
            const x = j % w, y = (j / w) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nj = ny * w + nx, nk = nj * 4;
                const sum = px[nk] + px[nk + 1] + px[nk + 2];
                if (sum > LIGHT && !bg[nj]) {
                    if (!seen[nj]) { seen[nj] = 1; st.push(nj); }
                    continue;
                }
                edge++;
                if (bg[nj] || sum < 240) darkEdge++;
            }
        }
        if (region.length >= 200 && darkEdge >= edge * 0.85) for (const j of region) bg[j] = 1;
    }
}

// 2. Buang bintik kecil: simpan hanya bagian latar-depan yang cukup luas.
const part = new Int32Array(w * h).fill(-1);
const sizes = [];
for (let i = 0; i < w * h; i++) {
    if (bg[i] || part[i] >= 0) continue;
    const id = sizes.length;
    let n = 0;
    const st = [i];
    part[i] = id;
    while (st.length) {
        const k = st.pop();
        n++;
        const x = k % w, y = (k / w) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, nk = ny * w + nx;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || bg[nk] || part[nk] >= 0) continue;
            part[nk] = id;
            st.push(nk);
        }
    }
    sizes.push(n);
}
const sizesMax = [Math.max(...sizes)];
let minX = w, minY = h, maxX = -1, maxY = -1;
for (let i = 0; i < w * h; i++) {
    if (bg[i]) continue;
    if (sizes[part[i]] < MIN_PART || (process.env.LARGEST && sizes[part[i]] !== Math.max(...sizesMax))) {
        bg[i] = 1;
        continue;
    }
    const x = i % w, y = (i / w) | 0;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}

// 3. Susutkan ke kisi MAX (sisi terpanjang), warna terbanyak per sel.
const bw = maxX - minX + 1, bh = maxY - minY + 1;
const step = Math.max(bw, bh) / MAX;
const ow = Math.max(1, Math.round(bw / step)), oh = Math.max(1, Math.round(bh / step));
const out = Buffer.alloc(ow * oh * 4);
for (let gy = 0; gy < oh; gy++) {
    for (let gx = 0; gx < ow; gx++) {
        const x0 = Math.floor(minX + gx * step), x1 = Math.floor(minX + (gx + 1) * step);
        const y0 = Math.floor(minY + gy * step), y1 = Math.floor(minY + (gy + 1) * step);
        const counts = new Map();
        let fg = 0, total = 0;
        for (let y = y0; y < Math.max(y1, y0 + 1); y++) {
            for (let x = x0; x < Math.max(x1, x0 + 1); x++) {
                total++;
                if (x > maxX || y > maxY || bg[y * w + x]) continue;
                fg++;
                const i = at(x, y);
                const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
                const e = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 };
                e.n++; e.r += px[i]; e.g += px[i + 1]; e.b += px[i + 2];
                counts.set(key, e);
            }
        }
        if (fg < total * 0.45) continue;
        let top = null;
        if (process.env.AVG) {
            top = { n: 0, r: 0, g: 0, b: 0 };
            for (const e of counts.values()) { top.n += e.n; top.r += e.r; top.g += e.g; top.b += e.b; }
        } else for (const e of counts.values()) if (!top || e.n > top.n) top = e;
        const o = (gy * ow + gx) * 4;
        out[o] = Math.round(top.r / top.n);
        out[o + 1] = Math.round(top.g / top.n);
        out[o + 2] = Math.round(top.b / top.n);
        out[o + 3] = 255;
    }
}
// 4. OUTLINE (hex): garis tepi 1 piksel di sekeliling siluet (ikon jadi 2 piksel lebih besar).
let fw = ow, fh = oh, final = out;
if (process.env.OUTLINE) {
    const hex = process.env.OUTLINE.replace('#', '');
    const oc = [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16));
    fw = ow + 2; fh = oh + 2; final = Buffer.alloc(fw * fh * 4);
    const op = (x, y) => x >= 0 && y >= 0 && x < ow && y < oh && out[(y * ow + x) * 4 + 3] > 0;
    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            const sx = x - 1, sy = y - 1, o = (y * fw + x) * 4;
            if (op(sx, sy)) {
                const s0 = (sy * ow + sx) * 4;
                final[o] = out[s0]; final[o + 1] = out[s0 + 1]; final[o + 2] = out[s0 + 2]; final[o + 3] = 255;
            } else if (op(sx + 1, sy) || op(sx - 1, sy) || op(sx, sy + 1) || op(sx, sy - 1)) {
                final[o] = oc[0]; final[o + 1] = oc[1]; final[o + 2] = oc[2]; final[o + 3] = 255;
            }
        }
    }
}
encode(dst, fw, fh, final);

// Pratinjau 8× di atas kotak-kotak.
const S = 8, pw = fw * S, ph = fh * S, prev = Buffer.alloc(pw * ph * 4);
for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
        const o = (y * pw + x) * 4, s = (((y / S) | 0) * fw + ((x / S) | 0)) * 4;
        if (final[s + 3]) { prev[o] = final[s]; prev[o + 1] = final[s + 1]; prev[o + 2] = final[s + 2]; }
        else { const v = ((x >> 3) + (y >> 3)) & 1 ? 235 : 250; prev[o] = prev[o + 1] = prev[o + 2] = v; }
        prev[o + 3] = 255;
    }
}
encode(dst.replace(/\.png$/, '-pratinjau.png'), pw, ph, prev);
console.log(JSON.stringify({ src, size: [fw, fh], step: Number(step.toFixed(2)) }));

// Ambil karakter dari gambar referensi: buang latar, kembalikan ke grid piksel aslinya,
// buang efek terpisah (percikan, asap), lalu potong rapat. Tanpa paket tambahan.
const { decode, encode } = require('./png.js');
const [, , src, outDir, name, forceCell, forceOx, forceOy] = process.argv;

const img = decode(src);
const { w, h, px } = img;
const at = (x, y) => (y * w + x) * 4;
const dist = (i, j) => Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2]);

// 1. Latar: tumbuh dari tepi gambar selama warna bertetangga mirip (aman untuk latar gradasi).
const bg = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) { stack.push([x, 0], [x, h - 1]); }
for (let y = 0; y < h; y++) { stack.push([0, y], [w - 1, y]); }
for (const [x, y] of stack) bg[y * w + x] = 1;
while (stack.length) {
  const [x, y] = stack.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h || bg[ny * w + nx]) continue;
    const ni = at(nx, ny), nearWhite = process.env.NEAR_WHITE && px[ni] + px[ni + 1] + px[ni + 2] > Number(process.env.NEAR_WHITE);
    if (!nearWhite && dist(at(x, y), at(nx, ny)) > 36) continue;
    // Jangan tumbuh ke piksel gelap (garis tepi karakter selalu gelap).
    const i = at(nx, ny); if (px[i] + px[i + 1] + px[i + 2] < 150) continue;
    bg[ny * w + nx] = 1; stack.push([nx, ny]);
  }
}

// 2. Ukuran sel: sel terbesar yang varians dalam-selnya masih rendah.
function cellVariance(c, ox, oy) {
  let sum = 0, n = 0;
  for (let cy = oy; cy + c <= h; cy += c * 3) for (let cx = ox; cx + c <= w; cx += c * 2) {
    const m = Math.max(1, Math.floor(c * 0.2));
    const i0 = at(cx + m, cy + m), i1 = at(cx + c - 1 - m, cy + c - 1 - m), i2 = at(cx + m, cy + c - 1 - m), i3 = at(cx + c - 1 - m, cy + m);
    if (bg[(cy + m) * w + cx + m] && bg[(cy + c - 1 - m) * w + cx + c - 1 - m]) continue;
    sum += dist(i0, i1) + dist(i0, i2) + dist(i0, i3); n++;
  }
  return n ? sum / n : Infinity;
}
let cell, phase = [0, 0];
if (forceCell) {
  cell = Number(forceCell);
} else {
  const results = [];
  for (let c = 6; c <= 40; c++) {
    let best = { v: Infinity };
    for (let ox = 0; ox < c; ox += Math.max(1, Math.floor(c / 8))) for (let oy = 0; oy < c; oy += Math.max(1, Math.floor(c / 8))) {
      const v = cellVariance(c, ox, oy); if (v < best.v) best = { v, ox, oy };
    }
    results.push({ c, ...best });
  }
  const min = Math.min(...results.map((r) => r.v));
  const ok = results.filter((r) => r.v <= min * 1.6 + 6);
  const pick = ok[ok.length - 1];
  cell = pick.c; phase = [pick.ox, pick.oy];
  console.error(name, 'kandidat', results.map((r) => `${r.c}:${r.v.toFixed(0)}`).join(' '));
}
// Penyempurnaan fase untuk sel terpilih (dilewati bila fase diberikan).
if (forceOx !== undefined) {
  phase = [Number(forceOx), Number(forceOy)];
} else {
  let best = { v: Infinity };
  for (let ox = 0; ox < cell; ox++) for (let oy = 0; oy < cell; oy++) {
    const v = cellVariance(cell, ox, oy); if (v < best.v) best = { v, ox, oy };
  }
  phase = [best.ox, best.oy];
}

// 3. Sampel tiap sel: modus warna (dibulatkan) di bagian tengah sel.
const gw = Math.floor((w - phase[0]) / cell), gh = Math.floor((h - phase[1]) / cell);
const grid = new Array(gw * gh).fill(null);
for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
  const x0 = phase[0] + gx * cell, y0 = phase[1] + gy * cell, m = cell * 0.25;
  const counts = new Map(); let bgCount = 0, total = 0;
  for (let y = Math.round(y0 + m); y < Math.round(y0 + cell - m); y++) for (let x = Math.round(x0 + m); x < Math.round(x0 + cell - m); x++) {
    total++;
    if (bg[y * w + x]) { bgCount++; continue; }
    const i = at(x, y), key = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
    const e = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += px[i]; e.g += px[i + 1]; e.b += px[i + 2]; counts.set(key, e);
  }
  if (bgCount > total * 0.5) continue;
  let top = null; for (const e of counts.values()) if (!top || e.n > top.n) top = e;
  if (top) grid[gy * gw + gx] = [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)];
}

// 3b. (CELL_BG) Latar di tingkat sel: sel hampir putih yang tersambung ke tepi dibuang
// (untuk gambar berkisi, misalnya pola kristik dengan garis grid).
if (process.env.CELL_BG) {
  const light = (c) => c && c[0] + c[1] + c[2] > Number(process.env.CELL_BG);
  const st = [];
  for (let x = 0; x < gw; x++) { st.push([x, 0], [x, gh - 1]); }
  for (let y = 0; y < gh; y++) { st.push([0, y], [gw - 1, y]); }
  const seen = new Uint8Array(gw * gh);
  while (st.length) {
    const [x, y] = st.pop(); const k = y * gw + x;
    if (x < 0 || y < 0 || x >= gw || y >= gh || seen[k]) continue;
    seen[k] = 1;
    if (grid[k] && !light(grid[k])) continue;
    grid[k] = null;
    st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

// 4. Simpan hanya komponen terhubung terbesar (buang percikan, asap, bingkai).
const comp = new Int32Array(gw * gh).fill(-1); const sizes = [];
for (let i = 0; i < gw * gh; i++) {
  if (!grid[i] || comp[i] >= 0) continue;
  const id = sizes.length; let n = 0; const st = [i]; comp[i] = id;
  while (st.length) {
    const k = st.pop(); n++; const x = k % gw, y = (k / gw) | 0;
    const NB = process.env.CONN8 ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of NB) {
      const nx = x + dx, ny = y + dy, nk = ny * gw + nx;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || !grid[nk] || comp[nk] >= 0) continue;
      comp[nk] = id; st.push(nk);
    }
  }
  sizes.push(n);
}
const keep = sizes.indexOf(Math.max(...sizes));
let minX = gw, minY = gh, maxX = -1, maxY = -1;
for (let i = 0; i < gw * gh; i++) {
  if (comp[i] !== keep) { grid[i] = null; continue; }
  const x = i % gw, y = (i / gw) | 0;
  minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}
const ow = maxX - minX + 1, oh = maxY - minY + 1;
const out = Buffer.alloc(ow * oh * 4);
for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
  const c = grid[(y + minY) * gw + x + minX]; if (!c) continue;
  const o = (y * ow + x) * 4; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
}
encode(`${outDir}/${name}.png`, ow, oh, out);
// Pratinjau diperbesar x8 di atas latar kotak-kotak.
const S = 8, pw = ow * S, ph = oh * S, prev = Buffer.alloc(pw * ph * 4);
for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
  const o = (y * pw + x) * 4, s = ((((y / S) | 0) * ow) + ((x / S) | 0)) * 4;
  if (out[s + 3]) { prev[o] = out[s]; prev[o + 1] = out[s + 1]; prev[o + 2] = out[s + 2]; }
  else { const v = ((x >> 3) + (y >> 3)) & 1 ? 235 : 250; prev[o] = prev[o + 1] = prev[o + 2] = v; }
  prev[o + 3] = 255;
}
encode(`${outDir}/${name}-pratinjau.png`, pw, ph, prev);
console.log(JSON.stringify({ name, cell, phase, native: [ow, oh] }));

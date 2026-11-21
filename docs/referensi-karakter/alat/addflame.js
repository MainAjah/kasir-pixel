// Tambahkan semburan api biru di bawah kedua telapak tangan (seperti terbang memakai pendorong).
const { decode, encode } = require('./png.js');
const [, , file] = process.argv;
const src = decode(file);
// Beri ruang 3 piksel di kiri dan kanan supaya api tidak terpotong tepi gambar.
const PAD = 3, w = src.w + PAD * 2, h = src.h, px = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) src.px.copy(px, (y * w + PAD) * 4, y * src.w * 4, (y + 1) * src.w * 4);
const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 0;

// Cari ujung bawah tangan di seperlima kiri dan kanan sprite (di atas 85% tinggi, agar kaki tidak terambil).
function handTip(x0, x1) {
  for (let y = Math.floor(h * 0.85); y >= 0; y--) {
    const xs = []; for (let x = x0; x < x1; x++) if (opaque(x, y)) xs.push(x);
    if (xs.length) return { x: Math.round((xs[0] + xs[xs.length - 1]) / 2), y };
  }
  return null;
}
const left = handTip(0, PAD + Math.floor(src.w * 0.22)), right = handTip(PAD + Math.ceil(src.w * 0.78), w);

// Pola api 7 x 13, mengecil ke bawah. W inti putih, C biru muda, L biru, D biru tua, s percikan.
const FLAME = [
  '..WWW..', '.WWCWW.', '.CWCWC.', '.CCLCC.', '..CLC..', '.LCLCL.', '..LDL..',
  '..LDL..', '...D...', '..D.L..', '...D...', '.s...s.', '...D...',
];
const COLORS = { W: [242, 251, 255], C: [184, 230, 250], L: [118, 196, 238], D: [61, 143, 214], s: [184, 230, 250] };

const extra = FLAME.length;
const H2 = h + extra;
const out = Buffer.alloc(w * H2 * 4);
px.copy(out, 0, 0, w * h * 4);
for (const tip of [left, right]) {
  if (!tip) continue;
  FLAME.forEach((row, r) => [...row].forEach((ch, c) => {
    const col = COLORS[ch]; if (!col) return;
    const x = tip.x - 3 + c, y = tip.y + 1 + r;
    if (x < 0 || x >= w || y >= H2) return;
    const o = (y * w + x) * 4;
    if (out[o + 3] && y <= tip.y + 1) return; // jangan menimpa tangan
    out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; out[o + 3] = 255;
  }));
}
// Potong baris kosong di bawah.
let maxY = 0;
for (let y = 0; y < H2; y++) for (let x = 0; x < w; x++) if (out[(y * w + x) * 4 + 3]) maxY = y;
encode(file, w, maxY + 1, out.subarray(0, w * (maxY + 1) * 4));
console.log('tangan kiri', left, 'kanan', right, '->', `${w}x${maxY + 1}`);

// Bersihkan sisa non-karakter: bayangan lantai (ref2) dan semburan api (ref5), lalu potong ulang.
const { decode, encode } = require('./png.js');
const [, , file, rule] = process.argv;
const im = decode(file);
let { w, h, px } = im;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y * w + x) * 4; if (!px[i + 3]) continue;
  const r = px[i], g = px[i + 1], b = px[i + 2];
  let drop = false;
  if (rule === 'bayangan') drop = y > h * 0.8 && Math.abs(r - 66) < 12 && Math.abs(g - 79) < 12 && Math.abs(b - 98) < 12;
  if (rule === 'api') drop = y > h * 0.6 && b > 190 && g > 170 && r < 190;
  // Api di telapak tangan dipertahankan; hanya api di bawah kaki (kolom tengah) yang dibuang.
  if (rule === 'api-kaki') drop = y > h * 0.6 && x > w * 0.34 && x < w * 0.66 && b > 190 && g > 170 && r < 190;
  if (drop) px[i + 3] = 0;
}
// Buang piksel yatim (tanpa tetangga) yang tersisa, lalu potong rapat.
let minX = w, minY = h, maxX = -1, maxY = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y * w + x) * 4; if (!px[i + 3]) continue;
  const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => {
    const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && px[(ny * w + nx) * 4 + 3];
  }).length;
  if (n === 0) { px[i + 3] = 0; continue; }
  minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}
const ow = maxX - minX + 1, oh = maxY - minY + 1, out = Buffer.alloc(ow * oh * 4);
for (let y = 0; y < oh; y++) px.copy(out, y * ow * 4, ((y + minY) * w + minX) * 4, ((y + minY) * w + minX + ow) * 4);
encode(file, ow, oh, out);
console.log(file, `${w}x${h} -> ${ow}x${oh}`);

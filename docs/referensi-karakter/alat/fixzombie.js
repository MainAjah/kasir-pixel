// Perbaikan sprite zombie (ref8): buang sisa latar putih.
// - (9,20): piksel putih di bawah mulut, tertutup piksel lain sehingga tidak ikut terbuang
//   saat latar dibersihkan. Diwarnai ulang dengan merah gelap di sebelahnya (10,20).
// - Gugus putih di sela kaki (18..21, 32..34): latar yang terkurung, dibuat transparan.
const { decode, encode } = require('./png.js');
const [, , file] = process.argv;
const im = decode(file);
const { w, h, px } = im;
const at = (x, y) => (y * w + x) * 4;
const isWhite = (x, y) => { const i = at(x, y); return px[i + 3] && px[i] + px[i + 1] + px[i + 2] > 600; };

const log = [];
// 1. Wajah/dagu: warnai ulang dengan warna tetangga kanan.
if (isWhite(9, 20)) {
  const s = at(10, 20), d = at(9, 20);
  for (let k = 0; k < 4; k++) px[d + k] = px[s + k];
  log.push('(9,20) diwarnai ulang');
}
// 2. Semua piksel putih lain di badan bawah (baris >= 25): transparan.
for (let y = 25; y < h; y++) for (let x = 0; x < w; x++) if (isWhite(x, y)) { px[at(x, y) + 3] = 0; log.push(`(${x},${y}) transparan`); }

// Pastikan tidak tersisa piksel putih.
let left = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isWhite(x, y)) left++;
encode(file, w, h, px);
console.log(log.join(' '), '| sisa putih:', left);

# Referensi karakter diorama

Gambar karakter dari pemilik proyek, dipakai di diorama (keputusan revisi 3 dan 4 Tahap 5A).

| No | Berkas | Peran | Ukuran olahan | Catatan pengolahan |
| --- | --- | --- | --- | --- |
| 1 | `1-ninja-jubah-awan` | pelanggan | 20 × 46 | sel ±21,8 px (skala tidak bulat), latar abu dibuang |
| 2 | `2-pahlawan-bertopeng` | pelanggan | 42 × 56 | sel 10 px, latar biru dan bayangan lantai dibuang |
| 3 | `3-bajak-laut` | pelanggan | 35 × 48 | sel 23 px, latar putih dan garis stiker dibuang |
| 4 | `4-monster-kadal` | pelanggan | 46 × 52 | gambar tanpa grid tetap, dicuplik per 12 px; latar, bingkai, percikan, asap dibuang |
| 5 | `5-pahlawan-zirah` | pelanggan (melayang) | 37 × 46 | sel 26 px, latar gradasi dan api asli dibuang; **api biru di telapak tangan digambar ulang** (`alat/addflame.js`) |
| 6 | `6-bintang-laut` | pelanggan | 34 × 45 | sumber WebP (dikonversi lewat codec Windows); pola kristik: garis kisi, latar, dan tulisan watermark dibuang di tingkat sel |
| 7 | `7-ikan-oranye` | pelanggan | 28 × 26 | sel 23 px, latar putih dibuang |
| 8 | `8-zombie` | **penjaga kasir** | 27 × 41 | sel 23 px, latar putih dibuang; helai rambut dipertahankan (sambungan 8 arah); sisa latar putih yang terkurung dibersihkan (`alat/fixzombie.js`) |

- `asli/`: gambar sumber apa adanya.
- `olahan/`: karakter saja (latar transparan), satu piksel = satu piksel seni, warna asli.
- `alat/`: skrip Node tanpa paket tambahan:
  - `extract.js <sumber> <folder> <nama> [sel] [fase-x fase-y]`, dengan opsi lingkungan `NEAR_WHITE`, `CELL_BG`, `CONN8`;
  - `cleanup.js <png> <aturan>`;
  - `addflame.js <png>`;
  - `fixzombie.js <png>`: piksel putih di bawah mulut zombie diwarnai ulang, putih di sela kaki dibuat transparan.

**Hak cipta.** Karakter ini milik pemegang hak masing-masing, dan gambar sumbernya kemungkinan karya penggemar orang lain. Gambar no. 6 memuat nama pembuat pola ("Nattmi", t.me/nattmipin). Tulisan itu dibuang dari sprite, tetapi pembuatnya sebaiknya dicantumkan bila sprite dipakai. Aman untuk tugas kuliah dan demo di kelas. Jangan dipublikasikan atau dikomersialkan tanpa izin.

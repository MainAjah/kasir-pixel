# Rancangan diorama isometrik (Tahap 5A)

Status: **disetujui pemilik (revisi 5, 21 Nov 2026).** Rancangan ini menjadi acuan Tahap 5B sampai 5E.

- Gambar: `docs/diorama-rancangan.html` (buka langsung di browser).
- Visi pemilik: `docs/visi-diorama.md`.
- Referensi karakter: `docs/referensi-karakter/`.

Riwayat koreksi pemilik:

1. **Revisi 1:** papan atas rak berbeda warna dari lantai; pelanggan diberi aksesoris.
2. **Revisi 2:** karakter kostum bergaya anime dan tokusatsu, lukisan di dinding, lemari pendingin diganti vending machine.
3. **Revisi 3:**
   - karakter utama memakai **gambar dari pemilik** (latarnya dibuang), karakter lain dibuat sendiri;
   - kotak dan papan merah di kasir diganti **komputer kasir yang detail**;
   - semuanya dibuat sedetail mungkin, sehingga **resolusi dinaikkan 2×**.
4. **Revisi 4:**
   - tiga karakter baru dari gambar pemilik (bintang laut, ikan oranye, zombie), hanya karakternya;
   - pahlawan berzirah diberi **api biru di telapak tangan** dan melayang;
   - **penjaga kasir diganti zombie**;
   - **lantai dibuat lebih indah**, dengan tiga pilihan pola dan karpet antrean.
5. **Revisi 5:**
   - lantai ditetapkan: **kotak mint dan krem**;
   - dua piksel putih di wajah zombie dihapus. Penyebabnya kertas struk yang mencuat ke atas dari printer dan tergambar di depan wajah. Kini struk keluar dari celah depan printer ke arah pembeli;
   - sisa latar putih di sprite zombie dibersihkan: satu piksel di bawah mulut diwarnai ulang, gugus putih di sela kaki dibuat transparan.

Belum ada kode aplikasi. Keluaran Tahap 5A hanya dokumen ini, halaman HTML rancangan, dan folder referensi karakter.

## 1. Kanvas, tile, dan proyeksi

| Butir | Nilai |
| --- | --- |
| Kanvas dasar | **768 × 432 px** (16:9), diskalakan kelipatan bulat dengan `image-rendering: pixelated` (×1 = 768 × 432, ×2 = 1536 × 864) |
| Tile lantai | belah ketupat **64 × 32 px** (isometrik 2:1) |
| Grid toko | **12 × 9 tile** (`gx` 0..11 ke kanan-bawah, `gy` 0..8 ke kiri-bawah) |
| Proyeksi | `layarX = asalX + (gx − gy) × 32`, `layarY = asalY + (gx + gy) × 16`; asal di pojok belakang tile (0,0) |
| Tinggi dinding | 80 px, hanya dua dinding belakang; sisi depan terbuka |
| Tinggi karakter | ±45–56 px (karakter referensi), ±48 px (karakter buatan sendiri) |

**Alasan resolusi dinaikkan:** gambar referensi pemilik aslinya berukuran 20–46 × 45–56 piksel seni. Pada kanvas lama (384 × 216, tile 32 × 16), karakter itu dua kali lebih tinggi dari dinding. Menyusutkannya akan menghapus detail yang justru diminta. Dengan resolusi 2×, perbandingan karakter, rak, dan dinding tetap sama seperti rancangan awal, dan perabot (komputer, vending machine, rak) bisa digambar lebih detail.

**Konsekuensi:** sprite buatan sendiri (penjaga dan karakter tambahan) harus digambar ulang di 5C pada ukuran ±32 × 48. Di halaman rancangan, karakter itu masih tampil ×2 dari grid 16 × 24. Semua posisi digambar pixel-snap.

## 2. Denah (grid 12 × 9)

```
 gy\gx 0  1  2  3  4  5  6  7  8  9 10 11      dinding belakang kanan = di atas baris gy=0
   0   Tn .  .  .  .  .  .  Vm Vm Vm .  .      Tn tanaman, Vm vending machine (3 unit)
   1   .  .  .  .  .  .  .  .  .  .  .  .      lorong belakang (beli di vending dari gy=1)
   2   .  .  RA RA RA RA RA .  .  K2s .  .     RA rak A (5 tile); K2s kursi kasir 2
   3   .  .  .  .  .  .  .  .  .  K2 K2 .      lorong tengah; K2 meja kasir 2 (komputer mati, TUTUP)
   4   .  .  RB RB RB RB RB .  .  .  .  .      RB rak B (5 tile)
   5   .  .  .  .  .  .  .  .  .  P  .  Tn     P penjaga kasir 1
   6   Pi .  .  .  .  .  .  .  .  K1 K1 .      K1 meja kasir 1 (komputer menyala)
   7   Pi .  .  .  .  A4 A3 A2 A1 L  .  .      L titik dilayani; A1..A4 antrean
   8   .  .  .  .  .  .  .  .  .  .  .  .      lajur keluar
 dinding belakang kiri = di kiri kolom gx=0; Pi = pintu kaca (gy 6..7)
```

- **Pintu**: pintu kaca berbingkai kayu di dinding kiri (`gy` 6–7) dengan keset hijau. Pelanggan muncul dari luar (`gx = −1`) dan masuk ke (0,7).
- **Rak A dan B**: masing-masing 5 tile searah `gx`. Sisi menghadap penonton (`+gy`) memajang barang. Titik ambil `(2..6, 3)` dan `(2..6, 5)`.
- **Vending machine**: 3 unit (merah, biru, hijau) di `gx` 7..9, `gy` 0. Pelanggan berdiri di `(7..9, 1)`.
- **Kasir 1 (aktif)**: meja `(9,6)–(10,6)`, penjaga di `(9,5)`, pelanggan dilayani di `(9,7)`.
- **Kasir 2 (tutup)**: meja `(9,3)–(10,3)` dengan komputer mati bertuliskan "TUTUP", bangku kosong di `(9,2)`.
- **Antrean**: `(9,7)` lalu `(8,7) (7,7) (6,7) (5,7)`, paling banyak 5 pelanggan; kelebihan jadi "+N".
- **Karpet antrean**: karpet terakota bermotif zig-zag kunyit dengan pinggiran krem, di bawah titik dilayani dan antrean (`gx` 5..9, `gy` 7).
- **Lajur keluar**: baris `gy = 8`, lalu `(0,7)` dan keluar lewat pintu.
- **Hiasan**:
  - tanaman pot di `(0,0)` dan `(11,5)`;
  - jam dinding dan jendela (langit siang atau malam) di dinding kanan;
  - **4 lukisan berbingkai kayu dan list emas**: gunung dan sawah, laut senja (dinding kanan); buah, bunga dalam vas (dinding kiri).
- **Tile terlarang**: rak, vending machine, kedua meja kasir, area penjaga `(9..11, 5)`, `(9..11, 2)`.

## 3. Jalur jalan pelanggan

- Gerak 4 arah sepanjang sumbu grid, tile ke tile, kecepatan ±2 tile per detik, posisi di-pixel-snap.
- Jalur dicari dengan BFS. Jalur contoh di halaman rancangan dihitung dari denah ini sendiri, jadi denah tidak buntu.
- **Arah hadap:**
  - Karakter buatan sendiri punya gambar hadap depan dan belakang; dua arah lain hasil cermin.
  - Karakter referensi hanya punya satu pose, jadi arah kiri dan kanan hasil cermin, dan arah belakang memakai pose yang sama.
- Satu tile hanya ditempati satu pelanggan yang berhenti.

## 4. State machine

**Pelanggan**

| State | Masuk saat | Keluar ke |
| --- | --- | --- |
| `muncul` | ada transaksi baru (`sale.opened`) atau pelanggan latar | `masuk` |
| `masuk` | berjalan dari luar pintu ke (0,7) | `ke_rak` |
| `ke_rak` | berjalan ke titik ambil acak (rak atau vending machine) | `ambil` |
| `ambil` | animasi mengambil 1 detik; di vending machine: koin masuk, kaleng jatuh | `ke_rak` (1–2 kali) atau `ke_antrean` |
| `ke_antrean` | berjalan ke slot antrean kosong terakhir | `antre` |
| `antre` | menunggu; maju saat slot di depan kosong | `dilayani` |
| `dilayani` | di titik `(9,7)` | `dipindai` |
| `dipindai` | satu pindai per `item.scanned` | `bayar` saat `sale.completed` |
| `bayar` | koin ke laci uang, struk keluar dari printer | `ambil_kantong` |
| `ambil_kantong` | kantong berpindah ke pelanggan | `keluar` |
| `keluar` | berjalan lewat lajur keluar ke pintu | hilang |
| `kabur` | transaksi ditinggalkan tanpa dibayar saat pelanggan sudah membawa barang (sudah mengambil dari rak atau sedang di kasir); berlari ×2,5 lewat lajur keluar | hilang |

- **Kejar ketinggalan:** bila `sale.completed` datang saat pelanggan masih di jalan, ia berjalan ×3 ke kasir.
- **Pelanggan latar:** paling banyak 2, berkeliling tanpa antre atau bayar. Mereka hanya melihat-lihat rak dan tidak membawa barang keluar (karena itu tidak pernah dikejar).
- **Tidak membayar** (ditambahkan setelah 5B atas permintaan pemilik):
  - Pemicu: transaksi terbuka ditinggalkan, yaitu transaksi baru dibuka sebelum yang lama dibayar, atau tombol uji "Kabur tanpa bayar".
  - Pelanggan yang sudah membawa barang `kabur` dan dikejar penjaga; yang belum mengambil apa-apa keluar biasa.
  - Pembatalan (`sale.voided`) tidak memicu kejaran, karena uangnya sudah diterima lalu dikembalikan.
- **Gerak karakter referensi** (satu pose): ayunan naik-turun 1–2 piksel saat berjalan dan sedikit miring saat mengambil barang. Tidak ada animasi kaki kecuali pemilik menyediakan pose tambahan.

**Penjaga kasir 1**

| State | Pemicu | Animasi |
| --- | --- | --- |
| `diam` | bawaan | berkedip |
| `menyapa` | pelanggan tiba di `(9,7)` | mengangguk |
| `pindai` | tiap `item.scanned` | lengan menyapu, garis laser merah di scanner datar berkedip, bip opsional |
| `bungkus` | setelah pindai | barang masuk kantong |
| `terima_koin` | `sale.completed` | laci uang terbuka, struk keluar, layar pelanggan menampilkan total |
| `batal` | `sale.voided` | geleng, gelembung "×", total harian turun |
| `mengejar` | pelanggan `kabur` | keluar dari balik meja lewat (8,5), berlari 4 tile/detik (lebih lambat dari yang kabur, jadi tidak tertangkap) sampai pintu (0,7), gelembung "!!" |
| `di_pintu` | tiba di pintu | berhenti 1,5 detik menghadap pintu, menggeleng, gelembung "!!" |
| `kembali` | setelah berhenti | berjalan pulang ke (9,5), lalu menghadap pembeli lagi dan `diam` |

Selama `mengejar`, `di_pintu`, dan `kembali`, kasir tidak melayani: pembeli di titik dilayani menunggu, dan aksi kasir yang belum diputar dibuang. Pelanggan lain yang kabur saat penjaga belum kembali tidak memicu kejaran baru.

## 5. Daftar sprite

| Sprite | Ukuran (px) | Frame | Catatan |
| --- | --- | --- | --- |
| Lantai | 64×32 | 2 varian (selang-seling) | **kotak mint dan krem** (dipilih pemilik): bergantian seperti papan catur, garis kilau terang di tepi belakang, nat. Di 5C memakai warna palet: krem `#f7f1e3` dan hijau daun `#a7d7a5`, nat `#efe2c4`; ditambah alas diorama 6 px di tepi depan lantai (hijau) |
| Karpet antrean | 160×32 (5 tile) | 1 | terakota, pinggiran krem, motif zig-zag kunyit |
| Dinding kiri / kanan per tile | 32×80 | 1 | diubah di 5C (pilihan pemilik): dinding kiri lavender `#c9b6e4`, dinding kanan biru langit `#9fd3e6`, list atas putih, plint hijau |
| Pintu kaca | 64×80 (2 tile) | 1 | bingkai kayu, kaca dengan pantulan, gagang dorong, keset hijau bergaris |
| Rak per tile | 64×64 (badan 32 px) | 1 | sisi kayu, **papan atas krem berbingkai kayu** (beda dari lantai), 3 tingkat papan, barang beraneka tinggi dan warna dengan kilau dan label, label harga; isi 4 tingkat menurut stok |
| Vending machine per unit | 60×106 (badan 76 px) | 2 | papan nama "MINUM", kaca dengan 5 baris kaleng (isi menurut stok) dan pantulan, layar harga, tombol, lubang koin dan uang kertas, pintu ambil, garis warna di sisi; 3 warna badan; kaca menyala saat malam |
| Meja kasir per tile | 64×60 (badan 28 px) | 1 | atas putih, panel depan oranye kunyit bergaris, plint gelap |
| **Komputer kasir 1** | di atas meja | diam, pindai, bayar | monitor kasir dilihat dari belakang (ventilasi, lampu daya), keyboard bertuts, scanner datar tertanam di belakang meja di depan penjaga (di 5C dipindah agar tidak tertutup layar) dengan laser bata pastel yang berkedip dan barang yang meluncur saat memindai, scanner genggam dengan LED "bip", laci uang, printer struk yang mengeluarkan struk saat membayar (dari celah depan, tidak menutupi wajah penjaga), tumpukan kantong, **layar mini**: total harian (hijau, menghitung naik/turun) dan total belanja saat membayar (kuning) |
| **Komputer kasir 2** | di atas meja | 1 | sama, dalam keadaan mati; layar pelanggan gelap bertuliskan "TUTUP" |
| Bangku kasir 2 | 32×32 | 1 | dudukan lavender, kaki logam |
| Laser | 16×2 | 3 | |
| Huruf layar | 3×5 | angka, titik, dan huruf T U P M I N R B K A S O | untuk layar pelanggan, papan nama, dan "+N"; miring mengikuti sisi benda; tanpa teks kanvas |
| Tanaman | 28×40 | 1 | pot terakota, daun berlapis dua warna |
| Jam, jendela | 12×12, 26×28 | 1 (jendela 2: siang/malam) | jendela: bingkai silang, langit, awan, pohon; malam: gelap berbintang |
| Lukisan | 26×20, 26×18, 22×20, 18×22 | 1 | gunung dan sawah, laut senja, buah, bunga; bingkai kayu + list emas |
| Pelanggan referensi | 20–46 × 45–56 | 1 pose + cermin | 5 karakter dari gambar pemilik, warna asli (lihat bagian 6) |
| Pelanggan buatan sendiri | ±32×48 | diam 2 + jalan 4 + ambil 2, × 2 hadap | disusun dari lapisan badan, rambut, kostum; digambar ulang detail di 5C |
| Penjaga kasir | 27×41 | 1 pose + cermin | **zombie dari gambar pemilik**; animasi pindai, angguk, dan geleng memakai ayunan atau miring karena hanya satu pose |
| Kotak barang, kantong, koin | 12×12, 16×16, 12×12 | 1, 1, 3 | |
| Gelembung "×" dan "+N" | 24×20 | 1 | |

Perabot, toko, dan karakter buatan sendiri disimpan sebagai **grid indeks palet** di berkas TypeScript, lalu dirender sekali ke kanvas cadangan. Karakter referensi disimpan sebagai PNG kecil hasil olahan (bagian 6). Di 5C, kerja dimulai dari satu karakter dan satu rak dulu (visi).

## 6. Karakter

**Dari gambar pemilik (revisi 3).** Latar, bayangan, dan efek dibuang; piksel dikembalikan ke grid aslinya dengan skrip Node tanpa paket tambahan (`docs/referensi-karakter/alat/`).

| No | Karakter | Ukuran olahan | Dibuang |
| --- | --- | --- | --- |
| 1 | Ninja berjubah awan merah | 20 × 46 | latar abu |
| 2 | Pahlawan bertopeng putih-merah | 42 × 56 | latar biru, bayangan lantai |
| 3 | Bajak laut berompi merah | 35 × 48 | latar putih, garis stiker |
| 4 | Monster kadal raksasa | 46 × 52 | latar, bingkai, percikan, asap (gambar ini tanpa grid tetap, dicuplik per 12 px) |
| 5 | Pahlawan berzirah merah-emas | 37 × 46 | latar gradasi dan api asli; **api biru di kedua telapak tangan digambar ulang**; di diorama melayang 10 px dengan bayangan di lantai |
| 6 | Bintang laut merah muda | 34 × 45 | sumber WebP berpola kristik: garis kisi, latar, dan tulisan watermark |
| 7 | Ikan oranye bersepatu | 28 × 26 | latar putih |
| 8 | Zombie (**penjaga kasir**) | 27 × 41 | latar putih, termasuk sisa latar yang terkurung (1 piksel di bawah mulut diwarnai ulang, sela kaki dibuat transparan); helai rambut dipertahankan |

- **Pengecualian:** karakter ini memakai **warna aslinya** (di luar palet pastel) dan bukan buatan Claude Code. Ini menyimpang dari aturan sprite di `CLAUDE.md` atas permintaan pemilik.
- **Satu pose saja:** arah kiri dan kanan memakai cermin; gerak jalan berupa ayunan. Bila pemilik menyediakan pose belakang atau pose jalan, bisa ditambahkan dengan skrip yang sama.

**Buatan sendiri.** Penyihir, samurai pengembara, gadis penyihir, dan robot (penjaga buatan sendiri diganti zombie di revisi 4). Semuanya disusun dari lapisan (badan, rambut, kostum, aksesoris, barang bawaan), dipilih dari nomor penjualan agar pelanggan yang sama selalu terlihat sama.

**Hak cipta.** Karakter referensi milik pemegang hak masing-masing, dan gambarnya kemungkinan karya penggemar orang lain (gambar no. 6 memuat nama pembuat polanya). Ini aman untuk tugas kuliah dan demo di kelas. Jangan dipublikasikan atau dikomersialkan, dan cantumkan sumber gambar bila diketahui (`docs/referensi-karakter/README.md`).

## 7. Palet 24 warna pastel

| # | Hex | Peran |
| --- | --- | --- |
| 1 | `#2b2a33` | garis tepi gelap |
| 2 | `#5b5470` | bayangan |
| 3 | `#8f88a8` | abu lavender (logam) |
| 4 | `#fdf8f0` | sorotan |
| 5 | `#f7f1e3` | krem terang |
| 6 | `#efe2c4` | dinding krem |
| 7 | `#d9c7a3` | lantai terang |
| 8 | `#c4ad86` | lantai gelap |
| 9 | `#a7d7a5` | hijau daun pastel |
| 10 | `#6fae7b` | hijau tua |
| 11 | `#ffe9a8` | kuning lampu |
| 12 | `#f6c56b` | oranye kunyit |
| 13 | `#e89b4f` | kunyit gelap |
| 14 | `#e8907e` | merah bata pastel |
| 15 | `#c2675a` | bata gelap |
| 16 | `#f4b6c2` | merah muda |
| 17 | `#c9b6e4` | lavender |
| 18 | `#9fd3e6` | biru langit, kaca |
| 19 | `#6a9fc4` | biru tua |
| 20 | `#7a5c4b` | kayu, rambut |
| 21 | `#f2c9a5` | kulit terang |
| 22 | `#c98e6a` | kulit sedang |
| 23 | `#8d5a3f` | kulit gelap |
| 24 | `#3a3d6b` | biru malam |

Dipakai untuk toko, perabot, dan karakter buatan sendiri. Karakter referensi memakai warna aslinya.

## 8. Aturan urutan gambar (kedalaman)

1. **Lantai**, lalu keset dan bayangan lantai.
2. **Dinding belakang** beserta lukisan, jam, dan jendela.
3. **Objek dan aktor** diurutkan menurut `gx + gy` titik pijak.
   - Objek multi-tile dipotong per tile.
   - Benda di atas meja (komputer dan lainnya) digambar bersama potongan mejanya, jadi selalu di depan penjaga kasir. Benda yang tinggi di meja tidak boleh menutupi wajah penjaga (pelajaran revisi 5: kertas struk).
   - Aktor bergerak memakai kedalaman pecahan.
   - Seri: furnitur dulu, lalu aktor, lalu `gx` kecil dulu.
   - Efek memakai kedalaman pemiliknya + 0,1.
4. **Lapisan malam**.
5. **Lapisan menyala**: layar komputer, kaca vending machine, jendela.
6. **Antarmuka** ("+N"). Tombol mute dan hemat daya ada di HTML, di luar kanvas.

## 9. Hubungan ke data

| Peristiwa (`resources/js/lib/store-events.ts`) | Di diorama |
| --- | --- |
| `sale.opened` | pelanggan baru muncul (bila sudah 5, tambah "+N") |
| `item.scanned` | dipindai di scanner datar, laser berkedip, masuk kantong |
| `sale.completed` | koin ke laci, struk keluar, layar pelanggan menampilkan total, pelanggan keluar; total harian naik |
| `sale.voided` | penjaga menggeleng, gelembung "×", total harian turun |

- **Sumber peristiwa** (D2): keadaan awal dari server ditambah polling baca-saja tiap 10 detik sampai Reverb di Tahap 8. Langsung `onStoreEvent` bila diorama ada di halaman yang sama dengan pemancar. Diorama tidak pernah menulis data.
- **Stok nyata** (D4): 10 potongan rak dan 3 vending machine diisi produk aktif. Kategori yang namanya mengandung "minum" masuk vending machine, sisanya rak. Tingkat isi rak (kosong, sedikit, setengah, penuh) dan jumlah kaleng (0 sampai 5 per baris) dihitung dari stok ledger dan `min_stock`.
- **Siang dan malam**: jam browser (WIB). Siang 06–17, senja 17–19, malam 19–06.
- **Interaksi**: klik pelanggan menampilkan belanjaannya. Uji kena memakai kotak sprite masing-masing; karakter referensi punya ukuran berbeda-beda.

## 10. Kinerja dan mode hemat

- **Batas 30 FPS.** Loop berhenti saat tab tersembunyi.
- **Perabot statis dirender sekali** ke kanvas latar; tiap frame hanya aktor dan efek yang digambar ulang. Ini penting karena resolusi kini 2×.
- **Mode statis** bila salah satu berlaku:
  - `prefers-reduced-motion`;
  - tombol hemat daya;
  - lebar wadah < 768 px. Pada layar sempit, kanvas tetap 768 × 432 dan diperkecil (bukan skala bulat) dalam mode statis.
- **Bunyi 8-bit**: mati secara bawaan, ada tombol mute.

## 11. Keputusan

| Kode | Keputusan | Status |
| --- | --- | --- |
| D1 | Teknologi gambar | Canvas 2D (tanpa paket baru), disetujui |
| D2 | Sumber peristiwa di dasbor | keadaan awal + polling 10 detik, disetujui |
| D3 | Pelanggan latar | paling banyak 2, disetujui |
| D4 | Pemetaan produk | kategori "minum" ke vending machine, disetujui |
| D5 | Ukuran kanvas | **diubah di revisi 3: 768 × 432, tile 64 × 32**, disetujui |
| D6 | Karakter referensi | gambar pemilik (8 karakter, termasuk zombie sebagai penjaga kasir), warna asli, satu pose + cermin, untuk tugas saja (bukan publikasi), disetujui |
| D7 | Pola lantai dan warna ruangan | **kotak mint dan krem** dengan karpet antrean terakota, **dipilih pemilik** di revisi 5; di 5C pemilik memilih skema **langit dan lavender** untuk dinding (hanya palet 24), disetujui |

## 12. Risiko

| Risiko | Penanganan |
| --- | --- |
| Urutan kedalaman salah untuk objek panjang | objek dipotong per tile; contoh di halaman rancangan; diuji di `/diorama-lab` (5C) |
| Pratinjau menampilkan 8 pelanggan sekaligus, melebihi batas 5 | hanya untuk pratinjau; saat berjalan paling banyak 5 pelanggan, sisanya "+N" |
| Karakter referensi hanya satu pose | cermin + ayunan; pose tambahan bisa diolah dengan skrip yang sama bila pemilik menyediakan |
| Gaya campur (karakter referensi detail, karakter buatan sendiri ×2) | karakter buatan sendiri digambar ulang ±32 × 48 di 5C |
| Warna karakter referensi di luar palet pastel | diterima sebagai pengecualian; malam tetap memakai lapisan yang sama |
| Hak cipta karakter dan karya penggemar | hanya untuk tugas dan demo kelas; tidak dipublikasikan; sumber dicatat |
| Beban gambar naik di resolusi 2× | latar statis dirender sekali, 30 FPS, mode statis |
| Pelanggan di lorong tertutup rak | rak rendah (32 px) sehingga kepala dan badan tetap terlihat |
| Waktu pembuatan sprite membengkak | mulai 1 karakter + 1 rak; jalur mundur ke tampak samping atas persetujuan pemilik |

## 13. Rencana berkas untuk 5B sampai 5E (belum dibuat)

- `resources/js/diorama/engine/`: proyeksi iso, loop, kedalaman, BFS, adaptor `DioramaFeed`, antrean.
- `resources/js/diorama/actors/`: pelanggan dan penjaga sebagai state machine.
- `resources/js/diorama/scenes/store-scene.ts`: denah sebagai data.
- `resources/js/diorama/sprites/`: palet, grid perabot, karakter buatan sendiri.
- `resources/js/diorama/sprites/referensi/`: 8 PNG olahan dari `docs/referensi-karakter/olahan/`.
- Komponen React `components/diorama/diorama-canvas.tsx`.
- Endpoint keadaan dan polling di 5D.

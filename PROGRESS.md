# PROGRESS

## Tahap 5C: Sprite dan animasi (21 Nov 2026, berjalan)

Dikerjakan satu elemen per langkah, masing-masing diperlihatkan di `/diorama-lab` dengan perbesaran 4× dan menunggu persetujuan pemilik. Elemen yang belum disetujui masih kotak pengganti dari 5B.

### Langkah 1: pelanggan dan potongan rak (disetujui)

- **Palet:** `sprites/palette.ts` berisi 24 warna rancangan. Semua sprite buatan kode hanya memakai warna ini (dites).
- **Infrastruktur:**
  - `sprites/pixels.ts`: sprite sebagai matriks piksel murni, grid huruf → peran warna, cermin.
  - `sprites/sprite-cache.ts`: dilukis sekali ke kanvas cadangan, lalu dipakai ulang tiap bingkai.
- **Pelanggan buatan kode** `sprites/customer-sprite.ts` (bingkai 26 × 46, tinggi tokoh ±42):
  - depan dan belakang; diam (2 bingkai), jalan (4), lari (4), ambil barang (2);
  - arah kanan dan kiri lewat cermin;
  - variasi lewat tukar palet kulit (3), rambut (7), baju (7), celana (4).
  - Di diorama, lari dipakai saat kabur dan kejar ketinggalan.
- **Potongan rak** `sprites/rack-sprite.ts`: dipindahkan dari rancangan 5A yang disetujui, dengan isi 4 tingkat (kosong, sedikit, setengah, penuh). Di diorama sementara penuh; isi menurut stok di 5D.
- **Lab:** `components/diorama/sprite-lab.tsx` menampilkan pratinjau 4×. Di diorama, pelanggan dan rak sudah memakai sprite.
- **Tes:** 14 tes sprite baru (`sprites/sprites.test.ts`); seluruhnya 81 tes Vitest lulus.

### Langkah 2: karakter dari gambar pemilik (disetujui)

- **Gambar dipakai apa adanya.** Kedelapan PNG olahan disalin ke `sprites/referensi/` (sama persis dengan `docs/referensi-karakter/olahan/`), tidak dijadikan kostum dan tidak digambar ulang.
- **Cara 1, transformasi saja** (`sprites/reference-sprite.ts`):
  - naik-turun, memipih dan memanjang (skala tetangga-terdekat, tetap tajam), miring per baris, cermin, dan bayangan di lantai;
  - titik pijak dari letak kaki sebenarnya;
  - profil gerak per karakter: langkah (ninja, pahlawan bertopeng, bajak laut), hentak (monster), seret (zombie), memantul pelan (bintang laut), lompat (ikan), melayang (pahlawan berzirah);
  - jumlah bingkai sama dengan pelanggan buatan kode.
- **Pemuat gambar:** `sprites/reference-loader.ts` membaca PNG lewat Vite ke matriks piksel, sekali saja.
- **Penjaga kasir = zombie:** diam di meja, lari saat mengejar, jalan saat pulang; angguk dan geleng lewat geser kecil.
- **Calon cara 2** bila nanti terlihat kaku: bajak laut dan pahlawan bertopeng (kaki terlihat).
- **Pelanggan di diorama:** ketujuh karakter bergiliran menurut nomor pelanggan, dan setiap giliran kedelapan pelanggan buatan kode.
- **Arah hadap (koreksi pemilik):**
  - arah asli tiap gambar diperiksa ulang: ninja, pahlawan bertopeng (sedikit menoleh), bajak laut, dan berzirah ke kanan; monster, ikan, bintang laut (wajah di sisi kiri kepala), dan zombie ke kiri; semua dicermin mengikuti arah jalan;
  - bintang laut memantul pelan dengan sedikit condong ke depan (goyangan kiri-kanan sebelumnya terlihat seperti jeli);
  - saat berjalan, arah tampilan mengikuti tujuan jalur, bukan tiap langkah, supaya tidak berbalik bolak-balik di jalur bertangga; saat berdiri menghadap kasir atau rak.
- **Hasil pemeriksaan:**
  - **Ukuran:** tinggi 26 sampai 56 px; pelanggan buatan kode 42 px. Pahlawan bertopeng dan monster sekitar 1,3× lebih besar; dibiarkan, karena mengecilkan pixel art dengan skala tidak bulat merusak gambarnya.
  - **Warna:** tidak ada yang tepat di palet 24 (82 sampai 1.104 warna, kebanyakan derau). Dipaksa ke palet merusak identitas (zombie jadi ungu), jadi tetap warna asli sesuai pengecualian D6.
- **Lab:** `components/diorama/reference-lab.tsx` (pratinjau 4×, perbandingan ukuran dan warna) dan `components/diorama/sprite-cells.tsx` (kerangka pratinjau bersama).
- **Tes:** 14 tes baru (`sprites/reference.test.ts`); seluruhnya 95 tes Vitest lulus.

### Elemen: lantai, dinding, dan pintu (disetujui)

- **Bentuk dari rancangan 5A** (`sprites/room-sprite.ts`):
  - lantai kotak mint dan krem dengan nat dan garis kilau;
  - karpet antrean terakota bermotif zig-zag kunyit dan keset hijau bergaris;
  - dua dinding belakang setinggi 80 px dengan list atas dan plint;
  - pintu kaca berkusen kayu dengan pantulan dan gagang dorong.
- **Tambahan:** alas diorama setebal 6 px di tepi depan lantai, supaya ruangan terbaca sebagai potongan diorama.
- **Warna, pilihan pemilik dari tiga skema:**
  - dipilih **langit dan lavender**: dinding lavender (berpintu) dan biru langit, list putih, plint dan alas hijau, lantai mint memakai hijau palet;
  - hanya palet 24 (dites);
  - dinding krem dan krem kecokelatan dari 5A diganti karena terlalu cokelat untuk visi "ceria dan pastel".
- **Diorama:** latar (lantai dan dinding) dirender sekali dari sprite ini. Lab menampilkan potongan 4× (sudut pintu; sudut depan dengan karpet dan alas).
- **Tes:** 4 tes baru (`sprites/room.test.ts`); seluruhnya 106 tes Vitest lulus.

### Elemen: meja kasir, scanner, dan layar mini (disetujui)

- **Bentuk dari rancangan 5A** (`sprites/counter-sprite.ts`):
  - **kasir 1:** monitor dari belakang, keyboard bertuts, scanner datar, scanner genggam, laci uang, printer struk, kantong terlipat, layar mini;
  - **kasir 2:** tutup, layar "TUTUP"; bangku kosong.
  - Hanya palet 24 warna (dites).
- **Hidup mengikuti penjaga:**
  - laser berkedip dan barang kecil meluncur di atas kaca saat memindai, dengan garis laser melintang di barang;
  - LED scanner genggam berkedip lalu hijau ("bip");
  - struk keluar saat membayar.
- **Layar mini:**
  - hijau = total harian, menghitung naik atau turun mengikuti total nyata; kuning = total belanja sesaat saat membayar;
  - jutaan disingkat (1,2JT, 12,5JT, 125JT) agar paling banyak 7 karakter.
- **Gerak zombie di meja (cara 1):** menyapa (membungkuk), pindai (condong ke scanner), bungkus (menoleh ke kantong), terima koin (meraih), batal dan di pintu (menggeleng). Penjaga kini punya penanda kemajuan aksi (`Cashier.progress`).
- **Perubahan dari 5A:**
  - scanner datar dipindah ke belakang meja di depan penjaga, karena di posisi lama tertutup layar mini;
  - laser bata pastel dengan pendar merah muda (palet tidak punya merah terang);
  - tulisan "HARI INI" di pojok diorama dihapus karena total harian kini di layar mini.
- **Lab:** `components/diorama/counter-lab.tsx`, pratinjau 4×: siklus melayani, pembatalan, kasir tutup, contoh angka layar.
- **Tes:** 9 tes baru (`sprites/counter.test.ts`); seluruhnya 115 tes Vitest lulus.

### Elemen: vending machine (disetujui)

- **Bentuk dari rancangan 5A** (`sprites/vending-sprite.ts`):
  - tiga mesin (merah, biru, hijau) di depan dinding;
  - papan nama "MINUM", kaca dengan lima baris rak dan pantulan, panel tombol dengan layar harga, lubang koin dan uang kertas, pintu ambil, pelat bawah.
- **Botol, isi empat tingkat:** kaleng dari 5A diganti botol (tutup, badan berwarna, label). Isinya 0, 1, 3, atau 5 botol per baris untuk kosong, sedikit, setengah, penuh. Di diorama sementara penuh; isi menurut stok di 5D.
- **Lampu berkedip pelan:** papan nama, lampu di atas kaca, dan layar harga berganti menyala (kuning lampu) dan redup (krem) tiap 1,2 detik, dengan fase berbeda tiap mesin.
- Hanya palet 24 warna. Kaca versi malam dari 5A tidak dipakai (siang dan malam di 5D).
- **Lab:** `components/diorama/vending-lab.tsx`, pratinjau 4× dengan latar dinding biru langit: tiga mesin berjajar dan empat tingkat isi.
- **Tes:** 4 tes baru (`sprites/vending.test.ts`); seluruhnya 119 tes Vitest lulus.

### Elemen: barang bawaan, kantong, dan koin (disetujui)

- **Barang bawaan** (`sprites/goods-sprite.ts`):
  - kotak kecil bertutup terang; warnanya dari nama produk (FNV-1a dengan pengaduk akhir), jadi produk yang sama selalu berwarna sama;
  - melayang dari papan rak (atau pintu ambil vending machine) ke tangan saat diambil, lalu bertumpuk di tangan dan ikut naik-turun badan;
  - berkurang satu per satu saat dipindai; barang di scanner berwarna sesuai produk yang sedang dipindai.
- **Kantong belanja:** kertas cokelat muda dengan tali dan logo daun hijau. Setelah membayar, kantong melayang dari tumpukan di meja ke tangan, lalu dibawa pulang.
- **Koin:** berputar 4 bingkai (muka, miring, tepi, miring) sambil melengkung terbang dari tangan ke laci uang; berkilau saat mendarat.
- **Tangan:** letak tangan ke arah hadap, setinggi pinggang; untuk karakter dari gambar pemilik mengikuti ukuran gambarnya.
- Hanya palet 24 warna (dites).
- **Lab:** `components/diorama/goods-lab.tsx`, pratinjau 4×: warna per produk, mengambil dari rak, meluncur di scanner, kantong ke tangan, koin terbang, bingkai putaran koin.
- **Tes:** 8 tes baru (`sprites/goods.test.ts`); seluruhnya 127 tes Vitest lulus.

---

## Tahap 5B: Mesin diorama (21 Nov 2026)

Status: **selesai, disetujui pemilik.** Tidak ada paket baru: tes JavaScript memakai Vitest yang sudah ikut di dalam `vite-plus` (`vite-plus/test`).

### Yang sudah selesai

- **Mesin murni** di `resources/js/diorama/` (tanpa DOM, bisa dites):
  - `engine/iso.ts`: proyeksi isometrik (kanvas 768 × 432, tile 64 × 32, asal (336, 88)), pixel-snap, arah hadap.
  - `engine/grid.ts`: BFS 4 arah dengan urutan tetangga tetap.
  - `engine/depth.ts`: urutan gambar menurut `gx + gy`; seri perabot → aktor → efek → `gx` kecil; objek panjang dipotong per tile; efek +0,1.
  - `engine/queue.ts`: antrean 5 slot, slot 0 = titik dilayani (9,7); yang di belakang maju saat depan keluar.
  - `engine/feed.ts`: `DioramaFeed` menormalkan peristiwa (rupiah bulat, jumlah ≥ 1, yang cacat dibuang), membuang penjualan selesai atau batal yang sama bila datang dua kali, dan `connect(onStoreEvent)` untuk berlangganan pemancar browser.
  - `engine/world.ts`: `DioramaWorld` menyatukan semuanya: maksimal 5 pelanggan tampil, sisanya "+N"; maksimal 2 pelanggan latar; latar memberi tempat bila toko penuh; reservasi titik ambil; total harian; layar pelanggan.
  - `engine/loop.ts`: loop 30 FPS lewat `requestAnimationFrame`, berhenti saat tab tersembunyi, langkah dibatasi 0,1 detik.
  - `actors/customer.ts`: state machine pelanggan sesuai rancangan (`muncul` → `masuk` → `ke_rak` ⇄ `ambil` → `ke_antrean` → `antre` → `dilayani` → `dipindai` → `bayar` → `ambil_kantong` → `keluar` → `hilang`), kejar ketinggalan ×3, lajur keluar gy = 8.
  - `actors/cashier.ts`: penjaga kasir (`diam`, `menyapa`, `pindai`, `bungkus`, `terima_koin`, `batal`) dengan antrean aksi terbatas.
  - `scenes/store-scene.ts`: denah sebagai data (perabot, titik ambil, slot antrean, pintu, area penjaga).
- **Renderer gambar pengganti** `render/placeholder-renderer.ts` dan `render/pixel.ts`: kotak isometrik berwarna untuk lantai (kotak mint dan krem, D7), dinding dengan pintu, rak, vending machine, meja kasir, bangku, tanaman, pelanggan, dan penjaga; laser scanner, koin, gelembung "×", "+N", layar pelanggan, total harian. Lantai dan dinding dirender sekali ke kanvas latar.
- **React:** `components/diorama/diorama-canvas.tsx` (skala bulat menurut lebar wadah, `image-rendering: pixelated`) dan `components/diorama/use-diorama.ts` (membuat dunia dan adaptor, berlangganan `onStoreEvent`).
- **Halaman `/diorama-lab`** (hanya admin, menu "Diorama lab"):
  - tombol uji: pelanggan baru, pindai barang, bayar, batalkan, pelanggan latar, pesanan lengkap, 7 pesanan sekaligus;
  - pilihan: latar otomatis, jalur pelanggan, tile terlarang, nomor pelanggan;
  - panel keadaan: penjaga, antrean, "+N", total harian, layar pelanggan, tabel pelanggan.
  - Tombol uji memasukkan peristiwa palsu langsung ke `DioramaFeed`, tidak lewat `emitStoreEvent`, jadi tidak ada yang dikirim ke server dan tidak ada data yang ditulis.
- **Tes:**
  - 56 tes Vitest untuk logika murni (`npx vp test`): BFS dan denah, kedalaman, antrean, adaptor, jam bingkai, penjaga, dan state machine lewat dunia (alur lengkap, kejar, batas 5 dan "+N", latar, batal, tile terlarang).
  - 4 tes Pest akses `/diorama-lab` (admin boleh, kasir dan bendahara 403, tamu ke login). Seluruh suite Pest: 250 tes lulus.
  - `tsc`, `vp lint`, dan `pint` bersih; `npm run build` berhasil.
- **Dicoba di browser** (`http://localhost:8010/diorama-lab`, database `kasir_test`):
  - 7 pesanan: 5 pelanggan antre di karpet, "+2", semua dilayani lalu toko sepi;
  - alur manual: pelanggan menunggu di kasir setelah pindaian habis, bayar menampilkan total di layar pelanggan, batal menurunkan total harian sementara pelanggan yang sudah bayar tetap membawa kantong;
  - tidak ada error di konsol, tidak ada permintaan ke `/kasir/peristiwa`. Database `kasir` tidak tersentuh.

### Tambahan setelah persetujuan: pelanggan tidak membayar dikejar penjaga

Status: **selesai, disetujui pemilik.**

- **Pelanggan:** state baru `kabur`. Pelanggan yang membawa barang lari ke pintu lewat lajur keluar (×2,5).
- **Penjaga kasir:** kini punya posisi dan tiga state baru, `mengejar` → `di_pintu` → `kembali`, lalu `diam` di (9,5) menghadap pembeli seperti semula.
  - Ia keluar dari balik meja lewat (8,5), mengejar sampai pintu dengan kecepatan sedikit di bawah pelanggan sehingga tidak tertangkap, berhenti 1,5 detik, lalu pulang.
  - Selama pergi, kasir tidak melayani dan pembeli di titik dilayani menunggu.
- **Pemicu:**
  - transaksi terbuka ditinggalkan, yaitu transaksi baru dibuka sebelum yang lama dibayar;
  - tombol uji baru "Kabur tanpa bayar" (peristiwa `sale.abandoned` di adaptor; layar kasir belum memancarkannya).
- **Yang tidak dikejar:**
  - pelanggan yang belum mengambil barang (keluar biasa);
  - pembatalan penjualan;
  - pelanggan latar, yang kini hanya melihat-lihat dan tidak membawa barang keluar.
- **Kode baru:** `engine/movement.ts` (gerak bersama pelanggan dan penjaga) dan `guardExit` di denah. Gelembung "!!" di atas penjaga.
- **Tes:** 67 tes Vitest lulus (11 baru); `tsc`, lint, dan build bersih.
- **Dilihat dan disetujui pemilik** di `/diorama-lab`. Saat saya memeriksa, jendela aplikasi tersembunyi (`document.hidden`), jadi loop diorama berhenti sesuai rancangan.

### Batasan dan hal yang perlu diketahui

- **Keputusan perilaku yang saya ambil:**
  - "Pelanggan baru" saat transaksi sebelumnya belum dibayar berarti keranjang lama dikosongkan: pelanggan lama pergi tanpa kantong. Diubah oleh tambahan di atas: kini yang sudah membawa barang kabur dan dikejar. Layar kasir sungguhan memancarkan `sale.opened` saat barang pertama masuk keranjang kosong.
  - Kejar ketinggalan berlaku setiap kali `sale.completed` datang sebelum pelanggan membayar (bukan hanya saat masih di jalan), supaya animasi tidak tertinggal dari kasir.
  - Pindaian yang diperlihatkan dibatasi 6 per pelanggan.
  - Antrean urut kedatangan di antrean, bukan urut nomor penjualan; tiap pelanggan memutar penjualannya sendiri.
- **Belum dikerjakan (tahap lain):** sprite sungguhan (5C); siang dan malam, bunyi, isi rak menurut stok, endpoint keadaan awal dan polling, mode statis dan hemat daya (5D); diorama di dasbor.
- **Wadah lebih sempit dari 768 px:** kanvas diperkecil (bukan skala bulat), jadi bisa sedikit kabur.
- **Animasi bergantung pada `requestAnimationFrame`:** saat jendela atau tab tidak terlihat, browser memperlambat atau menghentikannya. Ini sesuai rancangan (loop berhenti saat tab tersembunyi).
- `vite.config.ts` mendapat blok `test` (Vitest bawaan vite-plus). Jalankan tes JavaScript dengan `npx vp test`.
- `kasir_test` diisi ulang dengan akun demo untuk mencoba di browser. Database ini dikosongkan setiap kali `php artisan test` dijalankan.

### Saran untuk tahap berikutnya

- **Tahap 5C** (sprite dan animasi): **Opus, upaya tinggi.**
  - Ganti `PlaceholderRenderer` dengan renderer sprite; mesinnya tidak perlu diubah.
  - Mulai dari satu karakter dan satu rak di `/diorama-lab`, perlihatkan, tunggu persetujuan.
  - Karakter referensi dari `docs/referensi-karakter/olahan/`.
- Mulai di sesi baru setelah model diganti.

---

## Tahap 5A: Rancangan diorama isometrik (21 Nov 2026)

Status: **selesai, disetujui pemilik (revisi 5).** Belum ada kode aplikasi dan tidak ada paket baru.

### Yang sudah selesai

- **Rancangan tertulis** `docs/diorama-rancangan.md`, acuan 5B sampai 5E:
  - kanvas 768 × 432, tile isometrik 64 × 32, grid toko 12 × 9;
  - denah: 2 rak, 3 vending machine, 2 meja kasir (kasir 2 tutup), pintu kaca, lukisan, jam, jendela, karpet antrean;
  - jalur pelanggan (BFS 4 arah), state machine pelanggan dan penjaga kasir;
  - daftar sprite, palet 24 warna, aturan urutan kedalaman;
  - hubungan ke `resources/js/lib/store-events.ts` dan ke stok ledger;
  - kinerja dan mode hemat, keputusan D1 sampai D7, risiko, rencana berkas 5B sampai 5E.
- **Halaman rancangan** `docs/diorama-rancangan.html`: statis, dibuka langsung di browser. Isinya: denah isometrik (label, koordinat, jalur contoh, tile terlarang, malam, skala), meja kasir dari dekat, galeri karakter, contoh kedalaman, palet, state machine, dan peristiwa.
- **Referensi karakter** `docs/referensi-karakter/`: 8 gambar dari pemilik (`asli/`), hasil olahan tanpa latar (`olahan/`), dan skrip Node tanpa paket tambahan (`alat/`).
- **Lima revisi** atas koreksi pemilik; riwayatnya ada di bagian atas dokumen rancangan.

### Keputusan yang disetujui

| Kode | Keputusan |
| --- | --- |
| D1 | Canvas 2D bawaan browser, tanpa PixiJS dan tanpa paket baru |
| D2 | Keadaan awal dari server + polling baca-saja 10 detik sampai Reverb (Tahap 8) |
| D3 | Paling banyak 2 pelanggan latar saat sepi |
| D4 | Kategori yang namanya mengandung "minum" ke vending machine, sisanya ke rak |
| D5 | Kanvas 768 × 432, tile 64 × 32 |
| D6 | 8 karakter dari gambar pemilik, warna asli, satu pose + cermin; zombie sebagai penjaga kasir |
| D7 | Lantai kotak mint dan krem dengan karpet antrean terakota |

### Batasan dan hal yang perlu diketahui

- **Hak cipta:** karakter referensi milik pemegang hak masing-masing, dan gambar sumbernya kemungkinan karya penggemar. Hanya untuk tugas dan demo kelas, tidak dipublikasikan. Gambar no. 6 memuat nama pembuat polanya; dicatat di `docs/referensi-karakter/README.md`.
- **Pengecualian aturan sprite `CLAUDE.md`:** karakter referensi memakai warna aslinya (di luar palet) dan bukan buatan Claude Code, atas permintaan pemilik.
- **Karakter referensi hanya satu pose:** arah kiri dan kanan memakai cermin, gerak jalan berupa ayunan.
- **Pratinjau menampilkan 8 pelanggan sekaligus** agar semua karakter terlihat. Saat berjalan tetap paling banyak 5, sisanya "+N".
- **`docs/diorama-rancangan.html` adalah berkas rakitan.** Semua kodenya ada di dalam berkas itu (sprite sebagai data URL), jadi perubahan berikutnya dilakukan langsung di berkas tersebut.
- `docs/visi-diorama.md` (tulisan pemilik) tidak diubah.

### Saran untuk tahap berikutnya

- **Tahap 5B** (mesin diorama): **Sonnet, upaya tinggi.**
  - Cakupan: game loop 30 FPS, proyeksi isometrik, urutan kedalaman, jalur jalan BFS, state machine aktor, dan adaptor `DioramaFeed` dengan event palsu dari tombol "simulasi pesanan".
  - Acuan: `docs/diorama-rancangan.md` bagian 1 sampai 4, 8 sampai 10, dan 13.
  - Sprite boleh berupa kotak sementara dulu. Sprite sungguhan dikerjakan di 5C (Opus, upaya tinggi) dengan halaman `/diorama-lab`.
- Mulai di sesi baru setelah model diganti.

---

## Tahap 4: Anggota dan simpanan (21 Nov 2026)

Status: **selesai, menunggu persetujuan.**

### Yang sudah selesai

- **Migration baru** (3 berkas, tidak ada migration lama yang diubah): `members`, `savings_ledger`, dan `sales.member_id` (nullable, FK ke `members`).
- **Config** `config/koperasi.php` (keputusan Q3): tarif pokok, wajib per bulan, dan setoran sukarela minimal, bisa diganti lewat `.env`. **Angka bawaan (Rp 100.000, Rp 25.000, Rp 1.000) hanya contoh saya, bukan aturan koperasi sungguhan.**
- **Ledger simpanan** (`savings_ledger`): hanya bisa ditambah, `balance_after` di tiap baris, baris pembalik dengan `reverses_entry_id` unik, saldo tidak pernah minus. Hanya `App\Actions\Savings\PostSaving` yang menulis ke tabel ini.
- **Aturan yang ditegakkan** (asumsi S1 sampai S12 di rencana, kini tertulis di `docs/skema.md` bagian 5): pokok sekali sebesar tarif; wajib satu bulan per setoran sebesar tarif (tunggakan sejak bulan bergabung boleh, bulan depan tidak, bulan sama sekali saja); sukarela bebas selama saldo cukup; pokok dan wajib tidak bisa ditarik manual; keluar anggota menarik semua saldo dalam satu transaksi lalu menutup keanggotaan; setelah keluar hanya pembalikan; pembalikan wajib beralasan, sekali saja, dan tidak boleh membuat saldo minus.
- **Action** (`app/Actions/Savings/`): `PostSaving` (`deposit`, `withdraw`, `withdrawForExit`, `reverse`), `ExitMember`, `CreateMember` (nomor `A-000001` berurutan, tidak dipakai ulang termasuk anggota yang di-soft-delete), `UpdateMember`.
- **Halaman admin dan bendahara** (`/anggota`): daftar dengan pencarian, saring status, saldo per jenis, penanda "Pokok belum dibayar"; form daftar dan ubah; buku simpanan per anggota (saldo per jenis, form setor/tarik dengan nominal tarif terisi otomatis dan pilihan bulan wajib, riwayat dengan saring jenis, dialog balik, dialog keluar anggota). Komponen kecil di `components/members/`, helper di `lib/savings.ts`, tipe di `types/members.ts`. Antarmuka polos, tema pixel di 5E.
- **Layar kasir:** pemilih anggota opsional (`components/pos/member-picker.tsx` dengan hook `hooks/use-member-search.ts`), `member_id` ikut dikirim saat bayar, dan struk memuat nama dan nomor anggota. Anggota yang sudah keluar atau tidak ada menolak penjualan. Pencarian kasir (`GET /kasir/anggota/cari`) hanya mengembalikan id, nomor, dan nama anggota aktif, maksimal 8.
- **Hak akses:** admin dan bendahara mengelola anggota dan simpanan; kasir 403 di `/anggota*`; bendahara tetap tidak bisa memakai layar kasir. Menu "Anggota" untuk admin dan bendahara.
- **Log aktivitas:** `member.created`, `member.updated`, `member.exited`, `savings.reversed`.
- **Tes:** 246 tes lulus (73 baru di `tests/Feature/Savings/`; tes Tahap 1 sampai 3 tidak diubah). `pint` dan `tsc` bersih, `npm run build` berhasil.
- **Dicoba di browser** pada `kasir_test` (bukan `kasir`): bendahara membuka buku simpanan, setor pokok (Rp 100.000 terisi otomatis), setor wajib (bulan ditandai sudah dibayar), tarik sukarela melebihi saldo ditolak dengan pesan, opsi "Tarik" dinonaktifkan untuk pokok; kasir 403 di `/anggota`, memilih anggota di layar kasir, scan barcode, bayar, struk memuat anggota. Ledger dan penjualan dicek langsung di database. Database `kasir` tidak tersentuh.
- `docs/skema.md` diperbarui (3.3 `member_id`, 3.4, bagian 5 T1 sampai T9, bagian 7).

### Batasan dan hal yang perlu diketahui

- **Aturan simpanan adalah asumsi saya** (belum divalidasi dengan bendahara sungguhan); nominal config hanya contoh. Daftar asumsi ada di bagian 5 `docs/skema.md`.
- **Perlindungan hanya di model dan Action** (tanpa trigger): `savings_ledger` tidak bisa diubah lewat Eloquent, tetapi query langsung bisa. Tes hanya menguji sisi model.
- **Tidak dibuat:** kartu anggota QR dan `qr_token`, bayar belanja dengan simpanan, diskon atau poin anggota, anggota bergabung kembali, ekspor, UI hapus anggota (anggota hanya keluar, nomor tidak pernah dipakai ulang).
- Membalik penarikan keluar anggota meninggalkan anggota `exited` dengan saldo (sesuai aturan "hanya pembalikan yang boleh" setelah keluar); status tidak berubah kembali.
- Pembatasan bulan wajib di form hanya 36 bulan terakhir; server tidak membatasi selama bulan itu sejak bulan bergabung.
- Tes `Member::flushEventListeners()` pada tes atomik keluar anggota memakai `Member::clearBootedModels()` supaya tidak bocor ke tes lain; seluruh suite hijau.
- Tes berjalan di `kasir_test` dan mengosongkannya; data demo ada di `kasir`. Server MariaDB XAMPP harus menyala.

### Saran untuk tahap berikutnya

- **Tahap 5A** (rancang diorama, plan mode, belum ada kode): **Opus, upaya tinggi.** Sebelum 5A, tulis ide diorama di `docs/visi-diorama.md` (suasana, isi toko, siapa yang berkeliling, apa yang dilakukan kasir). Event siap dipakai: `resources/js/lib/store-events.ts` (`sale.opened`, `item.scanned`, `sale.completed`, `sale.voided`).
- Mulai di sesi baru setelah model diganti.

---

## Tahap 3: Kasir (21 Nov 2026)

Status: **selesai, menunggu persetujuan.**

### Yang sudah selesai

- **Migration baru** (3 berkas, tidak ada migration lama yang diubah): `cash_shifts`; `sales`, `sale_items`, `payments`, `sale_voids`; FK `stock_movements.sale_item_id` ke `sale_items`. `ProductUnit::isInUse()` sekarang juga memeriksa `sale_items`.
- **Action** (`app/Actions/Pos/`): `OpenShift`, `CloseShift`, `CompleteSale`, `VoidSale`. Stok selalu lewat `AdjustStock` (`handle` untuk penjualan, `reverse` untuk pembatalan).
- **Aturan uang dan stok yang ditegakkan:** harga dari server (browser hanya kirim satuan dan jumlah); penjualan tunai dengan kembalian; stok kurang menolak seluruh penjualan dengan rollback penuh; satu shift aktif per kasir; `expected_cash` = kas awal + pembayaran tunai penjualan yang tidak dibatalkan (kembalian tidak dihitung), dibekukan saat tutup, selisih bertanda, catatan wajib bila selisih tidak nol; pembatalan hanya admin, hanya selama shift penjualan itu masih terbuka, alasan wajib, sekali saja, lewat `sale_voids` dan mutasi `sale_void`.
- **Layar kasir** (`/kasir`): form buka shift; kolom scan yang selalu fokus (scanner USB mengetik lalu Enter; barcode dus menambah satuan dus); pencarian manual; keranjang dengan ubah jumlah dan peringatan stok; bayar tunai dengan kembalian; tutup shift dengan selisih; riwayat penjualan dengan dialog batal (admin); struk 80 mm yang dicetak dari browser. Antarmuka polos dengan komponen starter kit.
- **Hak akses:** `/kasir` untuk kasir dan admin; bendahara 403; pembatalan hanya admin; kasir hanya melihat penjualan dan struknya sendiri; kasir boleh membaca `/produk` (tombol kelola disembunyikan), halaman inventaris lain tetap admin.
- **Titik pemicu event:** event Laravel `SaleOpened`, `ItemScanned`, `SaleCompleted`, `SaleVoided` (`app/Events/`, muatan data biasa). `SaleCompleted` dan `SaleVoided` dipancarkan dari Action hanya setelah commit; `SaleOpened` dan `ItemScanned` dikirim browser lewat `POST /kasir/peristiwa` (tanpa database). Pemancar di browser: `resources/js/lib/store-events.ts` (`emitStoreEvent`, `onStoreEvent`), dengan jembatan `store-event-bridge.tsx` untuk peristiwa selesai dan batal. Tidak ada kode diorama.
- **Tes:** 173 tes lulus (82 baru di `tests/Feature/Pos/`; tes Tahap 2 hanya disesuaikan agar memakai `SaleItem` sungguhan karena FK baru). `pint` dan `tsc` bersih, `npm run build` berhasil.
- **Dicoba di browser** pada `kasir_test` (bukan `kasir`): buka shift, ketik barcode pcs dan dus lalu Enter, barcode tak dikenal, bayar 120.000 untuk total 113.000 (kembalian 7.000), struk, batal oleh admin (stok kembali 100), tutup shift dengan selisih tanpa catatan ditolak. Ledger dan penjualan dicek langsung di database. Database `kasir` tidak tersentuh.
- `docs/skema.md` diperbarui (3.3, K3, K4, K6, K7, bagian 7).

### Batasan dan hal yang perlu diketahui

- **Perlindungan hanya di model dan Action** (tanpa trigger): `sales`, `sale_items`, `payments`, `sale_voids`, dan shift yang sudah tertutup tidak bisa diubah lewat Eloquent, tetapi query langsung bisa. Tes hanya menguji sisi model.
- **Diskon dan `sales.member_id` ditunda** (keputusan rencana Tahap 3). `member_id` ditambah di Tahap 4.
- **Keranjang hidup di browser**: hilang bila halaman dimuat ulang.
- **Relai `POST /kasir/peristiwa`** dipanggil tiap barang dipindai (dibatasi 240 per menit per pengguna). Gagal diabaikan, tidak memperlambat kasir.
- Tampilan layar kasir sempit (lebar sekitar 1000 px dengan sidebar) membuat tabel keranjang bisa digulir ke samping. Fungsional; rapikan di 5E bila perlu.
- Admin melihat di riwayat hanya penjualan di shift yang masih terbuka (sesuai rencana); penjualan shift tertutup tidak bisa dibatalkan.
- **Nama metode controller berakhiran `Form`** bentrok dengan varian `.form` Wayfinder (sudah dihindari: `closing`). Perintah `php artisan wayfinder:generate --with-form` dipakai untuk regenerasi manual; `npm run build` melakukannya otomatis.
- Tes berjalan di `kasir_test` dan mengosongkannya; data demo ada di `kasir`. Server MariaDB XAMPP harus menyala.

### Saran untuk tahap berikutnya

- **Tahap 4** (anggota dan `savings_ledger`): **Sonnet, upaya sedang**, dimulai di **plan mode** (aturan kerja: logika simpanan). Rencananya perlu menetapkan tarif di `config/koperasi.php` (keputusan Q3), `members.member_number`, `PostSaving` satu pintu, dan kolom `sales.member_id` dengan FK.
- Mulai di sesi baru setelah model diganti.

---

## Tahap 2: Produk, satuan, ledger stok (21 Nov 2026)

Status: **selesai, menunggu persetujuan.**

### Yang sudah selesai

- **Migration baru** (5 berkas, tidak ada migration lama yang diubah): `categories`, `products` + `product_units`, `stock_entries`, `stock_movements`, `activity_logs`.
- **Ledger stok** (`stock_movements`): hanya bisa ditambah, `balance_after` di tiap baris, baris pembalik dengan `reverses_movement_id` unik, saldo tidak boleh minus untuk jenis mutasi apa pun (keputusan Q2). Hanya `App\Actions\Inventory\AdjustStock` yang menulis ke tabel ini.
- **Action:** `AdjustStock` (`handle` dan `reverse`), `ReceiveStock` (dokumen penerimaan bernomor `BM-yyyymmdd-nnnn` plus mutasi), `SaveProduct` (produk dan satuan), `LogActivity`.
- **Halaman admin** (polos, komponen starter kit, teks bahasa Indonesia): daftar produk dengan stok dan penanda "Menipis" serta pencarian nama, SKU, barcode; form produk dengan banyak satuan; penerimaan barang; koreksi stok dan saldo awal; kartu stok; kategori. Menu samping muncul hanya untuk admin. Rute di `routes/inventory.php`, semuanya `role:admin`.
- **Keputusan Q1 sampai Q4** sudah masuk ke `docs/skema.md` (barcode satu kolom, stok kurang ditolak, tarif simpanan di config, `stock_entries` hanya penerimaan). `activity_logs` dibuat sekarang.
- **Tes:** 91 tes lulus (47 baru di `tests/Feature/Inventory/`), `tsc` bersih, `pint` bersih, `npm run build` berhasil. Alur dicoba di browser pada database `kasir_test` (bukan `kasir`): buat produk dua satuan, terima 2 dus (isi 40) menjadi saldo 80, koreksi melebihi saldo ditolak dengan pesan.

### Batasan yang perlu diketahui

- **Perlindungan ledger hanya di model dan Action.** Tidak ada trigger database. Query langsung (`DB::table()->update()`, SQL manual) bisa mengubah atau menghapus baris ledger, dan tes **tidak** menguji itu. Ini tertulis di `docs/skema.md` bagian 1 butir 7. Yang ditegakkan database hanya `CHECK (qty <> 0)`, `balance_after` tak bertanda, dan unique `reverses_movement_id`.
- **Zona waktu:** database menyimpan UTC; tampilan dan input tanggal memakai `config('app.display_timezone')` (`Asia/Jakarta`, bisa diubah lewat `APP_DISPLAY_TIMEZONE`). Sempat salah di tampilan pertama (jam tampil UTC) dan sudah diperbaiki beserta tesnya.
- **Tidak ada UI pembalikan mutasi.** `AdjustStock::reverse()` sudah ada dan teruji, dipakai `VoidSale` di Tahap 3. Di Tahap 2 koreksi dilakukan lewat mutasi `adjustment`.
- `ProductUnit::isInUse()` baru memeriksa `stock_movements`. Tahap 3 wajib menambah pengecekan `sale_items` di sana, dan menambah FK `stock_movements.sale_item_id` lewat migration baru.
- Produk tidak bisa dihapus dari UI, hanya dinonaktifkan (`is_active`). Kasir dan bendahara belum bisa melihat produk; akses baca untuk kasir menyusul di Tahap 3.
- Tes berjalan di MariaDB 10.4 `kasir_test`, jadi **`php artisan test` mengosongkan `kasir_test`**. Data demo ada di `kasir` dan tidak tersentuh.
- Server MariaDB harus menyala (XAMPP) sebelum menjalankan tes atau aplikasi.
- Berkas `resources/js/pages/settings/profile.tsx` ikut terformat ulang oleh formatter proyek (tanpa perubahan perilaku).

### Saran untuk tahap berikutnya

- **Tahap 3** (kasir: keranjang, scan barcode, pembayaran tunai, struk, tutup kasir, `sales`, `sale_items`, `payments`, `cash_shifts`, `sale_voids`): **Sonnet, upaya sedang.** Logika uang dan pembatalan menyentuh ledger stok, jadi rencana tertulis dulu dan tunggu persetujuan sebelum kode (aturan kerja untuk uang dan stok). Pindah ke Opus dengan upaya tinggi bila logika pembatalan atau tutup kasir bermasalah.
- Mulai di sesi baru setelah model diganti.

---

## Persiapan sebelum Tahap 2 (21 Nov 2026)

Status: **selesai, belum di-commit** (commit pertama `454d968` hanya berisi Tahap 0 dan 1).

- `git init` dan commit pertama. `.env` tidak ikut. `claude.md` ikut lewat `git add -f` karena `.gitignore` bawaan memuat `/CLAUDE.md` (cocok juga untuk `claude.md` di Windows).
- Dimatikan: pendaftaran publik, hapus akun sendiri, verifikasi email. 2FA dan passkey tetap aktif. `User` tidak lagi `MustVerifyEmail`. Berkas yang ikut dihapus: `register.tsx`, `verify-email.tsx`, `delete-user.tsx`, `ProfileDeleteRequest.php`, dan tes pendaftaran dan verifikasi email. Gantinya: `tests/Feature/Auth/FeaturesDisabledTest.php`.
- Tes pindah ke MariaDB database `kasir_test` (`phpunit.xml`, dengan `force="true"` agar tidak pernah menyentuh database `kasir`). Database `kasir` (3 akun demo) dicek tidak berubah setelah tes. Database kosong `kasir_testing` yang saya buat di Tahap 1 sudah dihapus.
- Hasil: 44 tes lulus (sebelumnya 54, selisihnya tes fitur yang dimatikan), `tsc` dan `npm run build` bersih.
- Keputusan skema: Q1 satu kolom `barcode` unik di `product_units`; Q2 penjualan ditolak bila stok kurang; Q3 tarif simpanan di berkas config; Q4 `sale_voids` disetujui, `stock_entries` hanya catatan penerimaan barang tanpa saldo.

## Tahap 1: Scaffold, login, tiga peran (21 Nov 2026)

Status: **selesai, menunggu persetujuan.**

### Yang sudah selesai

- Proyek Laravel **13.43** dengan React starter kit resmi (Inertia 3 + React + Tailwind + TypeScript), Fortify untuk login, Pest untuk tes. Tanpa laravel-boost.
- Database: MariaDB 10.4 dari XAMPP (driver `mysql`), database `kasir`. Konfigurasi di `.env`.
- Paket `spatie/laravel-permission` 8.5 terpasang, migration tabel peran sudah dijalankan.
- Tiga peran: `app/Enums/Role.php` (`admin`, `kasir`, `bendahara`), dibuat oleh `database/seeders/RoleSeeder.php`.
- Akun demo dari `DatabaseSeeder` (kata sandi `password`): `admin@kasir.test`, `kasir@kasir.test`, `bendahara@kasir.test`.
- `users` ditambah `is_active` dan soft delete lewat migration baru (`2026_11_21_040000_...`), sesuai `docs/skema.md` 3.1.
  - Akun nonaktif atau yang sudah dihapus tidak bisa login (`FortifyServiceProvider::authenticateUsing`).
  - Akun yang dinonaktifkan saat sedang login langsung dikeluarkan (`app/Http/Middleware/EnsureUserIsActive.php`).
- Middleware `role`, `permission`, `role_or_permission` terdaftar di `bootstrap/app.php`. Contoh: `->middleware('role:admin')`.
- Peran pengguna dibagikan ke frontend sebagai `auth.roles` (tipe `Role` di `resources/js/types/auth.ts`).
- Tes: `tests/Feature/RoleTest.php` (12 tes: seeder, middleware peran, akun nonaktif, soft delete, data peran di Inertia). Tes bawaan hapus akun disesuaikan ke soft delete.
- Hasil: **54 tes lulus**, `tsc --noEmit` bersih, `npm run build` berhasil. Login `kasir@kasir.test` dicoba di browser: masuk ke dasbor dan `auth.roles` = `["kasir"]`.
- `.claude/launch.json` untuk menjalankan `php artisan serve` di port 8000.

### Cara menjalankan

1. Nyalakan MySQL di XAMPP Control Panel.
2. `php artisan migrate:fresh --seed` (hanya bila ingin mengulang data dari awal).
3. `composer run dev`, lalu buka http://localhost:8000.

### Yang belum dan catatan

- **MariaDB 10.4, bukan MySQL 8.** XAMPP membawa MariaDB. `CHECK` constraint dan `lockForUpdate()` yang dibutuhkan skema berjalan di MariaDB 10.4, jadi tidak ada yang menghalangi. Bila dosen meminta MySQL 8 secara khusus, tinggal ganti server, tanpa ubah kode.
- **Tes memakai SQLite in-memory** (bawaan `phpunit.xml`). Database `kasir_testing` sudah dibuat di MariaDB tetapi belum dipakai. Usulan: pindahkan tes ke MariaDB di Tahap 2 agar `CHECK` constraint ikut teruji. Perlu persetujuan.
- **Fitur bawaan starter kit yang masih aktif dan perlu keputusan Anda:**
  - pendaftaran publik (`/register`): siapa pun bisa membuat akun tanpa peran. Usulan: matikan, akun dibuat admin.
  - hapus akun sendiri di halaman pengaturan. Usulan: matikan.
  - verifikasi email, 2FA, passkey. Usulan: matikan verifikasi email (tidak ada server email); 2FA dan passkey boleh dibiarkan.
- Teks antarmuka masih bahasa Inggris dari starter kit. Belum ada halaman berbeda per peran (itu datang bersama modul di tahap berikutnya).
- Belum ada repositori git. Usulan: `git init` dan commit pertama sebelum Tahap 2.
- Keputusan Q1 sampai Q4 di `docs/skema.md` bagian 9 masih perlu dijawab sebelum Tahap 2.

### Saran untuk tahap berikutnya

- **Tahap 2** (produk, satuan, `stock_movements` berbasis ledger, beserta tes Pest): **Sonnet, upaya sedang**, dimulai di **plan mode**. Pindah ke Opus dengan upaya tinggi bila logika ledger bermasalah.
- Mulai di sesi baru setelah model diganti.

---

## Tahap 0: Skema dan aturan ledger, versi tugas (21 Nov 2026)

Status: selesai. Rancangan ada di `docs/skema.md`.

- Keputusan: satu koperasi, MySQL, tiga peran (`admin`, `kasir`, `bendahara`).
- Dihapus untuk versi tugas: trigger database, kolom gudang, retur setelah shift tutup, penguncian anti-deadlock, `client_uuid`, tes keserentakan, QRIS, `cash_shift_entries`, `document_sequences`, NIK, status `inactive`, peran tambahan.
- Dipertahankan: ledger stok dan simpanan yang hanya bisa ditambah, `balance_after`, baris pembalik dengan `reverses_*_id` unik, penjualan tidak pernah diedit (pembatalan lewat `sale_voids`).

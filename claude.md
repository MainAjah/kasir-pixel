# Rencana Aplikasi Kasir, Inventaris & Koperasi (Laravel + Diorama Pixel)

Nov 21, 2026 · @Lutfi

## Ringkasan & tujuan

Aplikasi web Laravel untuk toko koperasi yang menyatukan kasir, inventaris, dan simpan pinjam anggota, dengan satu ciri khas: diorama pixel mini yang menghidupkan transaksi nyata di layar.

- **Pengguna:** kasir, petugas gudang, bendahara dan pengurus koperasi, pengawas, dan anggota.
- **Masalah:** catatan kasir, stok, dan simpanan sering terpisah sehingga angkanya tidak cocok saat RAT (Rapat Anggota Tahunan).
- **Pembeda:** setiap pesanan atau transaksi nyata memunculkan pelanggan pixel yang antre, dipindai barcode-nya oleh kasir pixel, lalu pergi membawa belanjaan.
- **Prinsip:** data lebih dulu, animasi mengikuti data. Animasi tidak boleh memperlambat kasir sungguhan.
- **Keputusan:** jalur aplikasi sungguhan dengan Laravel. Desain dan coding dikerjakan nanti di Claude Code, dokumen ini menjadi acuannya.

## Versi tugas (yang berlaku)

Proyek ini untuk tugas kuliah, bukan koperasi sungguhan, dan satu-satunya persyaratan dosen adalah memakai Laravel. Tenggatnya masih lama, jadi waktu dipakai untuk membuat diorama pixel dengan baik. Jika ada yang bertentangan dengan bagian lain di dokumen ini, bagian ini yang berlaku.

**Keputusan**

- Satu koperasi, bukan multi tenant.
- Database MySQL.
- Tiga peran: admin, kasir, bendahara.

**Tiga lapis pekerjaan**

1. **Lapis 1, inti (Tahap 0 sampai 4):** kasir, produk dan stok berbasis ledger, anggota dan simpanan, login dengan tiga peran.
2. **Lapis 2, diorama (Tahap 5):** pelanggan pixel berjalan menyusuri toko dan antre, penjaga kasir bergerak saat scan, rak terisi sesuai stok nyata, siang dan malam, klik pelanggan untuk melihat barang yang dibelinya.
3. **Lapis 3, bonus (Tahap 6 sampai 9):** data contoh dan tombol "simulasi pesanan" untuk demo (dikerjakan lebih dulu), SHU dan pinjaman sederhana, Reverb dengan layar diorama terpisah, lalu review ringan dan bahan presentasi.

**Arti "koperasi" (diputuskan):** dalam tugas ini "koperasi" adalah peran pengelola (admin) yang mengelola seluruh operasional aplikasi, sedangkan kasir hanya melayani penjualan. Fitur peran koperasi/admin: mengelola akun pengguna, mengelola produk dan kategori, mengelola stok, mengelola supplier, melihat seluruh transaksi, melihat laporan penjualan dan inventaris, dan mengatur hak akses. Anggota, simpanan, SHU, dan pinjaman tetap bonus (Tahap 7), bukan inti. Yang masih kurang dari rencana awal dan ditambahkan: Tahap 6B (kelola pengguna, hak akses, supplier) dan Tahap 6C (laporan penjualan dan inventaris, ringkasan di dasbor). Nama peran di layar boleh "Koperasi" atau "Admin", mudah diganti kapan saja.

**Arah visual antarmuka (disepakati, berlaku untuk 5D, 5E, 5F):** konsepnya mengikuti gaya game manajemen toko isometrik (diorama besar, balon ucapan, bar status), tetapi semua sprite, ikon, dan karakter dibuat sendiri dan memakai diorama serta 24 warna palet yang sudah ada. Tidak ada aset dari game lain yang disalin.

- **Dasbor (Beranda), semua peran:** diorama toko isometrik buatan kita sendiri memenuhi layar, dengan konsep seperti game manajemen toko. Di kiri atas ada satu kartu kecil "Hari Ini" (penjualan, transaksi, stok menipis), tanpa bar atas dan bawah. Menu ikon di sisi kiri untuk halaman biasa (Produk, Stok, Laporan, Pengguna). Dua pos untuk sekarang: Kasir dan Inventaris. Pos Koperasi (anggota, simpanan, pinjaman, SHU) ditunda.
- **Halaman kasir:** mengikuti foto referensi. Kerangka dengan menu samping dan header judul beserta tanggal dan jam. Kolom cari produk dengan tab kategori, grid produk dengan lencana stok, keranjang dengan tombol plus dan minus, subtotal, total besar, tombol Tunai dan Simpanan anggota, lalu Proses Pembayaran. Potret kasir yang sudah ada di kiri bawah dengan balon total belanja. Layar "Transaksi Berhasil" dengan Cetak Struk dan Transaksi Baru. Riwayat transaksi dengan tab Semua, Hari Ini, 7 Hari, Bulanan dan lencana Selesai/Batal. Warna tetap dari palet kita, dan bila tidak cocok baru dicari lagi. Dibuang: QRIS, diskon, Unduh PDF, tombol Lainnya, dan halaman Barcode/Scan terpisah. Kolom pindai barcode di kasir tetap ada.
- **Inventaris dan halaman tabel:** kartu angka di atas (total produk, stok tersedia, stok menipis, stok habis), tab (Daftar Barang, Stok Masuk, Stok Keluar), tabel dengan lencana status stok dan ikon aksi, pagination, dan potret penjaga Inventaris yang sudah ada di kanan bawah. Barang masuk menampilkan detail penerimaan dengan supplier, tanggal, dan daftar item. Tidak dibuat: Stock Opname, menu Pembelian, menu Pengaturan, menu Koperasi (ditunda).
- **Gaya bersama:** bingkai tebal bersudut kotak dengan sisi bawah dan kanan lebih tebal, font pixel hanya untuk judul, angka besar, dan tombol, font biasa untuk tabel dan isian, hanya warna dari palet diorama.
- **Syarat persetujuan:** tiap langkah visual ditampilkan di browser dan menunggu persetujuan pengguna sebelum lanjut.
- **Cara kerja tombol pos:** tiap pos (Kasir, Inventaris) dijaga satu karakter di diorama dan punya tombol berlabel di bawahnya (contoh: "Kasir, Penjualan dan Transaksi"). Tidak memakai balon. Tombol diklik, lalu karakter muncul besar sebagai petugas yang menyapa (potret yang sama diperbesar, tanpa ekspresi tambahan) dengan pilihan fitur pos itu. Pilihan diklik, lalu masuk ke halaman yang sesuai. Pos Kasir berisi Transaksi, Riwayat transaksi, Laporan penjualan. Pos Inventaris berisi Stok barang, Barang masuk, Penyesuaian stok, Supplier.
- **Akses per peran:** semua peran bisa melihat diorama, tetapi hanya bisa membuka pos sesuai haknya. Kasir hanya bisa membuka tombol Kasir. Tombol pos lain ditolak dengan pesan singkat di diorama, dan penolakan juga dijaga di sisi server lewat hak akses, bukan hanya disembunyikan di tampilan.
- **Aksesibilitas:** tombol pos adalah tombol biasa yang bisa dipilih dengan keyboard, agar tetap bisa dipakai tanpa mouse dan di layar kecil.

**Dipertahankan:** ledger stok dan simpanan yang hanya bisa ditambah, `balance_after`, baris pembalik untuk koreksi, penjualan yang tidak pernah diedit.

**Dibuang untuk versi tugas:** trigger database, kolom gudang, jalur retur setelah shift tutup, penguncian anti-deadlock, `client_uuid`, tes keserentakan stok, mode offline, QRIS, WhatsApp, modul RAT, adegan gudang dan balai, serta plugin laravel-boost.

**Prompt untuk menyederhanakan Tahap 0 yang sudah ada**

```text
Baca CLAUDE.md, bagian "Versi tugas". Ini proyek tugas kuliah, bukan
produksi. Revisi docs/skema.md menjadi versi sederhana: hapus trigger
database, kolom gudang, jalur retur setelah shift tutup, penguncian
anti-deadlock, client_uuid, dan tes keserentakan. Pertahankan ledger
stok dan simpanan yang hanya bisa ditambah, baris pembalik,
balance_after, dan penjualan yang tidak diedit. Putuskan: satu koperasi,
MySQL, tiga peran (admin, kasir, bendahara). Perbarui PROGRESS.md, lalu
berhenti dan tunggu persetujuan saya.
```

## Ruang lingkup modul

MVP mencakup kasir, inventaris dasar, dan data anggota dengan simpanan. Pinjaman, SHU, dan RAT menyusul karena aturannya lebih rumit dan perlu divalidasi dengan pengurus koperasi.

| Modul | Fitur | Fase |
| --- | --- | --- |
| Kasir | Scan barcode (kamera dan scanner USB), keranjang, diskon, tunai dan QRIS, struk thermal, tutup kasir harian | MVP |
| Kasir | Bayar dengan saldo simpanan, struk via WhatsApp, mode offline | Fase 2 |
| Inventaris | Master produk, satuan dan konversi, stok masuk dan keluar, kartu stok, stok minimum | MVP |
| Inventaris | Stok opname, retur, pesanan ke supplier (PO), tanggal kedaluwarsa, multi gudang | Fase 2 |
| Koperasi | Data anggota, kartu anggota QR, simpanan pokok, wajib, dan sukarela | MVP |
| Koperasi | Pinjaman dan angsuran, harga khusus anggota | Fase 3 |
| Koperasi | Perhitungan SHU, modul RAT (daftar hadir, laporan, voting) | Fase 3 |
| Diorama pixel | Satu adegan toko: pelanggan masuk, antre, scan, keluar | MVP |
| Diorama pixel | Adegan gudang (barang masuk) dan balai RAT | Fase 3 |
| Umum | Peran dan hak akses, dasbor penjualan, ekspor PDF dan Excel, log aktivitas | MVP |

## Konsep diorama pixel

Diorama adalah satu panel canvas berisi toko koperasi mini bergaya pixel art. Ia tampil di dasbor dan halaman login, dan bergerak berdasarkan transaksi nyata, bukan loop acak.

**Adegan toko (MVP)**

- Latar: tampak samping atau isometrik sederhana, berisi pintu, rak, meja kasir dengan scanner dan layar, serta jalur antre.
- Aktor: satu penjaga kasir pixel yang berdiri di meja kasir, dan beberapa pelanggan pixel yang berkeliling toko (melihat rak, mengambil barang, antre), dengan variasi warna rambut dan baju.
- Urutan satu pesanan: pelanggan masuk, mengambil barang dari rak, antre, menaruh barang di meja, kasir memindai barcode (garis laser pixel, "bip", barang pindah ke kantong), pembayaran (ikon koin atau QR), lalu pelanggan keluar dengan kantong.
- Detail kecil yang membuatnya terasa hidup: lampu kasir berkedip saat scan, angka total di layar mini mengikuti total nyata, kasir mengangguk, dan hari berganti siang ke malam sesuai jam toko.

**Adegan lanjutan (Fase 3)**

- Gudang: truk pixel menurunkan kardus saat barang masuk dicatat, dan rak terisi sesuai stok.
- Balai RAT: anggota duduk di kursi, dan koin SHU beterbangan ke tiap anggota saat SHU dibagikan.

**Aturan desain**

- Satu kanvas dasar rendah (misalnya 320 x 180 piksel) diskalakan dengan kelipatan bulat dan `image-rendering: pixelated` agar tetap tajam.
- Paleta terbatas (16 sampai 24 warna) hangat: krem, hijau daun, oranye kunyit, merah bata.
- Sprite dibuat langsung oleh Claude Code sebagai grid warna kecil (misalnya 16 x 16 piksel per karakter) di berkas kode atau JSON, tanpa alat gambar luar. Gayanya sederhana, bukan pixel HD, dengan 2 sampai 4 frame per gerakan.
- Opsi bunyi 8-bit (bip scanner, laci kasir) dengan tombol mute, mati secara bawaan.
- Di HP lemah atau jika pengguna memilih hemat daya, animasi turun ke gambar statis dengan ikon jumlah antrean.

## Arsitektur teknis

&#91;embedded content: arsitektur teknis · 2 zona, 7 komponen\]

Controller memanggil Action, Action menulis ke database lalu memancarkan event, dan Reverb menyiarkannya ke browser sehingga diorama bergerak. Diorama digambar dengan PixiJS (sprite sheet, ticker, dan penskalaan piksel sudah tersedia). Tumpukan lainnya: Laravel terbaru, Inertia + React, Tailwind, spatie/laravel-permission, Pest. Mode offline (PWA dengan IndexedDB) ditambahkan di Fase 2.

## Model data inti

Semua angka penting (stok, kas, simpanan) dihitung dari catatan mutasi yang tidak boleh diubah, bukan dari satu kolom yang ditimpa. Ini membuat audit pengawas dan RAT jauh lebih mudah.

| Tabel | Isi | Aturan kunci |
| --- | --- | --- |
| `products`, `product_units` | Produk, barcode, satuan (pcs, pak, dus) dan konversinya | Satu barcode dapat menunjuk satuan tertentu |
| `stock_movements` | Setiap barang masuk, keluar, retur, opname | Stok = jumlah mutasi, tidak pernah diedit, koreksi lewat mutasi baru |
| `sales`, `sale_items`, `payments` | Transaksi kasir, rinciannya, dan cara bayar | Transaksi yang sudah selesai tidak diedit, pembatalan membuat mutasi balik |
| `cash_shifts` | Buka dan tutup kasir, kas awal, kas akhir, selisih | Satu shift aktif per kasir |
| `members` | Anggota, nomor anggota, status, QR | Nomor anggota unik dan tidak dipakai ulang |
| `savings_ledger` | Setoran dan penarikan simpanan pokok, wajib, sukarela | Saldo dihitung dari ledger, bukan kolom saldo |
| `loans`, `loan_installments` | Pinjaman, jadwal angsuran, denda | Fase 3 |
| `shu_periods`, `shu_allocations` | Periode SHU dan pembagiannya per anggota | Fase 3 |
| `suppliers`, `purchase_orders` | Pemasok dan pesanan barang | Fase 2 |
| `activity_logs` | Siapa mengubah apa dan kapan | Wajib untuk data uang dan stok |

**Konvensi:** uang disimpan sebagai bilangan bulat rupiah (tanpa desimal), semua tabel utama memakai `soft deletes` kecuali ledger, dan setiap tabel transaksi menyimpan `created_by`.

## Alur utama dan pemetaan event ke animasi

&#91;embedded content: pemetaan event ke animasi · 5 pasangan\]

Alur nyatanya adalah tiga baris atas: transaksi dibuka, barang dipindai, pembayaran selesai. Layar kasir sendiri menggerakkan diorama langsung dari browser agar tanpa jeda, sedangkan layar lain menerimanya lewat Reverb. Diorama menampilkan paling banyak 5 pelanggan sekaligus, sisanya menjadi angka antrean.

## Roadmap bertahap

&#91;embedded content: peta jalan · 3 fase, 3 gerbang\]

Fase 1 sudah cukup untuk membuka toko dengan kasir, stok, simpanan, dan diorama. Fase 2 dan 3 dimulai hanya setelah gerbang sebelumnya lolos. Durasi belum ditetapkan karena bergantung pada kecepatan membuat aset pixel dan validasi aturan dengan pengurus koperasi.

Catatan: untuk versi tugas, roadmap di atas hanya gambaran jangka panjang. Ikuti tiga lapis di bagian "Versi tugas".

## Panduan untuk Claude Code

Kerjakan per fase, satu modul sekali jalan, dan minta tes ditulis bersama kodenya. Taruh ringkasan dokumen ini di berkas `CLAUDE.md` di akar proyek agar konteksnya selalu terbawa.

**Struktur proyek yang disarankan**

```text
app/
  Actions/        satu kelas satu aksi (CompleteSale, AdjustStock, PostSaving)
  Events/         SaleCompleted, StockMoved, MemberJoined
  Models/
  Policies/
resources/js/
  Pages/          halaman Inertia (Pos, Products, Members, Dashboard)
  diorama/
    engine/       game loop, antrean event, state machine aktor
    scenes/       StoreScene, WarehouseScene, HallScene
    sprites/      sprite sheet dan berkas atlas JSON
tests/Feature/    Pest, termasuk tes aturan stok dan simpanan
```

**Konvensi**

- Logika bisnis ada di `Actions`, controller tetap tipis.
- Semua perubahan stok dan simpanan lewat satu pintu (`AdjustStock`, `PostSaving`) agar ledger konsisten.
- Diorama hanya membaca event, tidak pernah mengubah data.
- Setiap fitur uang atau stok wajib punya tes Pest sebelum dianggap selesai.

**Urutan kerja**

1. Scaffold Laravel + Inertia + React + Tailwind, lalu autentikasi dan peran (spatie/laravel-permission).
2. Produk, satuan, dan `stock_movements` beserta tesnya.
3. Kasir: keranjang, scan barcode, pembayaran, struk, tutup kasir.
4. Anggota dan `savings_ledger`.
5. Mesin diorama dengan event palsu dulu (tombol "simulasi pesanan"), tanpa data nyata.
6. Hubungkan `SaleCompleted` lewat Reverb ke diorama.
7. Dasbor, ekspor, dan polesan performa.

**Prompt awal yang bisa ditempel ke Claude Code**

```text
Bangun aplikasi Laravel + Inertia + React + Tailwind untuk toko koperasi:
kasir, inventaris, dan simpanan anggota. Baca rencana di CLAUDE.md.
Mulai dari fase MVP langkah 1 dan 2 saja: scaffold, autentikasi dengan
peran (admin, kasir, bendahara), lalu produk dengan satuan dan
stock_movements berbasis ledger. Tulis tes Pest untuk aturan stok.
Jangan mengerjakan diorama dulu. Berhenti setelah langkah 2 dan
ringkas apa yang sudah jadi.
```

## Pembagian model, upaya, dan aturan izin

Model kuat dipakai hanya untuk bagian yang mahal kalau salah (uang, stok, simpanan), sisanya model ringan. Claude Code tidak berganti model sendiri, jadi satu tahap dikerjakan dalam satu sesi dan Anda yang mengganti model sebelum tahap berikutnya dimulai.

| Tahap | Pekerjaan | Model | Upaya |
| --- | --- | --- | --- |
| 0 | Sederhanakan skema dan aturan ledger (plan mode, belum ada kode) | Opus | sedang |
| 1 | Scaffold, login, tiga peran | Sonnet | sedang |
| 2 | Produk, satuan, `stock_movements` (plan mode dulu), pindah ke Opus bila logikanya bermasalah | Sonnet | sedang |
| 3 | Kasir: keranjang, scan, pembayaran, struk | Sonnet | sedang |
| 4 | Anggota dan `savings_ledger` (plan mode dulu) | Sonnet | sedang |
| 5A | Rancang diorama: adegan, grid, jalur jalan, state machine aktor, daftar sprite, palet warna (plan mode, belum ada kode) | Opus | tinggi |
| 5B | Mesin diorama: game loop, jalur jalan pelanggan, state aktor | Sonnet | tinggi |
| 5C | Sprite dan animasi: pelanggan, penjaga kasir, rak, scanner, kantong, dengan halaman pratinjau berskala 4x | Opus | tinggi |
| 5D-1 | Beranda: diorama memenuhi layar dengan data nyata (rak terisi sesuai stok), kartu "Hari Ini" di kiri atas, endpoint baca-saja dengan polling 5 detik untuk memutar penjualan, siang/senja/malam dari jam browser | Sonnet | tinggi |
| 5D-2 | Tombol pos dan karakter besar: tombol berlabel Kasir dan Inventaris di bawah karakter penjaga (tanpa balon), klik memunculkan karakter besar (potret diperbesar, tanpa ekspresi) dengan pilihan fitur, akses per peran dijaga di server, bunyi dan tombol senyap, mode hemat daya, klik pelanggan | Sonnet | tinggi |
| 5E-1 | Tema pixel, bagian 1: kerangka semua halaman (menu samping, header), halaman kasir, layar Transaksi Berhasil, riwayat transaksi, dengan potret kasir (pakai skill desain) | Sonnet | tinggi |
| 5E-2 | Tema pixel, bagian 2: inventaris, barang masuk, supplier, laporan (6C), pengguna, hak akses, dengan potret penjaga Inventaris (pakai skill desain) | Sonnet | tinggi |
| 6 | Data contoh dan tombol "simulasi pesanan" untuk demo (dikerjakan sebelum 5D) | Sonnet | sedang |
| 6B | Peran koperasi/admin: kelola pengguna dan hak akses, supplier (data master, dihubungkan ke stok masuk) | Sonnet | Medium |
| 6C | Laporan penjualan dan inventaris (filter tanggal, ekspor CSV) dan ringkasan angka di dasbor | Sonnet | Medium |
| 7 | Bonus: SHU dan pinjaman sederhana | Sonnet | sedang |
| 8 | Bonus: Reverb dan layar diorama terpisah | Sonnet | sedang |
| 9 | Review ringan, README, bahan presentasi | Sonnet | sedang |

Bug sulit di tahap mana pun: pindah ke Opus dengan upaya tinggi, lalu kembali ke model tahap itu.

**Agar tidak selesai semuanya sekaligus**

- Awali setiap prompt dengan "Kerjakan hanya Tahap N, lalu berhenti".
- Setelah tiap tahap, Claude Code menulis `PROGRESS.md`: apa yang selesai, apa yang belum, serta model dan upaya yang disarankan untuk tahap berikutnya.
- Mulai sesi baru untuk tahap berikutnya setelah Anda mengganti model.
- Tahap 0, 2, 4, dan 5A dimulai di plan mode sehingga rencananya Anda setujui sebelum ada kode.

**Persetujuan visual untuk diorama (Tahap 5)**

Bagian visual paling mudah melenceng dari ide pemilik, jadi Claude Code wajib memperlihatkan hasilnya dan berhenti menunggu persetujuan di setiap langkah.

- **Sebelum 5A:** Anda menulis ide diorama di `docs/visi-diorama.md` (suasana, isi toko, siapa yang berkeliling, apa yang dilakukan kasir). Itu menjadi patokan semua tahap visual.
- **5A:** sebelum kode apa pun, tampilkan denah toko (gambar teks atau halaman pratinjau sederhana), daftar sprite, dan palet warna. Berhenti sampai disetujui.
- **5C:** buat halaman pratinjau `/diorama-lab`, jalankan server pengembangan, dan beri tahu alamatnya. Kalau bisa mengambil tangkapan layar, tampilkan juga. Kerjakan satu karakter dulu, perlihatkan, tunggu persetujuan, baru lanjut ke elemen berikutnya.
- **Tiap elemen baru** (kasir, rak, scanner, pelanggan lain) diperlihatkan dulu sebelum dilanjutkan, dan direvisi sampai Anda setuju.
- **5E:** tampilkan satu halaman contoh (misalnya halaman kasir) dengan tema pixel sebelum diterapkan ke semua halaman.

**Isi `CLAUDE.md` untuk aturan kerja**

```text
## Aturan kerja
- Jangan bertindak di luar yang diminta. Jika ada saran, rekomendasi,
  perbaikan tambahan, refactor, paket baru, atau perubahan skema,
  tulis sarannya lalu TANYA izin dulu. Jangan dikerjakan sebelum saya setuju.
- Tanyakan dulu sebelum: menambah dependensi, mengubah migration yang
  sudah ada, menghapus berkas, menjalankan perintah yang mengubah data,
  atau mengubah aturan uang, stok, dan simpanan.
- Untuk logika uang, stok, dan simpanan: jelaskan rencana dulu, tunggu
  persetujuan, baru tulis kode dan tesnya.
- Kerjakan hanya satu tahap per sesi. Setelah selesai, tulis ringkasan
  dan model serta upaya yang disarankan untuk tahap berikutnya di
  PROGRESS.md, lalu berhenti. Jangan lanjut tanpa izin.
```

Biarkan pengaturan izin Claude Code di mode bawaan yang bertanya sebelum mengubah berkas atau menjalankan perintah, jangan mode setuju-otomatis.

## Skill dan plugin untuk Claude Code

Pasang sedikit saja, karena tiap plugin menambah konteks dan memakan pemakaian langganan. Pemasangan dilakukan sendiri di Claude Code lewat menu `/plugin`.

| Plugin atau skill | Dipakai di tahap | Cara memasang |
| --- | --- | --- |
| laravel-best-practices | 1 sampai 8 (semua kode Laravel dan Inertia) | `/plugin`, buka Discover, cari namanya |
| laravel-boost | 1 sampai 4 (migration, route, Eloquent) | `/plugin install laravel-boost@claude-plugins-official` |
| php-lsp | 1 sampai 8 (pemeriksaan kode PHP) | `/plugin install php-lsp@claude-plugins-official` |
| frontend-design | 3 dan 5 (antarmuka kasir, diorama) | pasang bila belum ada di Claude Code |
| web-animation-design | 5 dan 6 (gerak diorama) | pasang bila belum ada di Claude Code |

Periksa dulu pembuat dan isi tiap plugin sebelum memasang, terutama yang dibuat komunitas. Jangan memasang Laravel AI Starter, karena ia membuat proyek sendiri dan melompati kontrol tahap.

Tambahkan satu baris ini di bagian "Aturan kerja" pada `CLAUDE.md`: gunakan skill yang relevan bila sudah terpasang, tetapi jangan memasang plugin atau skill sendiri, tanyakan dulu.

## Risiko dan pertanyaan terbuka

Risiko terbesar bukan teknis, melainkan aturan koperasi yang berbeda-beda dan aset pixel yang butuh waktu.

| Risiko | Dampak | Penanganan |
| --- | --- | --- |
| Aturan simpanan, pinjaman, dan SHU berbeda tiap koperasi | Fase 3 harus dibuat ulang | Buat aturan dapat dikonfigurasi, validasi dengan bendahara sebelum Fase 3 |
| Aset pixel (sprite, animasi) lama dibuat | Diorama tertunda | Sprite dibuat dari kode di Claude Code, mulai dengan 1 kasir, 3 pelanggan, 1 rak, lalu tambah bertahap |
| Internet toko tidak stabil | Kasir macet | Mode offline di Fase 2, MVP wajib tetap ringan |
| HP atau PC kasir lemah | Diorama menghambat kasir | Mode hemat daya, batasi 30 FPS, tampilkan statis bila perlu |
| Banyak transaksi bersamaan | Layar penuh pelanggan pixel | Batasi antrean tampil (misalnya 5 orang), sisanya jadi angka |

**Pertanyaan yang perlu dijawab**

- Apakah satu koperasi atau banyak koperasi (multi tenant)? Ini memengaruhi desain database sejak awal.
- Perangkat kasir apa yang dipakai: PC, tablet, atau HP? Printer thermal merek apa?
- Berapa variasi tampilan pelanggan pixel yang diinginkan (misalnya beberapa kombinasi warna baju dan rambut)?
- Pembayaran QRIS lewat penyedia mana (atau manual dulu)?
- Apakah diorama ditampilkan juga di layar pelanggan (customer display) atau hanya di dasbor?

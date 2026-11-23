# PROGRESS

## Tahap 5E-2: Tema pixel bagian 2, inventaris dan halaman tabel (23 Nov 2026)

Status: **selesai, ketiga langkah disetujui pemilik, belum di-commit (menunggu izin).** Tidak ada migration, tidak ada paket npm atau composer baru, dan tidak ada perubahan aturan uang, stok, atau hak akses. Server hanya mendapat bacaan baru: kartu angka, daftar Stok Keluar, detail penerimaan, dan `image_url`. Semua penulisan stok tetap lewat `AdjustStock` dan `ReceiveStock` yang tidak disentuh.

### Yang sudah selesai

- **Langkah 1, Inventaris (Produk):**
  - **Kepala bersama** (`components/inventory/inventory-header.tsx`):
    - 4 kartu angka: Total produk, Stok tersedia, Stok menipis, Stok habis;
    - tab Daftar Barang, Stok Masuk, Stok Keluar. Dua tab terakhir hanya tampil untuk admin.
  - **Sumber angka kartu:** `App\Actions\Inventory\InventoryStats`, hanya membaca produk aktif.
    - Stok dari `Product::withStock` dan status dari `InventoryReport::statusFor`, jadi menipis + habis = angka "Stok menipis" di Beranda.
    - Stok tersedia = jumlah stok (satuan dasar) dari produk yang stoknya > 0.
  - **Tabel Daftar Barang:**
    - gambar barang per baris (`ProductThumb`); bila belum ada gambar, ikon kardus pixel;
    - lencana Aman/Menipis/Habis (`stockStatus` yang sama dengan kasir);
    - ikon Kartu stok dan Ubah (Ubah khusus admin);
    - pagination "Menampilkan x–y dari z".
  - **Tombol dan potret:** tombol "Tambah Produk" tetap ada (admin). Potret gurita di kanan bawah (`GuardCorner`, disembunyikan di layar kecil).
  - **Halaman baru Stok Keluar** (`/stok-keluar`, hanya admin, hanya membaca):
    - mutasi keluar dari penjualan dan koreksi minus, dengan nomor nota dan tanda "dibatalkan" untuk penjualan yang di-void;
    - controller `StockOutController`, relasi baru `StockMovement::saleItem()`.
- **Langkah 2, Barang masuk, Supplier, Penyesuaian stok:**
  - **Detail penerimaan baru** (`/penerimaan-barang/{id}`, hanya admin, hanya membaca):
    - supplier dengan kontak dan alamat, tanggal, pencatat, dan catatan;
    - daftar item dengan satuan input, konversi, qty dasar, dan harga beli, beserta total;
    - nomor di daftar Barang masuk menaut ke halaman ini.
  - **Form bergaya pixel:** Barang masuk, Penyesuaian stok, Supplier, dan Produk memakai `PixelPanel` dan kelas `.pixel-form` (isian bertepi tinta, fokus biru tua).
  - **Halaman lain:** daftar Supplier, Kartu stok, dan Kategori ikut diberi gaya.
  - Judul breadcrumb koreksi stok menjadi "Penyesuaian stok", sama dengan menu.
- **Langkah 3, Laporan, Pengguna, Hak akses:**
  - **Laporan penjualan dan inventaris:**
    - kartu angka berikon dengan warna palet;
    - tombol periode bergaya tab; Ekspor CSV dan Terapkan bergaya tombol pixel;
    - tabel berkepala krem; batang harian kunyit;
    - potret di kanan bawah: zombie di laporan penjualan, gurita di laporan inventaris;
    - kartu laporan inventaris memakai 5 kolom hanya di layar sangat lebar (di 1366 px tersusun 3 + 2), supaya "Nilai stok" tidak terpotong.
  - **Pengguna:** tombol Tambah pengguna, ikon Ubah, dan tombol Aktifkan/Nonaktifkan seperti di Supplier. Form pengguna memakai panel pixel.
  - **Hak akses:**
    - kartu peran berbingkai pixel;
    - centang matriks dalam kotak hijau daun;
    - tombol Simpan ganti peran bergaya pixel.
- **Komponen bersama baru** (`components/pixel/`):
  - `styles.ts`: kelas tombol utama dan kedua, tombol ikon, tombol Aktifkan/Nonaktifkan, tab, isian, serta kepala, badan, dan baris tabel;
  - `pixel-glyph.tsx`: glif 8 × 8 untuk ubah, kartu, cari, awas, habis, masuk, keluar, tambah;
  - `pixel-panel.tsx` dan `guard-corner.tsx`.
- **Komponen lama yang berubah tampilannya:**
  - `StatCard`: ikon dan warna, dipakai juga di laporan;
  - `Pagination`: kotak pixel dan keterangan jumlah;
  - `BigPortrait`: opsi `flip`;
  - `PeriodFilter`.
- **Perubahan lain:**
  - grup menu Inventaris kini ikut menyala di `/stok-keluar` (`MenuGroup.paths`);
  - **AccessMap** mendapat baris "Stok keluar (daftar mutasi)" untuk admin.
- **Judul ganda:** judul di isi halaman-halaman di atas diganti satu kalimat keterangan, karena judul sudah ada di header. Usulan ini tercatat "perlu izin" di 5E-1 dan terlihat di tiap langkah yang disetujui.
- **Tes:**
  - **Pest baru:** `Inventory/InventoryHeaderTest` dan `Inventory/StockReceiptDetailTest`. Isinya: kartu angka, `image_url`, isi Stok Keluar (termasuk penjualan yang dibatalkan), detail penerimaan, serta 403 untuk kasir dan bendahara.
  - **Vitest:** `menu.test.ts` ditambah pemeriksaan tautan aktif Stok Keluar.
  - **Hasil:** 393 tes Pest dan 223 tes Vitest lulus; Pint, tsc, dan lint (`resources/js`) bersih.
- **Dicoba di browser** (1366 × 768):
  - **sebagai admin:** semua halaman di atas;
  - **sebagai kasir:** hanya tab Daftar Barang, tanpa aksi dan tanpa Tambah Produk.

### Batasan dan hal yang perlu diketahui

- **Tidak dibuat:** Stock Opname, menu Pembelian, Pengaturan, dan Koperasi, sesuai permintaan. Halaman Anggota tidak disentuh.
- **Tanpa potret:** Pengguna dan Hak akses tidak diberi potret penjaga karena tidak termasuk pos mana pun. Mudah ditambahkan bila diinginkan.
- **Font pixel hilang setelah Vitest:** masih terjadi, karena usul perbaikannya belum diizinkan. Jalankan ulang Vite setelah `npx vp test`.
- **Peringatan lint lama:** peringatan di `docs/referensi-karakter/alat/*.js` sudah ada sejak sebelumnya dan bukan bagian tahap ini.
- **Komentar migration:** komentar di migration gambar produk yang menyebut "rak diorama" tetap dibiarkan, karena migration lama tidak diubah tanpa izin.
- **Belum digayakan:** dialog batal penjualan di riwayat kasir masih komponen bawaan (dari 5E-1).

### Saran untuk tahap berikutnya

**Tahap 7** (bonus: SHU dan pinjaman sederhana): **Sonnet, upaya sedang**, sesuai tabel di `claude.md`.

- **Plan mode lebih dulu:** tahap ini menyentuh uang dan simpanan, jadi aturan pinjaman, angsuran, dan pembagian SHU perlu disetujui sebelum ada kode.
- **Ledger:** pinjaman dan SHU mengikuti pola ledger yang hanya bisa ditambah (`savings_ledger`, `PostSaving`), dengan tes Pest wajib.
- **Pos Koperasi** di Beranda masih ditunda. Bila halaman Anggota ikut diberi gaya pixel, pakai ulang `components/pixel/` dan `PixelTable`.
- **Bila bonus Tahap 7 dan 8 dilewati,** lanjut ke **Tahap 9** (review ringan, README, bahan presentasi): Sonnet, upaya sedang.
- Mulai sesi baru setelah mengganti model.

---

## Tahap 6D: Tambah produk dari sidebar dan pos Kasir (23 Nov 2026)

Status: **selesai, disetujui pemilik, sudah di-commit (e383815).** Tugas kecil di luar tabel tahap: CRUD produk sudah ada sejak Tahap 2, jadi yang dikerjakan hanya memunculkannya. Tidak ada migration, tidak ada paket baru, dan aturan akses tidak berubah. Rute tambah produk tetap `role:admin`, dan kasir tidak mendapat hak mengelola produk.

### Yang sudah selesai

- **Sidebar:** menu "Tambah Produk" di grup Kasir, hanya untuk admin (`components/layout/menu.ts`), menuju form tambah produk yang sudah ada (`/produk/baru`). Ubah dan nonaktifkan produk tetap lewat Inventaris → Produk, atau tautan "Kembali" di form; tidak ada halaman baru.
- **Pos Kasir di diorama:** pilihan "Tambah produk" ditambahkan ke `App\Enums\Post` dengan `admin_only`. `DashboardPostController` dan `PostPanel` tidak diubah, karena mekanisme `note` yang sama dengan "Laporan penjualan" langsung berlaku: aktif untuk admin, redup "khusus admin" untuk kasir.
- **Revisi pemilik:** form tambah produk bisa langsung memilih gambar barang, dengan pratinjau dan tombol Batal pilih.
  - Gambar ikut terkirim saat Simpan, lalu dipasang `SetProductImage` setelah `SaveProduct` (tidak berubah) membuat produk.
  - Aturan berkas sama dengan unggah gambar (`ProductImageRequest::IMAGE_RULES`). Gambar tidak sah menggagalkan simpan tanpa membuat produk.
  - Form ubah tetap memakai bagian Unggah/Lepas gambar tersendiri. Keterangan "rak diorama" di bagian gambar dihapus, karena gambar di rak dibatalkan.
- **AccessMap tidak diubah:** baris "Tambah dan ubah produk" (admin, `products.create`) sudah ada, dan tes kecocokan tetap lulus.
- **Tes:**
  - `DashboardPostTest`: pilihan pos untuk admin dan kasir, serta kasir 403 di `GET /produk/baru` dan `POST /produk`;
  - `ProductImageTest`: tambah produk dengan gambar, tanpa gambar, dan gambar tidak sah;
  - `menu.test.ts`: menu hanya untuk admin, beserta tautan aktifnya.
  - Hasil: 384 tes Pest dan 223 tes Vitest lulus; Pint, tsc, dan lint bersih.
- **Dicoba di browser:**
  - **sebagai admin:** menu tampil dan menyala di form; pos Kasir menampilkan "Tambah produk" aktif; pratinjau gambar di form tambah (form tidak disimpan);
  - **sebagai kasir:** menu tidak tampil, pilihan pos redup "khusus admin", dan `/produk/baru` 403.

### Catatan

- Komentar di migration `2026_11_23_090000_add_image_path_to_products_table` masih menyebut "rak diorama". Dibiarkan, karena migration yang sudah ada tidak diubah tanpa izin, dan itu hanya komentar.

---

## Tambahan: gambar barang dan data contoh empat produk (23 Nov 2026)

Status: **disetujui pemilik, sudah di-commit (1c337f4).** Ada satu migration baru (migration lama tidak diubah) yang sudah dijalankan di database lokal `kasir` atas izin pemilik. Aturan uang, stok, dan penjualan tidak berubah.

### Keputusan pemilik

- **Barang yang dipertahankan:** Air mineral 600 ml (gambar botol), Cokelat batang (gambar Choco Cat), Biskuit kelapa (gambar Biscoff), Keripik singkong (gambar keripik). Barang lain akan ditambah pemilik sendiri lewat aplikasi.
- **Penghapusan:** 18 produk lain dihapus lunak; riwayat penjualan dan ledger tetap utuh.
- **Penyimpanan gambar:** kolom gambar di produk, diunggah lewat form Produk.
- **Rak diorama:** bungkus mini **dibatalkan**. Rak tetap mengikuti stok nyata seperti rancangan 5D-1, jadi kini tampak cukup kosong karena barang rak tinggal tiga. Diorama tidak diubah.

### Yang sudah selesai

- **Skema:** migration `2026_11_23_090000_add_image_path_to_products_table` (kolom `image_path`, boleh kosong). `Product::imageUrl()` mengembalikan `/storage/...`, jadi mengikuti host yang dipakai.
- **Unggah gambar** (hanya admin):
  - rute `POST` dan `DELETE /produk/{id}/gambar`, terpisah dari simpan produk sehingga `SaveProduct` tidak berubah;
  - Action `SetProductImage`: nama berkas acak di disk `public/produk`, berkas lama dihapus, dicatat di `activity_logs`;
  - validasi PNG/WebP/GIF/JPG, paling besar 2 MB dan 2000 × 2000.
- **Form Produk:** bagian "Gambar barang" dengan pratinjau, Unggah gambar, dan Lepas gambar (hanya saat ubah; produk baru disimpan dulu).
- **Kasir:** katalog membawa `image_url`, dan kartu grid menampilkan gambar (paling besar 48 px). Tanpa gambar tetap ikon kardus.
- **Gambar keempat barang:** latarnya dibuang dengan `docs/referensi-antarmuka/ikon-menu/ikon.cjs`, yang mendapat opsi baru `BG_WHITE` untuk latar putih murni (badan botol bening tetap utuh). Watermark dan kartu latar ikut terbuang. Hasilnya di `database/seeders/gambar-produk/{SKU}.png`, sedangkan gambar asli dan pratinjaunya di `docs/referensi-antarmuka/gambar-barang/` (folder pemilik).
- **Database lokal `kasir`:**
  - migration dijalankan;
  - `php artisan storage:link` (tautan `public/storage`);
  - 18 produk dihapus lunak (dicatat `product.deleted`): DM-001 sampai DM-008, DM-102 sampai DM-106, DM-204, DM-301 sampai DM-304;
  - keempat barang diberi gambar.
- **Seeder data contoh:** hanya empat produk (stok penuh, setengah, sedikit, kosong), dan gambarnya dipasang otomatis.
- **Tes:**
  - Pest baru `Inventory/ProductImageTest`: simpan, tampil di form dan katalog kasir, ganti menghapus berkas lama, lepas, berkas ditolak, kasir dan bendahara 403. Tes memakai PNG kecil dari base64 karena ekstensi GD tidak terpasang.
  - `DemoDataTest` disesuaikan: empat produk bergambar, disk `public` dipalsukan, dan simulasi 5 kali, bukan 20, karena stok contoh lebih sedikit.
  - Hasil: 383 tes Pest dan 222 tes Vitest lulus; Pint, tsc, dan lint bersih.

### Batasan dan hal yang perlu diketahui

- **Kategori kosong:** Sembako dan Kebutuhan rumah kini tanpa produk, tetapi masih ada di halaman Kategori (tidak dihapus).
- **Latar gambar unggahan:** gambar yang diunggah dipakai apa adanya; aplikasi tidak membuang latarnya. Pakai PNG berlatar transparan.
- **Penyimpanan di server lain:** perlu `php artisan storage:link` sekali, dan folder `storage/app/public/produk` ikut dicadangkan.
- **Hak cipta:** gambar barang tampak berasal dari internet (merek Biscoff dan gaya Choco Cat). Aman untuk tugas dan demo, jangan dipublikasikan atau dikomersialkan.

---

## Tahap 5E-1: Tema pixel bagian 1, kerangka dan halaman kasir (22–23 Nov 2026)

Status: **selesai, ketiga langkah disetujui pemilik, sudah di-commit (fb0fd71).** Tidak ada migration, tidak ada paket npm atau composer baru, dan tidak ada perubahan aturan uang, stok, atau simpanan: `CompleteSale`, harga dari server, stok, dan pembatalan (khusus admin) tidak disentuh.

### Keputusan pemilik

- **Font:** Pixelify Sans lewat Bunny Fonts, dengan mekanisme yang sama seperti Instrument Sans (`vite.config.ts`, izin pemilik). Dipakai untuk judul, angka besar, dan tombol; tabel dan isian tetap Instrument Sans.
- **Tema selalu terang:** mode gelap tidak dipasang. Pengaturan Appearance di Settings kini tidak berpengaruh.
- **Susunan menu:** Beranda; Kasir (Transaksi, Riwayat transaksi); Inventaris (Produk, Barang masuk, Penyesuaian stok, Supplier, Kategori); Laporan (Penjualan, Inventaris); Anggota; Admin (Pengguna, Hak akses, Diorama lab). Tiap peran hanya melihat menu yang boleh dibukanya.
- **Gaya menu samping**, ditetapkan setelah beberapa revisi:
  - kayu C20, lalu oak gelap: keduanya ditolak;
  - pilihan akhir: **gaya kafe cokelat kopi** dari prototipe `docs/prototipe/sidebar-kopi-senja.html`, dengan tekstur serat kayu alami bergaya pixel;
  - **9 warna kopi di luar palet diizinkan khusus untuk menu** (token `--color-kopi-*` di `app.css`). Palet diorama tetap 24 warna, dan warna kopi tidak boleh dipakai di sprite.
- **Tombol Simpanan anggota:** tampil nonaktif dengan keterangan "segera hadir". Pembayaran tetap hanya tunai.
- **Grid produk:** **server mengirim katalog** saat layar kasir dibuka (hanya baca).

### Yang sudah selesai

- **Langkah 1, kerangka semua halaman:**
  - **Menu samping** (`app-sidebar.tsx`, susunan di `components/layout/menu.ts`):
    - papan kopi bersudut bertangga 6 px dengan bingkai 3 px yang ikut bertangga (`drop-shadow` di `.sidebar-kopi`);
    - tekstur serat `resources/images/kopi-serat.svg`: ubin 64 × 96 digambar 3×, hanya warna kopi;
    - garis putus-putus; grup aktif berlatar karamel tua dengan bingkai karamel; hover naik-turun 2 px dengan `steps(2)`, mati bila pengguna meminta gerak dikurangi;
    - ikon pixel baru "beranda" dan "toko", dan kotak pengguna di bawah;
    - mode ikon 66 px dan laci di HP.
  - **Header** (`app-sidebar-header.tsx`): judul halaman dalam font pixel, keterangan dari menu, serta tanggal dan jam (diperbarui tiap 15 detik, aman untuk SSR).
  - **Dibuang:** tautan Repository dan Documentation bawaan starter kit.
- **Langkah 2, halaman kasir** (`components/pos/*`):
  - **Kolom cari:** satu kolom untuk cari sekaligus scanner, dan selalu kembali fokus seperti sebelumnya. Saat Enter: barcode persis dari katalog masuk langsung; satu-satunya barang yang cocok ikut masuk; bila tidak ada yang cocok, server ditanya seperti scan biasa.
  - **Tab kategori:** Semua, kategori menurut abjad, dan Lainnya untuk barang tanpa kategori.
  - **Grid produk:**
    - lencana stok: aman (daun), menipis (kunyit), habis (bata);
    - barang yang habis tidak bisa diklik;
    - satuan lain tampil sebagai tombol "+ dus".
  - **Keranjang:**
    - − dan + serta isian jumlah, tombol hapus, dan peringatan bila jumlah melebihi stok;
    - subtotal dan total besar;
    - pilihan anggota (opsional);
    - Tunai, dan Simpanan anggota yang nonaktif;
    - uang diterima dengan tombol cepat Pas, 20rb, 50rb, 100rb, lalu Proses Pembayaran.
  - **Potret zombie** di kiri bawah dengan balon "Total belanja".
  - **Server:** `PosController` mengirim `catalog`, yaitu produk aktif dengan kategori, stok dari ledger (satu kueri `withStock`), dan satuan (dasar lebih dulu). `PosProduct::unit()` kini bisa menerima stok yang sudah diketahui.
- **Langkah 3, Transaksi Berhasil dan riwayat:**
  - **Halaman struk** kini memakai kerangka aplikasi. Kartu "Transaksi Berhasil!" muncul hanya tepat setelah bayar, ditandai flash `sale.completed` untuk nota itu (tanpa perubahan server). Isinya zombie, centang, total, tunai dan kembalian, Cetak Struk, dan Transaksi Baru (langsung terfokus, jadi cukup tekan Enter).
  - **Struk dari riwayat:** hanya kertas struk dengan Cetak Struk dan Kembali ke riwayat. Saat dicetak, hanya kertas struk 80 mm yang keluar.
  - **Riwayat transaksi:**
    - tab Semua, Hari Ini, 7 Hari, Bulanan (`?periode=`, memakai `ReportPeriod` zona WIB; nilai lain dianggap Semua);
    - tabel pixel dengan lencana Selesai/Batal;
    - aturan cakupan tetap: kasir melihat penjualannya sendiri, admin melihat shift yang terbuka; pembatalan tetap khusus admin.
- **Tes:**
  - **Pest baru:** katalog (produk aktif, kategori, satuan, stok, tidak dikirim tanpa shift) dan saringan periode riwayat (termasuk batas 00.30 WIB).
  - **Vitest baru:** `layout/menu`, `layout/kopi-serat` (ubin hanya warna kopi, 9 token), dan `pos/catalog` (status stok, tab, saringan, barcode).
  - **Hasil:** 378 tes Pest dan 221 tes Vitest lulus; Pint, tsc, dan lint bersih.
- **Dicoba di browser** (1366 × 768 dan HP):
  - menu per peran (admin, kasir); laci HP; mode ikon;
  - grid: klik kartu, "+ dus", cari lalu Enter, tab kategori, Pas membuat Proses Pembayaran aktif;
  - riwayat: keempat tab; struk dari riwayat; dialog batal sebagai admin (ditutup tanpa membatalkan);
  - kartu Transaksi Berhasil, dengan flash dipasang dari browser lewat `router.flash`.

### Tambahan setelah commit fb0fd71: ikon menu dari gambar pemilik (disetujui, di-commit e9d6e6a)

- **Revisi ikon Beranda (belum di-commit):** diganti gambar toko baru dari pemilik (`asli/beranda-2.png`, sudah berlatar transparan; `ikon.cjs` kini menganggap piksel transparan sebagai latar). Warnanya dirata-ratakan dan diberi garis tepi tinta 1 piksel seperti ikon Kasir. Ukurannya 32 × 26.
- **Revisi ikon Kasir (di-commit 8eb0a9f):** diganti gambar komputer baru dari pemilik (`asli/kasir-2.png`). Latar hitamnya dibuang lewat opsi baru `BG_DARK` di `ikon.cjs`, potongan kabel kecil ikut dibuang, warnanya dirata-ratakan supaya layar biru dan logo masih terlihat, lalu diberi garis tepi tinta 1 piksel (opsi `OUTLINE`). Ukurannya 30 × 32.

- **Ikon gambar:** Beranda (toko), Kasir (komputer), Inventaris (ransel), dan Laporan (gulungan) memakai gambar pemilik tanpa latar. Anggota dan Admin tetap memakai ikon pixel lama.
- **Pengolahan:** latar dibuang, termasuk pola kotak-kotak dan celah yang terkurung tali atau kabel. Gambar komputer diubah dulu dari WebP lewat codec Windows. Setiap gambar lalu disusutkan ke kisi paling besar 32 piksel dengan warna terbanyak per sel; khusus toko, warnanya dirata-ratakan. Hasilnya tampil 1:1.
- **Ukuran (revisi pemilik):** semua kotak ikon menu, termasuk logo, berukuran 32 × 32 px, sama dengan avatar profil, sehingga teks menu sejajar.
- **Berkas:**
  - ikon aplikasi di `resources/images/menu/`, dipasang lewat `image` di `components/layout/menu.ts`;
  - gambar asli, hasil olahan beserta pratinjau 8×, dan alat `ikon.cjs` di `docs/referensi-antarmuka/ikon-menu/` (folder pemilik, tidak di-commit). Alat itu butuh `png.cjs`, yaitu salinan `docs/referensi-karakter/alat/png.js`.
- **Warna dan pemakaian:** ikon memakai warna asli gambar, bukan 24 warna palet, seperti karakter. Gambarnya tampak dari internet: aman untuk tugas dan demo, tetapi jangan dipublikasikan atau dikomersialkan tanpa izin pembuatnya.
- **Tes:** Vitest `layout/menu` memastikan keempat menu memakai ikon gambar. Seluruhnya 222 tes Vitest lulus; tsc dan lint bersih.

### Batasan dan hal yang perlu diketahui

- **Belum dicoba sungguhan:**
  - Proses Pembayaran tidak saya klik, supaya tidak mencatat penjualan di database `kasir`;
  - Cetak Struk belum dicoba ke printer.
- **Font pixel hilang setelah Vitest:** setiap kali `npx vp test` dijalankan, plugin font milik Vite ikut berjalan lalu menghapus `public/fonts-manifest.dev.json` milik server pengembangan. Akibatnya font pixel hilang sampai Vite dijalankan ulang. Hasil build produksi tidak terpengaruh. Usul perbaikan satu baris (daftar font kosong saat Vitest) belum dipasang, menunggu izin.
- **Proses Vite tertinggal di Windows:** menghentikan tugas latar belakang tidak ikut menghentikan proses anak Vite. Hentikan dengan `taskkill /T` pada proses `npm run dev`.
- **Judul ganda:** judul di dalam isi halaman lain (misalnya Produk) masih dobel dengan judul header. Isi halaman sengaja tidak diubah; bisa dirapikan di 5E-2.
- **Komponen bawaan:** dialog batal dan paginasi masih bergaya komponen bawaan (warna tema, sudut kotak).
- **Di HP:** keranjang kasir ada di bawah grid. Layar kasir dirancang untuk PC atau tablet mendatar.
- **Prototipe:** `docs/prototipe/sidebar-kopi-senja.html` adalah prototipe mandiri (pemutar musik, merek "Kopi Senja"). Entri "prototipe" ditambahkan ke `.claude/launch.json` untuk membukanya.
- **Server lokal:** `php artisan serve` berjalan di port **8000** (database `kasir`), ditambah Vite dan MariaDB. Browser pratinjau masuk sebagai admin.

### Saran untuk tahap berikutnya

**Tahap 5E-2** (tema pixel bagian 2: inventaris dengan kartu angka dan tab Daftar Barang, Stok Masuk, dan Stok Keluar; detail barang masuk; supplier; laporan 6C; pengguna; hak akses; potret penjaga Inventaris (gurita) di kanan bawah): **Sonnet, upaya tinggi**, memakai skill desain (frontend-design).

- **Pakai ulang:** `PixelTable` dan `Badge`, `StockBadge` dan `stockStatus` (`components/pos/catalog.ts`), gaya tab dan tombol dari layar kasir, `BigPortrait post="inventaris"`, serta token palet `px-*` dan utilitas `pixel-frame`.
- **Usulan yang perlu izin lebih dulu:**
  - pisahkan tab, tombol, dan dialog pixel menjadi komponen bersama;
  - rapikan judul ganda di isi halaman;
  - pasang perbaikan font saat Vitest.
- Tampilkan satu halaman contoh (misalnya Inventaris) sebelum diterapkan ke halaman lain.
- Mulai sesi baru setelah mengganti model.

---

## Tahap 6C: Laporan penjualan dan inventaris, ringkasan di Beranda (22 Nov 2026)

Status: **selesai, disetujui pemilik, sudah di-commit (c0166ab).** Tidak ada migration, tidak ada perintah yang mengubah database, dan tidak ada paket baru. Laporan hanya membaca; ledger, aturan stok, dan data penjualan tidak diubah.

### Keputusan pemilik

- Nilai stok memakai **harga jual** (stok × harga jual satuan dasar).
- "Laporan penjualan" di pos Kasir: **nonaktif dengan keterangan "khusus admin"** untuk selain admin.
- CSV: pemisah **titik koma (;)** dan penanda UTF-8.
- Tambahan saat persetujuan rencana: sel teks CSV yang diawali `=`, `+`, `-`, `@` diberi awalan `'`; saldo periode harus memakai urutan yang sama dengan `Product::withStock` dan tepat untuk mutasi berwaktu sama.

### Yang sudah selesai

- **Periode** (`App\Support\ReportPeriod`): hari ini, 7 hari, bulan ini, rentang bebas (maks. 366 hari, tidak di masa depan, "sampai" ≥ "dari"); tanggal dalam zona tampilan (WIB), kueri dalam UTC.
- **Laporan penjualan** (`/laporan/penjualan`, `App\Actions\Reports\SalesReport`): total, jumlah transaksi, rata-rata (dibulatkan ke rupiah terdekat), penjualan per hari (hari tanpa penjualan tetap tampil), 10 produk terlaris (menurut `base_qty`), per kasir, filter kasir. **Penjualan sah = tanpa baris `sale_voids`**; yang dibatalkan tidak dihitung di angka mana pun dan tampil terpisah (nomor, waktu, kasir, total, alasan, pembatal).
- **Laporan inventaris** (`/laporan/inventaris`, `App\Actions\Reports\InventoryReport`): produk aktif; stok = `Product::withStock` (mutasi `id` terbesar); status kosong ≤ 0, menipis ≤ minimum, aman di atasnya; nilai stok; daftar "Perlu diisi"; mutasi per periode: masuk = opening + receipt, keluar = sale + sale_void (bersih), penyesuaian = adjustment. Saldo awal/akhir periode = **jumlah qty** sebelum awal / sampai akhir periode (tidak bergantung urutan; Barang masuk boleh bertanggal mundur), dengan identitas saldo awal + mutasi = saldo akhir.
- **Satu sumber dengan Beranda:** `TodaySummary` kini hanya memanggil `SalesReport::summary(ReportPeriod::today())` dan `InventoryReport::lowStockCount()`; polling Beranda ikut otomatis.
- **CSV** (`/laporan/penjualan/csv`, `/laporan/inventaris/csv`, `App\Support\CsvWriter`): satu baris per penjualan (Selesai/Dibatalkan) dan satu baris per produk; pengaman rumus pada teks, angka tetap angka.
- **Menu dan pos:** ikon Laporan di Beranda (admin) menuju laporan penjualan; sidebar admin: Laporan penjualan dan Laporan inventaris; pos Kasir "Laporan penjualan" aktif untuk admin, "khusus admin" untuk lainnya (server mengirim `note` per pilihan, `PostPanel` menampilkannya); `AccessMap` mendapat dua baris laporan.
- **Tes:** Pest baru `Reports/SalesReportTest` dan `Reports/InventoryReportTest` (total dicocokkan langsung dengan tabel `sales`, void terpisah, rata-rata, per hari dan per kasir = total, terlaris, filter kasir, batas zona waktu, validasi rentang, isi CSV dan pengaman rumus, status di batas, nilai stok, mutasi per jenis, mutasi berwaktu sama dan bertanggal mundur, identitas saldo, Beranda = laporan, kasir dan bendahara 403 di keempat rute, tamu diminta masuk); `DashboardPostTest`, `SupplierTest`, dan tes Vitest `post-access` diperbarui. Seluruhnya 375 tes Pest dan 209 tes Vitest lulus; Pint, tsc, dan lint bersih.
- **Dicoba di browser:** sebagai admin, laporan penjualan Hari ini, 7 hari, dan Bulan ini (Rp 24.500, 2 transaksi, sama dengan Beranda), CSV (2 baris, total Selesai Rp 24.500), laporan inventaris (stok menipis 8 = Beranda, Beras 61 sesuai ledger), pos Kasir → Laporan penjualan; sebagai kasir, keempat rute laporan 403, ikon Laporan tidak tampil, pilihan "khusus admin".

### Batasan dan hal yang perlu diketahui

- Penjualan dihitung menurut tanggal penjualan; penjualan yang dibatalkan dianggap batal walau pembatalannya di hari lain.
- Laporan inventaris hanya produk aktif; filter periode hanya memengaruhi tabel mutasi (stok dan status selalu saat ini).
- Kasir kini tidak punya ikon Laporan di Beranda; riwayat penjualan tetap lewat ikon Kasir dan pos Kasir.
- Server MariaDB, Vite, dan `php artisan serve --port=8010` (database `kasir`) berjalan dari sesi ini; browser pratinjau masuk sebagai admin.

### Saran untuk tahap berikutnya

**Tahap 5E-1** (tema pixel bagian 1: kerangka semua halaman dengan menu samping dan header, halaman kasir, layar Transaksi Berhasil, riwayat transaksi, dengan potret kasir; mengikuti foto referensi di `claude.md`): **Sonnet, upaya tinggi**, memakai skill desain (frontend-design). Sesuai aturan persetujuan visual, tampilkan satu halaman contoh (halaman kasir) dengan tema pixel lebih dulu sebelum diterapkan ke halaman lain. Yang perlu diingat: hanya 24 warna palet; font pixel 3 × 5 yang ada belum punya huruf D, G, V (perlu diputuskan: lengkapi huruf sendiri atau pakai font pixel lain dengan izin bila berupa paket/berkas luar); karakter penjaga wajib (zombie, gurita) dipakai apa adanya; komponen tabel admin sementara ada di `components/admin/pixel-table.tsx` dan `components/reports/period-filter.tsx`. Tahap 5E-2 (inventaris, barang masuk, supplier, laporan, pengguna, hak akses) menyusul di sesi terpisah. Mulai sesi baru setelah mengganti model.

---

## Tahap 6B: Kelola pengguna, hak akses, supplier (22 Nov 2026)

Status: **selesai, disetujui pemilik, sudah di-commit (b907ab9).** Tidak ada paket baru. Dua migration baru (migration lama tidak diubah), sudah dijalankan di database lokal `kasir` atas izin pemilik. Aturan uang, stok, dan simpanan tidak berubah: Barang masuk tetap lewat `AdjustStock`. Tidak ada peran yang ditambah atau dihapus.

### Keputusan pemilik

- Halaman Hak akses memakai **tabel dari kode** (`App\Support\AccessMap`), tanpa permission spatie baru; penjaga sungguhan tetap middleware peran dan Gate `open-post`.
- Pengguna dengan shift kas terbuka **boleh** dinonaktifkan; shift-nya tetap terbuka.
- Pemasok di Barang masuk: **pilihan supplier + teks bebas**.
- Berkas `docs/referensi-karakter/olahan/9-penjaga-inventaris-pratinjau.png` **dihapus** (tidak berdampak ke aplikasi).

### Yang sudah selesai

- **Kelola pengguna** (`/pengguna`, `Admin\UserController`, Action `SaveUser`, `ChangeUserRole`, `SetUserActive`, `UserException`): daftar, tambah, ubah (nama, email, peran, kata sandi opsional), nonaktifkan dan aktifkan (tidak pernah dihapus). Aturan di server: admin tidak bisa menonaktifkan atau mengganti peran sendiri; admin aktif terakhir tidak bisa dinonaktifkan atau diturunkan; peran hanya salah satu dari tiga yang ada. Pengguna nonaktif ditolak saat masuk dan sesinya dikeluarkan (sudah ada: Fortify + `EnsureUserIsActive`). Dicatat di `activity_logs` (`user.*`).
- **Hak akses** (`/hak-akses`, `Admin\AccessController`): kartu tiga peran dengan jumlah pengguna, tabel centang fitur × peran (hanya baca), dan penggantian peran per pengguna dengan aturan yang sama. Tes memastikan tabel sama persis dengan penjaga rute.
- **Supplier** (`/supplier`, `Inventory\SupplierController`, Action `SaveSupplier`, `SetSupplierActive`): data master nama, kontak, alamat, catatan; tambah, ubah, nonaktifkan, aktifkan; jumlah penerimaan per supplier. Tabel `suppliers` (soft delete sesuai konvensi, tanpa tombol hapus).
- **Hubungan ke Barang masuk:** kolom baru `stock_entries.supplier_id` (opsional). `ReceiveStock` menerima `supplierId` (harus aktif) dan menyalin namanya ke `supplier_name`; tanpa supplier, teks bebas dipakai seperti dulu. Form punya pilihan supplier dan isian "atau tulis nama pemasok"; daftar penerimaan menandai "(supplier terdaftar)".
- **Beranda dan menu:** pilihan Supplier di pos Inventaris aktif (`App\Enums\Post`); menu ikon Beranda admin: Pengguna (aktif) dan Hak akses (ikon kunci baru, warna palet); sidebar halaman lain: Supplier, Pengguna, Hak akses. Tabel admin memakai bingkai pixel sederhana (`components/admin/pixel-table.tsx`); tema pixel lengkap di 5E.
- **Tes:** Pest baru `Admin/UserManagementTest`, `Admin/AccessTest`, `Inventory/SupplierTest` (akses admin vs kasir dan bendahara, aturan diri sendiri dan admin terakhir, supplier terhubung ke stok masuk dan ledger tetap), Vitest `pixel-icons`; `DashboardPostTest` diperbarui. Seluruhnya 347 tes Pest dan 209 tes Vitest lulus; Pint, tsc, dan lint bersih.
- **Dicoba di browser:** sebagai kasir, `/pengguna`, `/hak-akses`, `/supplier` 403 dan ikon admin tidak tampil; sebagai admin, halaman Pengguna, Hak akses, tambah supplier, Barang masuk dengan supplier, dan pos Inventaris → Supplier.

### Batasan dan hal yang perlu diketahui

- Data yang ditambahkan saat dicoba di database `kasir`: supplier contoh "CV Sumber Rejeki" dan penerimaan BM-20261122-0001 (1 sak Beras 5 kg dari supplier itu; stok beras menjadi 61).
- **Cacat dari 5D-1, sudah diperbaiki atas izin pemilik:** setelah pukul 17.00, warna di sekeliling kanvas Beranda tetap warna siang walau diorama sudah senja atau malam. Penyebab: Beranda dirender lebih dulu di server (SSR) sebagai siang, dan React tidak memperbarui atribut yang berbeda saat hidrasi. Perbaikan di `use-time-of-day.ts`: server dan browser sama-sama mulai dari siang, lalu langsung diganti ke jam browser setelah halaman aktif. Dicek di browser pukul 19.00: latar ikut malam, tanpa peringatan hidrasi baru.
- "Laporan penjualan" di pos Kasir masih "segera hadir" dan ikon Laporan di Beranda masih menuju riwayat penjualan; keduanya untuk 6C.
- Server MariaDB, Vite, dan `php artisan serve --port=8010` (database `kasir`) masih berjalan dari sesi ini; browser pratinjau masuk sebagai admin.

### Saran untuk tahap berikutnya

**Tahap 6C** (laporan penjualan dan inventaris dengan filter tanggal dan ekspor CSV, ringkasan angka di dasbor): **Sonnet, upaya sedang**, sesuai tabel di `claude.md`. Hanya membaca data (penjualan tanpa yang dibatalkan, stok dari ledger), jadi cukup mulai dengan rencana singkat; plan mode disarankan untuk menyepakati isi laporan dan kolom CSV. Setelah halaman laporan ada, aktifkan "Laporan penjualan" di `App\Enums\Post`, arahkan ikon Laporan di Beranda ke halaman laporan, dan tambahkan baris laporan di `AccessMap`. Ekspor CSV bisa memakai fitur bawaan PHP/Laravel tanpa paket baru. Mulai sesi baru setelah mengganti model.

---

## Tahap 5D-2: Tombol pos, karakter besar, akses per peran, suasana (22 Nov 2026)

Status: **selesai, ketiga langkah dan revisi bunyi disetujui pemilik, sudah di-commit (9deb50d).** Tidak ada paket baru, tidak ada migration atau seeder baru, dan tidak ada perubahan aturan uang, stok, atau simpanan. Semua yang baru di server hanya membaca.

### Yang sudah selesai

- **Langkah 1, tombol pos dan panel karakter besar** (tanpa balon "..."):
  - pos Kasir di meja Kasir 1 dijaga zombie; pos Inventaris di meja Kasir 2 (keputusan pemilik: usulan A), yang kini menyala dengan layar "STOK" (ikut berpendar saat malam) dan dijaga **gurita biru** dari gambar pemilik (`9-penjaga-inventaris.png`, 19 × 46, latar putih dibuang lewat `docs/referensi-karakter/alat/extract.js`, sel 12 px). Gurita didaftarkan sebagai penjaga (`role: 'penjaga'`), tidak masuk giliran pelanggan;
  - tombol berlabel di depan meja ("KASIR · Penjualan dan Transaksi", "INVENTARIS · Stok dan Barang masuk"), tombol HTML biasa di atas kanvas (`postAnchor`), ikut bergeser dan membesar; di layar sempit hanya judulnya;
  - panel karakter besar (`PostPanel`, Radix Dialog yang sudah ada): diorama diredupkan, penjaga diperbesar skala bulat (dicermin bila perlu supaya menghadap dialog), kotak dialog kecil (lebar 320 px) dengan nama petugas, sapaan, dan pilihan fitur; pilihan tanpa halaman ("Laporan penjualan", "Supplier") nonaktif dengan "segera hadir". Fokus mulai di pilihan pertama, panah atas dan bawah memindah pilihan, Esc menutup;
  - ukuran potret (revisi pemilik): disamakan menurut luas, bukan tinggi (`portraitScale`), supaya gurita yang kurus tampak sebesar zombie; di 1366 × 768 zombie 9× (243 × 369 px) dan gurita 10× (190 × 460 px), keduanya lebih tinggi dari kotak dialog.
- **Langkah 2, akses per peran dijaga di server:**
  - `App\Enums\Post` adalah satu-satunya sumber aturan: Kasir untuk admin dan kasir, Inventaris hanya admin, bendahara belum punya pos (Koperasi ditunda); sama dengan penjaga rute halaman tujuannya. Gate `open-post` (AppServiceProvider) memakainya;
  - `GET /beranda/pos/{pos}` (`dashboard.post`) mengirim pilihan fitur hanya bila diizinkan, selain itu 403 dengan pesan ("Pos Inventaris hanya untuk Admin."); pilihan dan tautannya kini hanya ada di server;
  - di diorama, penolakan tampil sebagai papan kecil di atas tombol pos selama 3,5 detik (`role="status"`), panel tidak dibuka. Dicoba di browser sebagai admin dan sebagai kasir.
- **Langkah 3, suasana:**
  - bunyi 8-bit dari kode (Web Audio, tanpa berkas suara): bip pindai, koin dan laci, dengung batal, alarm kejar, lonceng pintu (`soundCues` murni, `ChipSound`, `useSceneSound`). **Revisi pemilik: selalu menyala, tanpa tombol senyap.** Karena browser hanya mengizinkan suara setelah ada interaksi, suara terbuka pada klik, sentuhan, atau tombol keyboard pertama di halaman (diperiksa di browser: konteks audio "running" setelah klik pertama);
  - **revisi pemilik: mode hemat daya dibuang seluruhnya** (tidak ada tombol, gambar diam, maupun ikon antrean). Ini menyimpang dari `claude.md` (tombol mute, mati bawaan, dan hemat daya untuk HP lemah) atas keputusan pemilik; animasi tetap dibatasi 30 FPS dan berhenti saat tab tersembunyi seperti sebelumnya;
  - klik pelanggan: kartu di atas kepala berisi nama karakter dan barang yang dibeli (nomor faktur, barang, total); pembeli dari peristiwa acak ditandai "bukan transaksi nyata", figuran "Hanya melihat-lihat"; kursor tangan di atas pelanggan.
- **Tes:** Pest baru `DashboardPostTest` (9: aturan tiap peran, isi jawaban, penolakan dengan pesan, tamu, pos tak dikenal, semua pilihan aktif bisa dibuka peran yang berhak, halaman inventaris tetap 403 untuk kasir). Vitest baru `posts`, `post-access`, `mood` (bunyi dan klik pelanggan), dan pembaruan `reference` (9 karakter). Seluruhnya 312 tes Pest dan 207 tes Vitest lulus; Pint, tsc, dan lint bersih.

### Batasan dan hal yang perlu diketahui

- Bunyi tidak bisa saya dengar sendiri; yang dites adalah kapan berbunyi dan bahwa konteks audio menyala setelah klik pertama. Mohon dicoba langsung: klik sekali di mana saja di Beranda, lalu tunggu pelanggan masuk atau dilayani.
- Tanpa tombol senyap, bunyi hanya bisa dimatikan lewat pengaturan suara perangkat atau tab browser.
- Pelanggan hanya bisa diklik dengan mouse atau sentuh, belum lewat keyboard.
- Kasir tetap bisa membaca daftar Produk lewat menu ikon kiri (diizinkan sejak Tahap 3); yang dibatasi adalah pos Inventaris dan halaman tulis inventaris.
- Gambar gurita mirip tokoh kartun terkenal; seperti karakter lain (lihat README referensi), aman untuk tugas kuliah dan demo, jangan dipublikasikan atau dikomersialkan tanpa izin.
- `docs/referensi-karakter/olahan/9-penjaga-inventaris-pratinjau.png` adalah pratinjau yang dibuat alat ekstraksi; karakter lain tidak menyimpan berkas pratinjau, jadi berkas itu tidak ikut di-commit (masih ada di folder, belum dihapus).
- Browser pratinjau terakhir masuk sebagai `kasir@kasir.test`. Server `php artisan serve --port=8010` (database `kasir`) dan server Vite masih berjalan.

### Saran untuk tahap berikutnya

**Tahap 6B** (peran koperasi/admin: kelola pengguna dan hak akses, supplier sebagai data master yang dihubungkan ke stok masuk): **Sonnet, upaya sedang**, sesuai tabel di `claude.md`. Mulai di plan mode karena menyentuh skema (tabel supplier, kolom supplier di penerimaan barang) dan hak akses. Catatan untuk 6B: aturan pos ada di `App\Enums\Post`; bila hak akses dibuat bisa diatur admin, Gate `open-post` cukup diganti membaca hak akses itu. Setelah halaman Pengguna dan Supplier ada, ikon Pengguna di menu kiri dan pilihan "Supplier" di pos Inventaris tinggal diaktifkan. Mulai sesi baru setelah mengganti model.

---

## Tahap 5D-1: Beranda dengan diorama data nyata (22 Nov 2026)

Status: **selesai, keempat langkah disetujui pemilik, sudah di-commit (074eb58).** Tidak ada paket baru, tidak ada migration, dan tidak ada perubahan aturan uang, stok, atau simpanan. Semua yang baru di server hanya membaca. Halaman awal publik (5F) dicoret, jadi komponen diorama cukup satu mode: data nyata.

### Yang sudah selesai

- **Langkah 1, Beranda layar penuh** (`/dashboard`, semua peran, tanpa sidebar, bar atas, atau bar bawah):
  - diorama memenuhi layar (`DioramaCanvas fit="screen"`): sebesar mungkin yang muat, kelipatan bulat piksel layar bila masih mengisi ≥ 90%, sekelilingnya diwarnai sama dengan latar kanvas (`backdropColor`, ikut gelap saat senja dan malam);
  - kartu "Hari Ini" di kiri atas (`TodaySummary`): penjualan dan jumlah transaksi hari ini menurut zona tampilan (tanpa yang dibatalkan), stok menipis (produk aktif dengan stok ≤ minimum, termasuk kosong). Bingkai pixel, judul dan angka memakai huruf pixel 3 × 5 milik diorama;
  - menu ikon kiri dengan ikon 12 × 12 buatan sendiri (warna palet): Produk, Stok (penerimaan barang), Laporan (sementara riwayat penjualan), Pengguna (redup, menyusul 6B). Tambahan yang disetujui bersama langkah 1: Kasir, Anggota, Keluar. Tiap ikon hanya tampil untuk peran yang berhak (penjaga tetap middleware);
  - label sidebar halaman lain "Dashboard" menjadi "Beranda"; pratinjau 4× ikon dan kartu di `/diorama-lab`.
- **Langkah 2, rak dan vending sesuai stok nyata** (batas disetujui pemilik):
  - `ShelfStock` (server): kosong 0; sedikit 1 sampai stok minimum (sama dengan "stok menipis"); setengah sampai 3× minimum; penuh di atasnya; minimum 0 memakai patokan 5; produk nonaktif tidak ikut. Kategori "Minuman" ke vending (urut nama), lainnya ke rak (urut kategori lalu nama);
  - `shelfFills` (diorama): dibagi rata ke 10 potongan rak (Rak A lalu Rak B) dan 3 vending; potongan berisi beberapa produk memakai rata-rata dibulatkan ke bawah. `/diorama-lab` tetap penuh;
  - **perbaikan karakter:** saat server Vite berjalan, gambar karakter pemilik disajikan dari asal lain sehingga kanvas "tercemar" dan diorama memakai sosok cadangan. `reference-loader` kini memakai `crossOrigin = 'anonymous'` dan tetap selesai bila satu gambar gagal. Karakter pelanggan dan zombie penjaga kasir adalah karakter wajib (keputusan pemilik);
  - **peristiwa acak** (diminta pemilik): saat sepi muncul rombongan 3 sampai 5 pembeli, pembeli yang kabur setelah pindaian pertama lalu dikejar penjaga, atau pembeli tunggal (`world.stagePretend`, `ambient`). Hanya animasi: tidak menulis data, tidak mengubah total harian, layar mini, atau "+N"; penjualan sungguhan selalu didahulukan. Di lab ada tombol "Rombongan (acak)", "Kabur dikejar (acak)", dan centang "Peristiwa acak saat sepi".
- **Langkah 3, polling 5 detik** (baca-saja):
  - `GET /beranda/peristiwa?sale=&void=` (`dashboard.feed`, semua peran login, throttle 120/menit, `DashboardFeed`): penjualan dan pembatalan setelah kursor (paling banyak 10 penjualan terbaru), angka Hari Ini, isi rak, kursor baru. Kursor awal dibawa Beranda, jadi penjualan lama tidak diputar ulang;
  - `useDashboardFeed`: penjualan baru diputar sebagai `sale.completed`, pembatalan sebagai `sale.voided` (yang ganda dibuang adaptor); kartu, total layar mini, dan rak ikut diperbarui; berhenti saat tab tersembunyi dan menyusul saat tampil lagi. Sudah dicoba dengan satu "Simulasi pesanan" sungguhan (INV-20261122-0002) dari tab lain.
- **Langkah 4, siang, senja, malam dari jam browser** (`timeOfDayAt`, diperiksa tiap 30 detik): siang 06.00–16.59, senja 17.00–18.59 dan fajar 05.00–05.59, malam 19.00–04.59, memakai lapisan malam 5C. `/dashboard?waktu=senja|malam|siang` memaksa waktu untuk demo dan presentasi.
- **Tes:** Pest baru `BerandaTest` (7), `ShelfStockTest` (21), `DashboardFeedTest` (11), dan Vitest baru `fit`, `shelves`, `ambient`, `poll`, `clock` (semua di `kasir_test` atau murni). Seluruhnya 303 tes Pest dan 185 tes Vitest lulus; Pint, tsc, lint, dan build bersih.

### Batasan dan hal yang perlu diketahui

- Zona waktu: browser pemilik memakai WITA, server menghitung "Hari Ini" dengan WIB (`APP_DISPLAY_TIMEZONE` bawaan `Asia/Jakarta`). Bila koperasinya di WITA, isi `APP_DISPLAY_TIMEZONE=Asia/Makassar` di `.env` (belum diubah).
- Huruf pixel 3 × 5 membuat "N" mirip "W" di judul "HARI INI"; font pixel yang lebih baik bisa di 5E.
- Pembeli dari peristiwa acak terlihat seperti pembeli biasa (membayar dengan koin) walau tidak ada penjualan di belakangnya; angka di layar tetap nyata. Saat klik pelanggan dibuat di 5D-2, pembeli pura-pura perlu ditandai (`sale.pretend`).
- Pembeli yang kabur di Beranda hanya dari peristiwa acak; layar kasir belum memancarkan `sale.abandoned`.
- Tombol "Simulasi pesanan" masih hanya di `/diorama-lab`, belum di Beranda (catatan Tahap 6 menyebut perlu dijangkau dari dasbor; bisa masuk bubble atau tombol admin di 5D-2 bila pemilik setuju).
- Ikon Pengguna redup sampai halaman kelola pengguna ada (6B); Laporan sementara menuju riwayat penjualan sampai 6C.
- Server Vite (`npm run dev`) dan `php artisan serve --port=8010` (database `kasir`) masih berjalan dari sesi ini.

### Saran untuk tahap berikutnya

**Tahap 5D-2** (bubble di atas karakter Kasir dan Inventaris, karakter besar dari potret yang sama diperbesar tanpa ekspresi tambahan, akses per peran dijaga di server, cadangan tombol keyboard, bunyi 8-bit dengan tombol senyap (mati bawaan), mode hemat daya, klik pelanggan): **Sonnet, upaya tinggi**, sesuai tabel di `claude.md`. Pindah ke Opus (upaya tinggi) hanya bila tampilan karakter besar atau bubble sulit dibuat rapi. Karakter pelanggan dan penjaga kasir tetap karakter dari gambar pemilik. Mulai sesi baru setelah mengganti model.

---

## Tahap 6: Data contoh dan tombol "Simulasi pesanan" (22 Nov 2026)

Status: **selesai, disetujui pemilik, sudah di-commit (db3b072).** Pemilik sudah mencoba tombolnya dan berfungsi. Tidak ada paket baru, tidak ada migration baru, dan tidak ada perubahan aturan uang, stok, atau simpanan (semua tulisan lewat Action yang sudah ada).

### Yang sudah selesai

- **Seeder data contoh** (`database/seeders/DemoDataSeeder.php`):
  - 4 kategori (Sembako, **Minuman**, Makanan ringan, Kebutuhan rumah) dan 22 produk lewat `SaveProduct`; tiap produk punya satuan dasar, harga, dan barcode 13 digit unik; 3 produk punya satuan dus (isi 12, 24, 40);
  - stok awal lewat `AdjustStock` (saldo awal), `min_stock` 10, dengan campuran: **kosong** 0 (produk tanpa mutasi), **sedikit** 6, **setengah** 25, **penuh** 60 (`DemoDataSeeder::LEVELS`). Batas tingkat isi untuk rak di 5D tetap keputusan 5D;
  - 5 anggota lewat `CreateMember`, dengan simpanan pokok, wajib, dan sukarela lewat `PostSaving`;
  - satu shift demo terbuka untuk kasir contoh (kas awal Rp 200.000) lewat `OpenShift`.
- **Hanya lingkungan lokal:** seeder tidak melakukan apa-apa bila `APP_ENV` bukan `local` (menampilkan peringatan), dan `DatabaseSeeder` hanya memanggilnya di lokal. Aman dijalankan ulang: SKU dan nama anggota yang sudah ada dilewati.
- **Tombol "Simulasi pesanan"** (hanya admin, di `/diorama-lab`):
  - `Actions/Pos/SimulateSale`: memilih 1 sampai 3 produk aktif yang punya stok, satuan (dasar, kadang dus) dan jumlah (1 sampai 3) dibatasi sisa stok dalam satuan dasar, lalu menjual lewat `CompleteSale` atas nama `kasir@kasir.test` dengan shift demo-nya (dibuka bila belum ada). Stok tidak pernah dipaksa minus; bila tidak ada stok, muncul pesan dan tidak ada penjualan;
  - rute `POST /diorama-lab/simulasi` (`diorama.simulate`, admin, throttle 60/menit), `Diorama/SimulateSaleController`;
  - peristiwa `sale.completed` dititipkan lewat flash seperti layar kasir, jadi diorama di halaman yang sama langsung memutar pesanan itu. Berbeda dengan tombol uji lain, ini penjualan sungguhan (tercatat, stok berkurang).
- **Tes:** 14 tes Pest baru (`tests/Feature/Demo/DemoDataTest.php`): seeder tidak berjalan di luar lokal dan tidak mengubah database tes, isi dan campuran stok, ledger konsisten, idempotensi; simulasi (shift demo, stok tidak pernah minus lewat 150 pesanan, hanya produk aktif berstok, pesan bila kosong), tombol (admin saja, flash peristiwa). Seluruhnya 264 tes Pest dan 146 tes Vitest lulus; Pint, tsc, lint, dan build bersih.

### Cara memakai di lokal

Tes memakai database `kasir_test` dan tidak menyentuh data demo. Untuk mengisi database lokal `kasir` (setelah migrasi dan akun demo ada):

```text
php artisan db:seed --class=DemoDataSeeder
```

Database lokal `kasir` sudah berisi data contoh. Akun demo: `admin@kasir.test`, `kasir@kasir.test`, `bendahara@kasir.test` (kata sandi `password`). Jangan menjalankan server pengembangan dengan `DB_DATABASE=kasir_test`: database itu dikosongkan oleh tes.

### Batasan dan hal yang perlu diketahui

- Tombol simulasi tidak dibatasi ke lingkungan lokal (sesuai permintaan: hanya admin). Bila dijalankan di database nyata, ia membuat penjualan sungguhan atas nama kasir contoh.
- Penjualan simulasi masuk shift demo yang terbuka terus; tutup shift itu lewat layar kasir bila perlu.
- Berkas `claude.md` berubah di working tree (bagian halaman awal publik, arti koperasi, tahap 5F/6B/6C); itu bukan dari tahap ini.

### Urutan berikutnya (diubah pemilik)

1. **Tahap 5D lebih dulu** (Sonnet, upaya tinggi): jam browser untuk siang/senja/malam, bunyi 8-bit (mute, mati bawaan), rak dan vending terisi sesuai stok nyata (memakai data contoh ini), komponen diorama dengan dua mode (data nyata dan pertunjukan), mode hemat daya.
2. **Tahap 6B** (Sonnet, sedang): kelola pengguna, hak akses, supplier.
3. **Tahap 6C** (Sonnet, sedang): laporan penjualan dan inventaris, ringkasan di dasbor.
4. Setelahnya sesuai `claude.md`: 5E, 5F, lalu 7 sampai 9.

### Wajib dicatat: diorama harus tampil di dasbor

Diorama saat ini hanya ada di `/diorama-lab` (halaman uji admin). Pada 5D, diorama **harus dipasang di dasbor (`/dashboard`) sebagai header besar** di bagian atas halaman, memakai data nyata, bukan hanya di `/diorama-lab`. `/diorama-lab` tetap sebagai halaman pratinjau. Tombol "Simulasi pesanan" tetap berguna untuk demo dan perlu bisa dijangkau dari dasbor (admin saja).

Disarankan memulai sesi baru untuk 5D setelah mengganti model dan upaya.

---

## Tahap 5C: Sprite dan animasi (21–22 Nov 2026, selesai)

Dikerjakan satu elemen per langkah, masing-masing diperlihatkan di `/diorama-lab` dengan perbesaran 4× dan disetujui pemilik. Tidak ada lagi kotak pengganti dari 5B di diorama.

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

### Elemen: hiasan, jendela dan pintu siang-senja-malam (disetujui)

- **Hiasan** (`sprites/decor-sprite.ts`), letaknya dari rancangan 5A:
  - **jendela** di dinding kanan, kusen kayu bersilang: siang (langit biru, awan, pepohonan), senja (langit lavender ke kunyit, matahari terbenam), malam (langit biru malam, bulan sabit, bintang, siluet pohon);
  - **jam dinding bundar** berbingkai kayu dengan tanda 12-3-6-9; jarum menunjuk 10.10 (siang), 17.40 (senja), 21.00 (malam);
  - **empat lukisan:** gunung dan sawah, laut senja (dinding kanan), buah, bunga (dinding kiri); tiga warna 5A di luar palet diganti warna palet;
  - **dua lampu dinding** (baru di 5C): mati saat siang, menyala saat senja dan malam dengan lingkaran cahaya hangat yang miring mengikuti dinding;
  - **tanaman pot** (dua buah): pot terakota berbibir kunyit, rumpun daun rimbun dua warna hijau.
- **Pintu kaca** (`sprites/room-sprite.ts`, permintaan pemilik): kaca menampilkan pemandangan luar menurut waktu seperti jendela: langit, pepohonan, rumput, dan trotoar berpaving. Bingkai, kusen, dan gagang tetap; pantulan kaca meredup di malam hari.
- **Lapisan malam** (`render/lighting.ts`, rancangan bagian 8):
  - lapisan biru malam `#3a3d6b` tembus pandang 42% saat malam, setengahnya saat senja;
  - latar (ruangan, hiasan, lapisan biru, kaca jendela dan pintu yang tetap terang, lampu dinding menyala) dirender sekali per waktu;
  - benda dan aktor digambar di lapisan terpisah, diredupkan dengan biru yang sama, lalu ditempel ke latar, jadi pelanggan yang lewat tetap menutupi kaca pintu;
  - papan nama vending (tetap berkedip) dan layar mini kasir 1 digambar ulang terang, dengan pendar kuning di lantai depan vending dan di sekitar layar.
- **Waktu dipilih manual** (`RenderOptions.timeOfDay`, bawaan siang): tombol Siang, Senja, Malam di lab. Jam browser menyusul di 5D.
- Papan nama vending dan muka layar mini dipisah menjadi fungsi sendiri (`drawVendingLights`, `drawCounterScreen`) supaya bisa digambar ulang terang; tampilan siang tidak berubah.
- Hanya palet 24 warna (dites).
- **Lab:** `components/diorama/decor-lab.tsx`, pratinjau 4×: jendela dan pintu dalam tiga waktu, jam, lampu mati dan menyala, empat lukisan, tanaman siang dan malam, potongan diorama sungguhan (pojok jendela dalam tiga waktu; dinding kiri, dinding kanan, dan meja kasir pada waktu terpilih).
- **Saran yang belum dipakai:** malam lebih biru gelap dengan campuran *multiply*, senja dengan rona kunyit. Nilai 5A tetap dipakai sampai pemilik memutuskan.
- **Tes:** 19 tes baru (`sprites/decor.test.ts`); seluruhnya 146 tes Vitest lulus.

### Saran untuk tahap berikutnya

Semua elemen 5C sudah disetujui. Tahap berikutnya **5D** (suasana dan hubungan data: siang dan malam dari jam browser, bunyi, rak dan vending machine terisi sesuai stok nyata). Model **Sonnet**, upaya **tinggi**.

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

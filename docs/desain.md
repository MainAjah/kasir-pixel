# Desain aplikasi dan batasannya

Dokumen ini menjelaskan keputusan desain utama, apa yang sebenarnya menjaganya di kode, dan di mana batasnya. Tujuannya jujur: menunjukkan yang kuat sekaligus yang sengaja dibuat sederhana karena ini proyek tugas.

## 1. Stok dan simpanan: ledger yang hanya bisa ditambah

**Masalah yang dihindari.** Bila stok disimpan di satu kolom `stock` yang terus ditimpa, tidak ada jejak kenapa angkanya berubah, dan selisih tidak bisa dilacak.

**Cara kerjanya**

| Data | Tabel ledger | Satu pintu penulisan |
| --- | --- | --- |
| Stok barang | `stock_movements` | `App\Actions\Inventory\AdjustStock` (dipakai `ReceiveStock`, `CompleteSale`, `VoidSale`, penyesuaian) |
| Simpanan anggota | `savings_ledger` | `App\Actions\Savings\PostSaving` |

- Setiap perubahan adalah **baris baru**: qty bertanda (+ masuk, − keluar) atau nominal, beserta `balance_after` (saldo setelah baris itu), jenis mutasi, `created_by`, dan waktu.
- **Stok/saldo saat ini** = `balance_after` pada baris dengan `id` terbesar (`Product::withStock`). Saldo awal dan akhir sebuah periode di laporan dihitung dari **jumlah qty**, karena tanggal barang masuk boleh mundur.
- **Koreksi** tidak mengedit baris lama, tetapi menambah baris baru:
  - penyesuaian stok (koreksi kurang atau tambah);
  - baris pembalik simpanan (`reverse`).
- **Aturan yang dijaga Action:**
  - stok tidak boleh minus;
  - simpanan pokok sekali, wajib per bulan, dan hanya sukarela yang bisa ditarik manual;
  - anggota yang sudah keluar tidak bisa setor.
- Setiap perubahan uang dan stok juga dicatat di `activity_logs`.

**Yang menjaga:** trait `App\Models\Concerns\AppendOnly` dipakai model `StockMovement`, `SavingsEntry`, `Sale`, `SaleItem`, `Payment`, `SaleVoid`, `StockEntry`, dan `ActivityLog`. Trait ini melempar error bila ada kode yang mencoba `update` atau `delete` lewat Eloquent.

## 2. Penjualan tidak pernah diedit

- Penjualan dibuat sekali oleh `CompleteSale` dalam satu transaksi database: baris `sales`, `sale_items`, `payments`, dan mutasi stok `sale`. Bila stok salah satu barang kurang, seluruh penjualan batal.
- **Pembatalan (void)** oleh `VoidSale`:
  - hanya admin, hanya selama shift penjualan itu masih terbuka, dan alasan wajib diisi;
  - yang ditambah adalah satu baris di `sale_voids` dan mutasi stok pembalik (`sale_void`) yang mengembalikan barang;
  - baris penjualan aslinya tidak diubah sama sekali.
- **Dampak void:** laporan, kartu "Hari Ini" di Beranda, dan ekspor CSV tidak menghitung penjualan yang punya baris `sale_voids`. Penjualan itu ditampilkan terpisah sebagai "Dibatalkan".
- **Shift kasir:** satu shift aktif per kasir. Shift yang sudah ditutup tidak boleh diubah, dan selisih kas wajib diberi catatan.

## 3. Checkout all-or-nothing dan REST API (Tahap 10)

Ini jawaban atas "30% Hard Problem" di soal: kasir checkout 5 barang, barang ke-4 ternyata habis karena dibeli lewat jalur lain, dan seluruh keranjang harus di-rollback.

- **Satu transaksi database.** `CompleteSale` menjalankan semua langkah checkout di dalam satu `DB::transaction`:
  1. kunci shift;
  2. kunci produk;
  3. hitung harga;
  4. tulis nota, baris, dan mutasi stok per barang;
  5. tulis pembayaran.

  Bila `AdjustStock` menemukan stok barang ke-4 tidak cukup, ia melempar `StockException`. Laravel me-rollback transaksi, sehingga baris nota, rincian, dan mutasi barang 1–3 yang sudah sempat ditulis ikut hilang. Tidak ada data setengah jadi.
- **Stok dibaca di bawah kunci.** Saldo terakhir dibaca setelah baris produk dikunci (`lockForUpdate`). Penjualan lain yang menghabiskan stok di sela kasir menghitung dan membayar pasti terlihat, dan dua checkout tidak bisa menjual stok yang sama dua kali.
- **Anti-deadlock: kunci berurutan.**
  - Sebelum menulis apa pun, semua produk di keranjang dikunci sekaligus **menurut urutan id**.
  - Karena setiap checkout meminta kunci dalam urutan yang sama, dua checkout bersamaan dengan urutan barang terbalik (misalnya A lalu B, dan B lalu A) tidak saling menunggu.
  - Urutan barang di nota tetap mengikuti keranjang.
- **Coba ulang.** Bila database tetap melaporkan deadlock (misalnya pada penguncian nomor nota), transaksi diulang paling banyak 3 kali. Percobaan yang gagal sudah di-rollback seluruhnya, jadi mengulang aman.
- **REST API** (`routes/api.php`, `app/Http/Controllers/Api/`, dokumentasi di [api.md](api.md)):
  - produk dan stok;
  - **hitung total** tanpa menyimpan;
  - **checkout**;
  - **mutasi stok**.

  Checkout yang gagal karena stok dijawab **409** dengan `rolled_back: true` dan `failed_item` (barang mana, tersedia berapa, diminta berapa).
- **Layar kasir memakai API yang sama.** Tombol Proses Pembayaran memanggil `POST /api/v1/penjualan` dengan cookie sesi kasir (Sanctum stateful). Klien lain seperti Postman memakai token Bearer. Bila gagal, baris barang yang membatalkan transaksi ditandai merah dan keranjang tetap utuh.
- **Satu sumber harga.** `App\Actions\Pos\PriceCart` dipakai oleh endpoint hitung dan oleh checkout, jadi angka "hitung" dan "bayar" pasti sama.

## 4. Harga selalu dari server

- Browser atau klien API hanya mengirim `product_unit_id` dan jumlah.
- `PriceCart` (dipakai `CompleteSale`) membaca `sell_price` dari database untuk menghitung subtotal dan total. Harga yang dikirim klien, bila ada, diabaikan.
- Akibatnya, mengubah harga lewat alat pengembang di browser atau lewat Postman tidak berpengaruh pada nota.

## 5. Uang dan pencatatan

- Uang disimpan sebagai **bilangan bulat rupiah**, tanpa desimal, sehingga tidak ada galat pembulatan.
- Tabel transaksi menyimpan `created_by`. Data master (produk, pengguna, supplier) dinonaktifkan atau dihapus lunak, bukan dihapus permanen.

## 6. Hak akses

- **Tiga peran tetap** lewat spatie/laravel-permission: admin, kasir, bendahara.
- **Penjagaan di server:**
  - middleware `role:` di setiap kelompok rute (`routes/pos.php`, `inventory.php`, `members.php`, `admin.php`);
  - REST API memakai `auth:sanctum` ditambah middleware peran yang sama (`routes/api.php`);
  - Gate untuk pos di Beranda.
- **Pengguna nonaktif** tidak bisa masuk, dan sesinya diputus bila sedang berjalan.
- **Halaman Hak akses** menampilkan peta dari `App\Support\AccessMap`. Tes Pest memastikan peta itu sama dengan penjaga sebenarnya: peran yang tercantum bisa membuka, dan peran lain mendapat 403.

## 7. Diorama

- **Prinsip:** data lebih dulu, animasi mengikuti data. Diorama **hanya membaca**, tidak pernah mengubah data.
- **Sumber peristiwa:** layar Beranda menanyakan peristiwa baru ke `/beranda/peristiwa` setiap **5 detik** (polling, hanya baca), lalu memutar pelanggan sesuai penjualan yang terjadi. Rak diisi dari stok ledger.
- **Teknik gambar:**
  - Canvas 2D biasa, tanpa pustaka gim tambahan;
  - kanvas berukuran rendah yang diperbesar dengan kelipatan bulat (`image-rendering: pixelated`);
  - 30 FPS;
  - palet 24 warna;
  - sprite digambar dari kode.
- **Ringan:** paling banyak 5 pelanggan tampil sekaligus, sisanya menjadi angka antrean. Animasi berhenti saat tab browser tersembunyi.
- **Pelanggan bukan sungguhan:** agar toko tidak sepi, ada juga pembeli dari peristiwa acak dan figuran yang hanya melihat-lihat. Saat diklik, kartunya menandai "bukan transaksi nyata" atau "Hanya melihat-lihat". Pembeli dari penjualan sungguhan menampilkan nomor nota, barang, dan total.
- **Bunyi 8-bit** dibuat dari kode (Web Audio). Atas keputusan pemilik, bunyi selalu menyala tanpa tombol senyap, dan mode hemat daya dibuang. Ini menyimpang dari rencana awal di `claude.md`.

## 8. Batasan yang perlu diketahui

- **Perlindungan hanya di tingkat aplikasi.** `AppendOnly` dan Action menjaga data selama perubahan lewat aplikasi (Eloquent). **Tidak ada trigger database**, jadi kueri SQL langsung atau mengedit tabel lewat phpMyAdmin tetap bisa mengubah atau menghapus ledger. Untuk produksi, langkah berikutnya adalah trigger atau hak akses database yang menolak `UPDATE`/`DELETE` pada tabel ledger.
- **Keserentakan diuji secara logika, bukan secara beban.**
  - Checkout mengunci produk berurutan dan mengulang bila deadlock (bagian 3). Action lain mengunci baris dengan `lockForUpdate`, misalnya shift saat membatalkan dan anggota saat menulis simpanan.
  - Tes Pest memakai satu koneksi database, jadi deadlock sungguhan dan beban tinggi tidak bisa diuji otomatis. Skenario "stok habis dibeli jalur lain" dites secara berurutan (penjualan lain terjadi di antara hitung dan bayar), dan bisa didemokan dengan dua jendela browser.
- **Satu koperasi**, tidak multi tenant.
- **Polling, bukan siaran langsung.** Penjualan baru muncul di diorama Beranda paling lambat sekitar 5 detik setelah dibayar.
- **Tanpa tombol senyap dan tanpa mode hemat daya** (keputusan pemilik). Bunyi hanya bisa dimatikan lewat pengaturan suara perangkat atau tab browser.
- **Pembayaran hanya tunai.** Tombol "Simpanan anggota" di kasir tampil nonaktif dengan tulisan "segera hadir".
- **Halaman bawaan starter kit** (login, lupa sandi, Settings) belum diterjemahkan. Halaman awal `/` masih halaman sambutan bawaan Laravel; aplikasinya dimulai dari `/login`.
- **Halaman Anggota** berfungsi, tetapi belum diberi tema pixel karena pos Koperasi ditunda.

## 9. Yang sengaja tidak dibuat (keputusan versi tugas)

Daftar ini keputusan ruang lingkup, bukan fitur yang lupa dibuat. Satu-satunya persyaratan tugas adalah Laravel, jadi waktu dipakai untuk inti yang benar dan diorama.

| Tidak dibuat | Alasan |
| --- | --- |
| QRIS dan pembayaran non-tunai | Butuh penyedia pembayaran dan akun; di luar ruang lingkup tugas |
| Diskon dan harga khusus anggota | Menambah aturan uang yang perlu divalidasi pengurus koperasi |
| Mode offline (PWA) | Rumit (sinkronisasi dan konflik); aplikasi dianggap selalu terhubung |
| Struk via WhatsApp | Butuh layanan pihak ketiga |
| Retur setelah shift tutup, Stock Opname, multi gudang | Fitur gudang lanjutan; koreksi cukup lewat Penyesuaian stok |
| Menu Pembelian/PO dan Pengaturan | Barang masuk dicatat langsung dari supplier |
| Trigger database, tes beban dan keserentakan dengan banyak koneksi | Disederhanakan untuk tugas (lihat Batasan). Penguncian anti-deadlock di checkout **dibuat** di Tahap 10. |
| SHU dan pinjaman (Tahap 7), Reverb dengan layar diorama terpisah (Tahap 8) | Bonus, sengaja dilewati |
| Modul RAT, adegan gudang dan balai di diorama | Fase lanjutan di rencana awal |
| Pos Koperasi di diorama | Ditunda; anggota dan simpanan dibuka lewat menu Anggota |

Rencana lengkap dan sejarah keputusan per tahap ada di `PROGRESS.md` dan `docs/skema.md`.

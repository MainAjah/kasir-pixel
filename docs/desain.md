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

## 3. Harga selalu dari server

- Browser hanya mengirim `product_unit_id` dan jumlah.
- `CompleteSale` membaca `sell_price` dari database untuk menghitung subtotal dan total. Harga yang dikirim browser, bila ada, diabaikan.
- Akibatnya, mengubah harga lewat alat pengembang di browser tidak berpengaruh pada nota.

## 4. Uang dan pencatatan

- Uang disimpan sebagai **bilangan bulat rupiah**, tanpa desimal, sehingga tidak ada galat pembulatan.
- Tabel transaksi menyimpan `created_by`. Data master (produk, pengguna, supplier) dinonaktifkan atau dihapus lunak, bukan dihapus permanen.

## 5. Hak akses

- **Tiga peran tetap** lewat spatie/laravel-permission: admin, kasir, bendahara.
- **Penjagaan di server:**
  - middleware `role:` di setiap kelompok rute (`routes/pos.php`, `inventory.php`, `members.php`, `admin.php`);
  - Gate untuk pos di Beranda.
- **Pengguna nonaktif** tidak bisa masuk, dan sesinya diputus bila sedang berjalan.
- **Halaman Hak akses** menampilkan peta dari `App\Support\AccessMap`. Tes Pest memastikan peta itu sama dengan penjaga sebenarnya: peran yang tercantum bisa membuka, dan peran lain mendapat 403.

## 6. Diorama

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

## 7. Batasan yang perlu diketahui

- **Perlindungan hanya di tingkat aplikasi.** `AppendOnly` dan Action menjaga data selama perubahan lewat aplikasi (Eloquent). **Tidak ada trigger database**, jadi kueri SQL langsung atau mengedit tabel lewat phpMyAdmin tetap bisa mengubah atau menghapus ledger. Untuk produksi, langkah berikutnya adalah trigger atau hak akses database yang menolak `UPDATE`/`DELETE` pada tabel ledger.
- **Keserentakan sederhana.** Beberapa Action mengunci baris dengan `lockForUpdate`, misalnya shift saat menjual atau membatalkan, dan anggota saat menulis simpanan. Tetapi tidak ada strategi anti-deadlock dan tidak ada tes beban atau keserentakan.
- **Satu koperasi**, tidak multi tenant.
- **Polling, bukan siaran langsung.** Penjualan baru muncul di diorama Beranda paling lambat sekitar 5 detik setelah dibayar.
- **Tanpa tombol senyap dan tanpa mode hemat daya** (keputusan pemilik). Bunyi hanya bisa dimatikan lewat pengaturan suara perangkat atau tab browser.
- **Pembayaran hanya tunai.** Tombol "Simpanan anggota" di kasir tampil nonaktif dengan tulisan "segera hadir".
- **Halaman bawaan starter kit** (login, lupa sandi, Settings) belum diterjemahkan. Halaman awal `/` masih halaman sambutan bawaan Laravel; aplikasinya dimulai dari `/login`.
- **Halaman Anggota** berfungsi, tetapi belum diberi tema pixel karena pos Koperasi ditunda.

## 8. Yang sengaja tidak dibuat (keputusan versi tugas)

Daftar ini keputusan ruang lingkup, bukan fitur yang lupa dibuat. Satu-satunya persyaratan tugas adalah Laravel, jadi waktu dipakai untuk inti yang benar dan diorama.

| Tidak dibuat | Alasan |
| --- | --- |
| QRIS dan pembayaran non-tunai | Butuh penyedia pembayaran dan akun; di luar ruang lingkup tugas |
| Diskon dan harga khusus anggota | Menambah aturan uang yang perlu divalidasi pengurus koperasi |
| Mode offline (PWA) | Rumit (sinkronisasi dan konflik); aplikasi dianggap selalu terhubung |
| Struk via WhatsApp | Butuh layanan pihak ketiga |
| Retur setelah shift tutup, Stock Opname, multi gudang | Fitur gudang lanjutan; koreksi cukup lewat Penyesuaian stok |
| Menu Pembelian/PO dan Pengaturan | Barang masuk dicatat langsung dari supplier |
| Trigger database, penguncian anti-deadlock, tes keserentakan | Disederhanakan untuk tugas (lihat Batasan) |
| SHU dan pinjaman (Tahap 7), Reverb dengan layar diorama terpisah (Tahap 8) | Bonus, sengaja dilewati |
| Modul RAT, adegan gudang dan balai di diorama | Fase lanjutan di rencana awal |
| Pos Koperasi di diorama | Ditunda; anggota dan simpanan dibuka lewat menu Anggota |

Rencana lengkap dan sejarah keputusan per tahap ada di `PROGRESS.md` dan `docs/skema.md`.

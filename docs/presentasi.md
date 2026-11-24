# Bahan presentasi: Kasir Koperasi

Naskah demo 5 sampai 7 menit, poin penjelasan per fitur, dan pertanyaan yang mungkin muncul beserta jawabannya. Cara instal ada di [README](../README.md); alasan desain dan batasan ada di [desain.md](desain.md).

## Persiapan (sebelum dosen datang)

1. **Nyalakan server:** MySQL di XAMPP, `php artisan serve`, dan `npm run dev`. Lihat README.
2. **Data segar:** `php artisan migrate:fresh --seed` (menghapus data lama di database `kasir`), lalu `php artisan storage:link` bila belum pernah.
3. **Siapkan dua jendela browser** supaya tidak perlu keluar-masuk akun:
   - jendela biasa: masuk sebagai **Kasir** (`kasir@kasir.test` / `password`);
   - jendela penyamaran (incognito): masuk sebagai **Admin** (`admin@kasir.test` / `password`).
4. **Buka langsung `http://localhost:8000/login`**, bukan `/`. Halaman `/` masih halaman sambutan bawaan Laravel.
5. **Klik sekali di Beranda** supaya bunyi 8-bit aktif. Browser baru mengizinkan suara setelah ada klik.
6. **Shift kasir:** seeder sudah membuka shift untuk kasir. Bila layar kasir meminta "Buka shift", isi kas awal (misalnya 100000) lalu klik **Buka shift**.
7. **Postman (opsional, untuk REST API):**
   - buat permintaan `POST http://localhost:8000/api/v1/token` dengan akun kasir;
   - simpan tokennya sebagai Bearer Token;
   - siapkan `GET /produk`, `POST /keranjang/hitung`, dan `POST /penjualan`.

   Contoh isinya ada di [api.md](api.md).

## Alur demo (6–8 menit)

| Waktu | Masuk sebagai | Yang dilakukan | Yang dijelaskan |
| --- | --- | --- | --- |
| 0:00 | Kasir | Tunjukkan **Beranda**: diorama toko, kartu **Hari Ini** di kiri atas, rak berisi barang. | Satu aplikasi untuk kasir, stok, dan simpanan. Diorama bergerak dari data nyata, bukan animasi acak saja. |
| 0:40 | Kasir | Klik tombol pos **Inventaris** di bawah gurita. Muncul pesan penolakan. Lalu klik pos **Kasir** di bawah zombie, dan petugas menyapa dengan pilihan **Transaksi**, **Riwayat transaksi**, **Laporan penjualan** (redup, "khusus admin"). | Hak akses per peran. Penolakan juga dijaga di server (403), bukan hanya disembunyikan. |
| 1:10 | Kasir | Pilih **Transaksi**. Cari atau pindai barang (misalnya "Air"), klik kartu produk, ubah jumlah dengan **+**/**−**. Perlihatkan lencana stok di grid. | Harga diambil dari server. Stok diperiksa saat bayar. |
| 2:00 | Kasir | Pilih **Tunai** → **Pas** → **Proses Pembayaran**. Layar **Transaksi Berhasil** tampil; klik **Cetak Struk** sebentar, lalu **Transaksi Baru**. | Satu transaksi database: nota, rincian, pembayaran, dan mutasi stok sekaligus. |
| 2:40 | Kasir | Kembali ke **Beranda**. Dalam sekitar 5 detik pelanggan pixel datang dan dilayani; angka kartu Hari Ini naik. Klik pelanggan itu: kartunya menampilkan nomor nota dan barang. | Diorama hanya membaca data (polling 5 detik). |
| 3:20 | Kasir + Admin | **Skenario soal ("30% Hard Problem").** Lihat langkahnya di bagian berikut. | Checkout all-or-nothing: satu barang gagal, seluruh keranjang di-rollback. |
| 4:30 | Admin | Menu **Inventaris → Produk**: kartu angka, gambar barang, lencana Aman/Menipis/Habis. Klik ikon **Kartu stok** untuk barang yang baru dijual. | Stok = ledger. Setiap baris punya `balance_after`. Penjualan yang berhasil muncul sebagai mutasi keluar; percobaan yang di-rollback tidak meninggalkan jejak. |
| 5:00 | Admin | **Kasir → Riwayat transaksi** → klik **Batalkan** pada penjualan tadi, isi alasan, lalu konfirmasi. Buka **Inventaris → tab Stok Keluar**: mutasinya ditandai dibatalkan. Kartu stok menunjukkan baris pembalik. | Penjualan tidak diedit atau dihapus. Pembatalan adalah baris baru di `sale_voids` dan mutasi pembalik. |
| 5:50 | Admin | **Laporan → Penjualan**, tab **Hari ini**: angkanya sama dengan kartu Beranda, dan penjualan yang dibatalkan tampil terpisah. Klik **Ekspor CSV**. Sekilas **Laporan → Inventaris**. | Satu sumber angka untuk laporan dan Beranda. |
| 6:40 | Admin | **Admin → Hak akses**: tabel apa yang bisa dibuka tiap peran. Sekilas **Pengguna**: nonaktifkan, bukan hapus. | Tiga peran, dijaga middleware di server, dan peta ini dites agar sama dengan penjaga sebenarnya. |
| 7:20 (opsional) | Admin | **Admin → Diorama lab** → **Simulasi pesanan** beberapa kali. | Alat demo untuk mengisi toko tanpa mengetik banyak transaksi. |

**Cadangan bila waktu sempit:** lewati baris 4:30 dan 6:40. Inti demonya: jual, skenario soal (rollback), lihat diorama, batalkan, lalu cocokkan laporan.

### Skenario soal: barang ke-4 habis di tengah checkout

Tujuannya menunjukkan bahwa bila satu barang gagal saat checkout, **seluruh** transaksi keranjang di-rollback dan stok tidak berantakan.

**Cara A, dua jendela browser (paling mudah dilihat):**

1. **Persiapan:** stok **Cokelat batang** di data demo 0. Sebelum demo, isi dulu lewat Admin: **Penyesuaian stok → Koreksi tambah**, misalnya 3 batang.

   **Jendela Kasir:** isi keranjang 4 barang berurutan, yaitu Air mineral, Biskuit, Keripik, lalu **Cokelat** sebagai barang ke-4. Isi uang dengan **Pas**, tetapi **jangan bayar dulu**. Sebutkan stok barang 1–3 yang terlihat di grid.
2. **Jendela Admin:** **Inventaris → Penyesuaian stok** → pilih barang ke-4 → **Koreksi kurang** sebanyak seluruh stoknya, alasan "dibeli lewat jalur lain". Stoknya sekarang 0.
3. **Jendela Kasir:** klik **Proses Pembayaran**. Muncul pesan "Stok … tidak cukup", baris barang ke-4 ditandai merah ("Barang ini membatalkan transaksi"), dan keranjang tetap utuh.
4. **Bukti rollback (jendela Admin):**
   - buka **Kartu stok** barang 1–3: tidak ada mutasi baru, padahal di dalam transaksi barang-barang itu sempat diproses sebelum barang ke-4 gagal;
   - **Riwayat transaksi** tidak bertambah.
5. **Kasir:** hapus barang ke-4 dari keranjang lalu bayar lagi. Kali ini berhasil.

**Cara B, Postman (REST API):**

1. `POST /keranjang/hitung` dengan 4–5 barang. `all_stock_enough: true`.
2. Habiskan stok barang ke-4 lewat jendela Admin (seperti langkah A2).
3. `POST /penjualan` dengan keranjang yang sama → **409** dengan `rolled_back: true` dan `failed_item` = barang ke-4.
4. `GET /produk`: stok barang lain tidak berubah.

Data demo hanya berisi 4 produk. Skenario persis dengan 5 barang ada di tes otomatis `tests/Feature/Api/ApiCheckoutTest.php`, dan bisa ditunjukkan dengan `php artisan test tests/Feature/Api`.

**Hindari saat demo:**
- halaman `/` (sambutan bawaan Laravel);
- Settings (bawaan starter kit, berbahasa Inggris);
- halaman Anggota, kecuali ditanya, karena belum bertema pixel.

## Poin penjelasan per fitur

- **REST API:**
  - token Bearer untuk Postman, cookie sesi untuk layar kasir;
  - produk dan stok, hitung total tanpa menyimpan, checkout all-or-nothing (409 bila stok kurang), dan mutasi stok;
  - hak akses sama dengan aplikasi.
- **Kasir:**
  - membayar lewat REST API yang sama dengan Postman;
  - satu kolom untuk cari sekaligus pindai barcode, yang selalu kembali fokus;
  - satuan lain seperti dus tampil sebagai tombol "+ dus";
  - bayar tunai dengan tombol cepat;
  - struk 80 mm;
  - shift dengan kas awal, kas akhir, dan selisih yang wajib diberi catatan.
- **Riwayat:**
  - kasir hanya melihat penjualannya sendiri;
  - admin melihat semua dan bisa membatalkan, selama shift masih terbuka.
- **Inventaris:**
  - kartu angka dari ledger;
  - barang masuk dengan supplier dan halaman detail penerimaan;
  - penyesuaian stok (kurang, tambah, saldo awal);
  - stok keluar berisi penjualan dan koreksi minus.
- **Laporan:**
  - filter Hari ini, 7 hari, Bulan ini, Rentang;
  - penjualan per hari, produk terlaris, per kasir, dan dibatalkan;
  - nilai stok dengan harga jual;
  - CSV pemisah titik koma, aman dari rumus Excel.
- **Anggota dan simpanan (bendahara):**
  - simpanan pokok, wajib, sukarela;
  - saldo dari ledger;
  - koreksi dengan baris pembalik;
  - anggota keluar.
- **Diorama:**
  - toko isometrik buatan sendiri dengan palet 24 warna, digambar Canvas 2D dari kode;
  - siang/senja/malam mengikuti jam;
  - rak mengikuti stok, paling banyak 5 pelanggan tampil;
  - bunyi 8-bit.

## Pertanyaan yang mungkin muncul

**1. Kenapa stok tidak disimpan di satu kolom saja?**
Satu kolom yang ditimpa tidak punya jejak. Dengan ledger (`stock_movements`), setiap perubahan adalah baris baru dengan jenis, jumlah, siapa, kapan, dan `balance_after`. Selisih bisa dilacak sampai ke transaksinya.

**2. Bagaimana mengoreksi stok yang salah?**
Lewat **Penyesuaian stok**, yang menambah mutasi koreksi baru. Baris lama tidak diubah. Hal yang sama berlaku untuk simpanan, lewat baris pembalik.

**3. Kalau ada yang mengubah tabel lewat phpMyAdmin?**
Itu masih bisa. Perlindungan ada di tingkat aplikasi: trait `AppendOnly` menolak `update`/`delete` lewat model, dan semua penulisan lewat satu Action. Tidak ada trigger database. Itu batasan yang disengaja untuk versi tugas; untuk produksi, tambahkan trigger atau hak akses database yang menolak `UPDATE`/`DELETE` pada tabel ledger.

**4. Kenapa penjualan dibatalkan (void), tidak dihapus atau diedit?**
Supaya jejak uang dan stok tetap utuh. Pembatalan menambah baris `sale_voids` beserta alasan dan siapa, lalu mengembalikan stok lewat mutasi `sale_void`. Laporan tidak menghitung penjualan yang dibatalkan, tetapi menampilkannya terpisah.

**5. Bisakah kasir memanipulasi harga dari browser?**
Tidak. Browser hanya mengirim barang dan jumlah. `CompleteSale` membaca harga jual dari database, lalu menghitung total di server.

**6. Bagaimana kalau stok kurang saat bayar?**
Seluruh penjualan dibatalkan dalam satu transaksi database, dan tidak ada data setengah jadi. Stok tidak boleh minus. API menjawab 409 dan menyebut barang mana yang gagal, dan layar kasir menandai baris itu.

**7. Bagaimana hak akses dijaga?**
Middleware peran (spatie/laravel-permission) di tiap kelompok rute, dan Gate untuk pos di Beranda. Membuka alamat langsung tetap 403. Ada tes Pest untuk tiap peran, dan halaman Hak akses dites agar sama dengan penjaga sebenarnya.

**8. Bagaimana diorama tahu ada penjualan?**
Beranda menanyakan peristiwa baru ke server tiap 5 detik (polling, hanya baca). Diorama tidak pernah menulis data.

**9. Kenapa tidak memakai WebSocket (Reverb)?**
Reverb adalah bonus Tahap 8 yang dilewati. Polling 5 detik cukup untuk demo dan lebih sederhana dijalankan di XAMPP. Kode peristiwanya sudah disiapkan sehingga bisa disiarkan nanti.

**10. Apakah diorama memperlambat kasir?**
Prinsipnya data lebih dulu, animasi mengikuti. Layar kasir tidak menunggu animasi. Diorama dibatasi 30 FPS dan paling banyak 5 pelanggan, dan berhenti saat tab tersembunyi.

**11. Apakah semua pelanggan pixel itu transaksi nyata?**
Tidak semua. Ada figuran dan pembeli acak supaya toko hidup. Saat diklik, kartunya menandai "bukan transaksi nyata" atau "Hanya melihat-lihat". Pembeli dari penjualan sungguhan menampilkan nomor nota dan barangnya.

**12. Kenapa uang disimpan sebagai bilangan bulat?**
Rupiah tidak memakai sen, dan bilangan bulat menghindari galat pembulatan desimal.

**13. Bagaimana pengujiannya?**
423 tes Pest (database terpisah `kasir_test`) dan 227 tes Vitest. Yang dites antara lain:
- aturan stok dan simpanan;
- penjualan dan pembatalan;
- REST API, termasuk skenario soal 5 barang dengan barang ke-4 habis;
- laporan yang cocok dengan Beranda;
- akses 403 per peran;
- sprite hanya memakai warna palet.

Ditambah tsc, lint, dan Pint.

**14. Kenapa tidak ada QRIS, diskon, atau mode offline?**
Keputusan ruang lingkup versi tugas: butuh penyedia pembayaran, aturan uang tambahan, atau sinkronisasi yang rumit. Daftar lengkapnya ada di `docs/desain.md` bagian 9.

**15. Kenapa ada tiga peran saja, dan apa itu "koperasi"?**
Dalam tugas ini "koperasi" adalah peran pengelola (admin) yang mengelola seluruh operasional. Kasir hanya melayani penjualan, dan bendahara mengurus anggota dan simpanan.

**16. Apa yang terjadi pada pengguna yang dinonaktifkan?**
Ia tidak bisa masuk, dan sesinya diputus bila sedang berjalan. Data lamanya tetap ada. Harus selalu ada minimal satu admin aktif.

**17. Apa batasan terbesar aplikasi ini?**
- tanpa trigger database;
- deadlock dan beban tinggi tidak diuji dengan banyak koneksi sungguhan (pencegahannya ada, tesnya berurutan);
- satu koperasi;
- pembayaran hanya tunai;
- halaman login dan Settings masih bawaan starter kit.

**18. Kalau dikembangkan lagi, apa berikutnya?**
- SHU dan pinjaman (Tahap 7);
- Reverb dengan layar diorama terpisah (Tahap 8);
- pembayaran dengan saldo simpanan;
- trigger database untuk ledger.

**19. Endpoint REST API apa saja, dan bagaimana mengaksesnya?**
`/api/v1`:
- `token`;
- `produk`;
- `keranjang/hitung` (perhitungan total);
- `penjualan` (checkout);
- `penjualan/{id}`;
- `produk/{id}/mutasi` (mutasi stok, admin).

Klien di luar browser mengambil token Bearer lewat `POST /token` (Laravel Sanctum). Layar kasir yang sudah login memakai cookie sesinya. Hak aksesnya sama dengan aplikasi, dan rinciannya ada di `docs/api.md`.

**20. Apa artinya "all-or-nothing", dan di mana kodenya?**
`App\Actions\Pos\CompleteSale`: semua langkah checkout ada di satu `DB::transaction` (nota, tiap baris barang, mutasi stok, pembayaran). Bila barang ke-4 gagal, Laravel me-rollback transaksi, sehingga baris dan mutasi barang 1–3 yang sudah ditulis ikut hilang. Tes `ApiCheckoutTest` memeriksa bahwa jumlah nota, baris, pembayaran, dan mutasi tidak bertambah, dan stok kelima barang tetap.

**21. Bagaimana kalau stok berubah di antara "hitung" dan "bayar"?**
Hasil hitung hanya peringatan. Saat bayar, setiap produk dikunci (`lockForUpdate`) dan saldonya dibaca ulang dari ledger di dalam transaksi. Penjualan lain yang menghabiskan stok pasti terlihat, dan checkout ditolak 409.

**22. Bagaimana mencegah deadlock bila dua kasir checkout bersamaan?**
Semua produk keranjang dikunci sekaligus menurut urutan id sebelum apa pun ditulis, sehingga setiap transaksi meminta kunci dalam urutan yang sama dan tidak bisa saling menunggu. Bila database tetap melaporkan deadlock, transaksi diulang paling banyak 3 kali; percobaan yang gagal sudah di-rollback. Deadlock sungguhan tidak bisa diuji dengan tes satu koneksi, dan itu dinyatakan sebagai batasan.

**23. Kenapa stok kurang dijawab 409, bukan 422?**
422 dipakai untuk isian yang salah atau aturan kasir (belum buka shift, uang kurang). Stok yang tidak cukup adalah konflik dengan keadaan data saat ini, karena isiannya sendiri benar. Kode 409 (Conflict) membuat klien tahu ia perlu memperbarui keranjang, dan `failed_item` menunjuk barang mana.

**24. Dari mana gambar karakter dan barang?**
Sprite toko digambar dari kode. Karakter penjaga (zombie, gurita), ikon menu, dan gambar barang contoh diolah dari gambar pilihan pemilik proyek, dan sebagian mirip karya atau merek pihak lain. Semuanya hanya untuk tugas, tidak dipublikasikan.

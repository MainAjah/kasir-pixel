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

## Alur demo (5–7 menit)

| Waktu | Masuk sebagai | Yang dilakukan | Yang dijelaskan |
| --- | --- | --- | --- |
| 0:00 | Kasir | Tunjukkan **Beranda**: diorama toko, kartu **Hari Ini** di kiri atas, rak berisi barang. | Satu aplikasi untuk kasir, stok, dan simpanan. Diorama bergerak dari data nyata, bukan animasi acak saja. |
| 0:40 | Kasir | Klik tombol pos **Inventaris** di bawah gurita. Muncul pesan penolakan. Lalu klik pos **Kasir** di bawah zombie, dan petugas menyapa dengan pilihan **Transaksi**, **Riwayat transaksi**, **Laporan penjualan** (redup, "khusus admin"). | Hak akses per peran. Penolakan juga dijaga di server (403), bukan hanya disembunyikan. |
| 1:10 | Kasir | Pilih **Transaksi**. Cari atau pindai barang (misalnya "Air"), klik kartu produk, ubah jumlah dengan **+**/**−**. Perlihatkan lencana stok di grid. | Harga diambil dari server. Stok diperiksa saat bayar. |
| 2:00 | Kasir | Pilih **Tunai** → **Pas** → **Proses Pembayaran**. Layar **Transaksi Berhasil** tampil; klik **Cetak Struk** sebentar, lalu **Transaksi Baru**. | Satu transaksi database: nota, rincian, pembayaran, dan mutasi stok sekaligus. |
| 2:40 | Kasir | Kembali ke **Beranda**. Dalam sekitar 5 detik pelanggan pixel datang dan dilayani; angka kartu Hari Ini naik. Klik pelanggan itu: kartunya menampilkan nomor nota dan barang. | Diorama hanya membaca data (polling 5 detik). |
| 3:20 | Admin | Menu **Inventaris → Produk**: kartu angka, gambar barang, lencana Aman/Menipis/Habis. Klik ikon **Kartu stok** untuk barang yang baru dijual. | Stok = ledger. Setiap baris punya `balance_after`, dan penjualan tadi muncul sebagai mutasi keluar. |
| 4:00 | Admin | **Kasir → Riwayat transaksi** → klik **Batalkan** pada penjualan tadi, isi alasan, lalu konfirmasi. Buka **Inventaris → tab Stok Keluar**: mutasinya ditandai dibatalkan. Kartu stok menunjukkan baris pembalik. | Penjualan tidak diedit atau dihapus. Pembatalan adalah baris baru di `sale_voids` dan mutasi pembalik. |
| 4:50 | Admin | **Laporan → Penjualan**, tab **Hari ini**: angkanya sama dengan kartu Beranda, dan penjualan yang dibatalkan tampil terpisah. Klik **Ekspor CSV**. Sekilas **Laporan → Inventaris**. | Satu sumber angka untuk laporan dan Beranda. |
| 5:40 | Admin | **Admin → Hak akses**: tabel apa yang bisa dibuka tiap peran. Sekilas **Pengguna**: nonaktifkan, bukan hapus. | Tiga peran, dijaga middleware di server, dan peta ini dites agar sama dengan penjaga sebenarnya. |
| 6:20 (opsional) | Admin | **Admin → Diorama lab** → **Simulasi pesanan** beberapa kali. | Alat demo untuk mengisi toko tanpa mengetik banyak transaksi. |

**Cadangan bila waktu sempit:** lewati baris 3:20 dan 5:40. Inti demonya: jual, lihat diorama, batalkan, lalu cocokkan laporan.

**Hindari saat demo:**
- halaman `/` (sambutan bawaan Laravel);
- Settings (bawaan starter kit, berbahasa Inggris);
- halaman Anggota, kecuali ditanya, karena belum bertema pixel.

## Poin penjelasan per fitur

- **Kasir:**
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
Seluruh penjualan dibatalkan dalam satu transaksi database, dan tidak ada data setengah jadi. Stok tidak boleh minus.

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
393 tes Pest (database terpisah `kasir_test`) dan 223 tes Vitest. Yang dites antara lain:
- aturan stok dan simpanan;
- penjualan dan pembatalan;
- laporan yang cocok dengan Beranda;
- akses 403 per peran;
- sprite hanya memakai warna palet.

Ditambah tsc, lint, dan Pint.

**14. Kenapa tidak ada QRIS, diskon, atau mode offline?**
Keputusan ruang lingkup versi tugas: butuh penyedia pembayaran, aturan uang tambahan, atau sinkronisasi yang rumit. Daftar lengkapnya ada di `docs/desain.md` bagian 8.

**15. Kenapa ada tiga peran saja, dan apa itu "koperasi"?**
Dalam tugas ini "koperasi" adalah peran pengelola (admin) yang mengelola seluruh operasional. Kasir hanya melayani penjualan, dan bendahara mengurus anggota dan simpanan.

**16. Apa yang terjadi pada pengguna yang dinonaktifkan?**
Ia tidak bisa masuk, dan sesinya diputus bila sedang berjalan. Data lamanya tetap ada. Harus selalu ada minimal satu admin aktif.

**17. Apa batasan terbesar aplikasi ini?**
- tanpa trigger database;
- keserentakan hanya kunci baris sederhana, tanpa tes beban;
- satu koperasi;
- pembayaran hanya tunai;
- halaman login dan Settings masih bawaan starter kit.

**18. Kalau dikembangkan lagi, apa berikutnya?**
- SHU dan pinjaman (Tahap 7);
- Reverb dengan layar diorama terpisah (Tahap 8);
- pembayaran dengan saldo simpanan;
- trigger database untuk ledger.

**19. Dari mana gambar karakter dan barang?**
Sprite toko digambar dari kode. Karakter penjaga (zombie, gurita), ikon menu, dan gambar barang contoh diolah dari gambar pilihan pemilik proyek, dan sebagian mirip karya atau merek pihak lain. Semuanya hanya untuk tugas, tidak dipublikasikan.

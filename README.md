# Kasir Koperasi

Aplikasi web untuk toko koperasi kecil. Kasir, inventaris, dan simpanan anggota ada dalam satu tempat, dengan satu ciri khas: **diorama toko bergaya pixel** di Beranda yang bergerak mengikuti penjualan sungguhan.

Proyek ini dibuat untuk tugas kuliah dengan Laravel. Ini bukan sistem produksi untuk koperasi sungguhan.

- **Backend:** Laravel 13, Fortify (login), spatie/laravel-permission (peran), Pest (tes).
- **Frontend:** Inertia + React 19 + TypeScript, Tailwind CSS 4. Diorama digambar dengan Canvas 2D.
- **Database:** MySQL/MariaDB (XAMPP).

Penjelasan desain dan batasannya ada di [docs/desain.md](docs/desain.md). Naskah demo ada di [docs/presentasi.md](docs/presentasi.md).

---

## Tiga peran

| Peran | Untuk siapa | Yang bisa dibuka |
| --- | --- | --- |
| **Admin** (pengelola koperasi) | Pengurus yang mengelola seluruh operasional | Semua fitur |
| **Kasir** | Petugas yang melayani penjualan | Beranda, pos Kasir, transaksi, riwayat penjualannya sendiri, daftar produk dan stok (hanya lihat) |
| **Bendahara** | Pengurus keuangan | Beranda, anggota dan simpanan |

Hak akses dijaga **di server**, lewat middleware peran di tiap rute dan Gate untuk pos di Beranda. Tombol yang tidak boleh dipakai juga disembunyikan atau diredupkan, tetapi membuka alamatnya langsung tetap ditolak (403). Daftar lengkapnya bisa dilihat admin di halaman **Hak akses**.

## Fitur per peran

**Semua peran**
- **Beranda:**
  - diorama toko isometrik yang memenuhi layar;
  - pelanggan pixel berbelanja saat ada penjualan sungguhan;
  - rak terisi sesuai stok nyata, dan suasana siang/senja/malam mengikuti jam;
  - kartu "Hari Ini" berisi penjualan, transaksi, dan stok menipis.
- **Pos di diorama:** Kasir dan Inventaris. Pos yang tidak sesuai peran ditolak dengan pesan singkat.

**Kasir (juga bisa dipakai admin)**
- **Shift:** buka shift dengan kas awal, tutup shift dengan hitungan kas akhir dan selisih.
- **Transaksi:**
  - cari barang atau pindai barcode, tab kategori, grid produk dengan lencana stok;
  - keranjang dengan tombol + dan −;
  - bayar tunai dengan kembalian;
  - layar "Transaksi Berhasil" dan cetak struk 80 mm.
- **Riwayat transaksi:** tab Semua, Hari Ini, 7 Hari, Bulanan, dengan lencana Selesai/Batal. Kasir hanya melihat penjualannya sendiri.
- **Produk:** daftar produk dan stok, hanya lihat.

**Admin**
- **Inventaris:**
  - kartu angka: total produk, stok tersedia, stok menipis, stok habis;
  - tab Daftar Barang, Stok Masuk, Stok Keluar;
  - kartu stok per produk (riwayat mutasi).
- **Produk dan kategori:** tambah, ubah, nonaktifkan; satuan dan konversi (pcs, pak, dus); barcode; gambar barang.
- **Stok:**
  - **Barang masuk**, dengan supplier dan halaman detail penerimaan;
  - **Penyesuaian stok** (koreksi kurang/tambah, saldo awal);
  - **Supplier.**
- **Batalkan penjualan:** hanya selama shift masih terbuka, dan alasan wajib diisi.
- **Laporan:** penjualan dan inventaris dengan filter periode, plus **ekspor CSV**.
- **Pengguna dan Hak akses:** tambah/ubah pengguna, nonaktifkan (bukan hapus), dan ganti peran.
- **Diorama lab:** halaman pratinjau dengan tombol **"Simulasi pesanan"** untuk demo.

**Bendahara (juga admin)**
- **Anggota:** nomor anggota unik.
- **Simpanan:** pokok, wajib, sukarela. Setoran, penarikan sukarela, koreksi lewat baris pembalik, dan anggota keluar.

---

## Kebutuhan

| Perangkat | Versi | Catatan |
| --- | --- | --- |
| PHP | 8.3 atau lebih baru (diuji di 8.5) | Ekstensi `pdo_mysql`, `mbstring`, `fileinfo`, `openssl` aktif (bawaan XAMPP) |
| Composer | 2.x | |
| Node.js dan npm | Node 20 atau lebih baru (diuji di 26) | |
| MariaDB/MySQL | Bawaan XAMPP | Jalankan **MySQL** dari XAMPP Control Panel |

Pastikan `php`, `composer`, `node`, dan `npm` bisa dipanggil dari terminal:

```bash
php -v
composer -V
node -v
npm -v
```

## Instal dari nol

1. **Ambil kode dan pasang dependensi**

   ```bash
   git clone <alamat-repo> kasir
   cd kasir
   composer install
   npm install
   ```

2. **Buat dua database** di phpMyAdmin (http://localhost/phpmyadmin), dengan collation `utf8mb4_unicode_ci`:
   - `kasir`: database aplikasi;
   - `kasir_test`: database khusus tes (dipakai `php artisan test`, lihat `phpunit.xml`).

3. **Siapkan `.env`**

   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

   Lalu ubah bagian database di `.env`. Nilai bawaan `.env.example` masih `_scaffold`.

   ```dotenv
   APP_NAME="Kasir Koperasi"
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=kasir
   DB_USERNAME=root
   DB_PASSWORD=
   ```

   Biarkan `APP_ENV=local`. Data contoh hanya diisi di lingkungan `local`.

4. **Buat tabel dan isi data demo**

   ```bash
   php artisan migrate --seed
   php artisan storage:link
   ```

   Seeder membuat:
   - tiga akun demo;
   - kategori dan empat produk bergambar, dengan stok penuh, setengah, sedikit, dan kosong;
   - beberapa anggota dengan simpanan;
   - satu shift kasir yang sudah terbuka.

   `storage:link` diperlukan agar gambar barang tampil.

   Untuk mengulang dari awal (**menghapus semua data** di database `kasir`):

   ```bash
   php artisan migrate:fresh --seed
   ```

## Akun demo

Semua akun memakai kata sandi **`password`**.

| Peran | Email |
| --- | --- |
| Admin | `admin@kasir.test` |
| Kasir | `kasir@kasir.test` |
| Bendahara | `bendahara@kasir.test` |

> Akun ini hanya untuk demo. Kata sandinya sengaja lemah dan dibuat oleh `DatabaseSeeder`. Jangan memakai seeder ini di server yang bisa diakses orang lain.

## Menjalankan

Buka dua terminal di folder proyek:

```bash
# Terminal 1: server Laravel
php artisan serve
```

```bash
# Terminal 2: Vite (aset React dan CSS)
npm run dev
```

Lalu buka **http://localhost:8000/login**. Setelah masuk, aplikasi membuka Beranda (`/dashboard`).

Tanpa server Vite, halaman tampil kosong. Sebagai gantinya, bisa juga `npm run build` sekali, lalu cukup `php artisan serve`.

## Menjalankan tes

```bash
# Tes server (Pest), memakai database kasir_test
php artisan test

# Tes frontend (Vitest)
npx vp test run

# Pemeriksaan tipe, lint, dan gaya kode
npx tsc --noEmit
npx vp lint
./vendor/bin/pint --test
```

- Saat ini ada **393 tes Pest** dan **223 tes Vitest**, dan semuanya lulus.
- Tes Pest mencakup aturan stok, kasir, pembatalan, simpanan, laporan, hak akses per peran (403), dan kecocokan angka Beranda dengan laporan.
- Catatan: menjalankan Vitest menghapus berkas font milik server Vite. Bila font pixel hilang di browser, hentikan lalu jalankan ulang `npm run dev`.

## Struktur folder singkat

```text
app/
  Actions/        logika bisnis, satu kelas satu aksi
                  (CompleteSale, VoidSale, AdjustStock, ReceiveStock, PostSaving, laporan)
  Enums/          peran, jenis mutasi stok, jenis simpanan, pos di Beranda
  Http/
    Controllers/  controller tipis yang memanggil Action
    Requests/     validasi isian
  Models/         model Eloquent; ledger memakai Concerns/AppendOnly
  Support/        AccessMap (peta hak akses), periode laporan, penulis CSV
database/
  migrations/     skema tabel
  seeders/        akun demo dan data contoh (beserta gambar produk)
resources/
  css/app.css     token warna palet pixel dan utilitas bingkai
  js/
    pages/        halaman Inertia (kasir, inventaris, laporan, pengguna, anggota, ...)
    components/   komponen bersama (pixel, kasir, inventaris, beranda, layout)
    diorama/      mesin diorama: engine (loop, jalur, feed), actors, scenes, sprites, render
routes/           web.php, pos.php, inventory.php, members.php, admin.php
tests/Feature/    tes Pest
docs/             skema, rancangan diorama, desain, bahan presentasi
```

## Desain dan batasan (ringkas)

- **Stok dan simpanan berbentuk ledger yang hanya bisa ditambah.** Angka stok dan saldo dihitung dari catatan mutasi, bukan dari satu kolom yang ditimpa. Koreksi dibuat sebagai baris baru (pembalik).
- **Penjualan tidak pernah diedit.** Pembatalan dicatat di tabel terpisah (`sale_voids`), dan stok dikembalikan lewat mutasi baru.
- **Harga selalu dari server.** Browser hanya mengirim barang dan jumlah.
- **Batasan:** perlindungan ini ada di tingkat aplikasi (model dan Action), **tanpa trigger database**. Mengubah tabel langsung lewat phpMyAdmin tetap bisa.
- **Sengaja tidak dibuat untuk versi tugas:** QRIS, diskon, mode offline, SHU, pinjaman, Reverb, dan lainnya. Daftar lengkap beserta alasannya ada di [docs/desain.md](docs/desain.md).

## Tentang aset gambar

- **Sprite diorama** (lantai, rak, meja, pelanggan, dan lainnya) digambar dari kode dengan palet 24 warna.
- **Karakter penjaga** (zombie di pos Kasir, gurita di pos Inventaris), **ikon menu**, dan **gambar barang contoh** diolah dari gambar yang dipilih pemilik proyek, dan sebagian tampak berasal dari karya atau merek pihak lain.
- Aset itu dipakai **hanya untuk keperluan tugas dan demo**, tidak untuk dipublikasikan atau dikomersialkan.

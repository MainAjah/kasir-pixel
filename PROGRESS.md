# PROGRESS

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

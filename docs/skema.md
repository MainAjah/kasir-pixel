# Rancangan Skema Database — Tahap 0 (versi tugas)

Status: bagian inventaris (3.2, bagian 4, tes Tahap 2) **sudah dibangun di Tahap 2**; kasir dan simpanan masih rancangan.
Revisi: 21 Nov 2026 (Tahap 2: keputusan Q1-Q5). Acuan: `CLAUDE.md`, bagian "Versi tugas".

Ini proyek tugas kuliah, bukan produksi. Skema dibuat sesederhana mungkin, tetapi aturan ledger tetap dijaga.

Tanda:

- **[usulan]**: tidak tercantum di `CLAUDE.md`, perlu disetujui.
- Keputusan skema ada di bagian 9.

---

## 0. Keputusan yang sudah ditetapkan

| # | Keputusan |
| --- | --- |
| D1 | Satu koperasi, satu toko. Tidak ada multi tenant dan tidak ada kolom gudang. |
| D2 | Database **MySQL 8** (`CHECK` constraint berlaku sejak 8.0.16). |
| D3 | Tiga peran: `admin`, `kasir`, `bendahara`. |
| D4 | Stok disimpan sebagai bilangan bulat dalam satuan dasar (pcs, gram, ml). |
| D5 | Keranjang ada di browser. Baris `sales` baru dibuat saat pembayaran selesai. |
| D6 | Simpanan dicatat bendahara, terpisah dari laci kasir. |
| D7 | Waktu disimpan UTC dan ditampilkan dalam `Asia/Jakarta`. |

**Dibuang untuk versi tugas:** trigger database, kolom gudang, retur setelah shift tutup, penguncian anti-deadlock, `client_uuid`, tes keserentakan, mode offline, QRIS, WhatsApp.

---

## 1. Prinsip ledger (stok dan simpanan)

1. **Hanya bisa ditambah.** Baris `stock_movements` dan `savings_ledger` tidak pernah di-`UPDATE` atau di-`DELETE`. Tidak ada `soft deletes` dan tidak ada `updated_at`.
2. **Saldo = jumlah mutasi.** Tabel master (`products`, `members`) tidak punya kolom saldo.
3. **`balance_after` di setiap baris.** Saldo sesudah mutasi ditulis sekali saat insert. Saldo terkini adalah `balance_after` baris terakhir, dan kartu stok atau buku simpanan bisa langsung ditampilkan.
4. **Koreksi lewat mutasi baru.** Kesalahan diperbaiki dengan baris pembalik (`reverses_*_id` menunjuk baris asal) atau baris penyesuaian, selalu dengan alasan.
5. **Satu pintu.** Hanya `AdjustStock` dan `PostSaving` yang menulis ke ledger. Action lain memanggil keduanya.
6. **Urutan resmi = `id`.** `occurred_at` hanya informasi.
7. **Penjagaan, dan batasnya.** Perlindungan ledger **hanya di tingkat aplikasi**: (a) Action satu pintu, (b) model Eloquent ledger melempar exception saat `updating` / `deleting` (trait `AppendOnly`), (c) tes Pest. **Database sendiri tidak menolak perubahan**: tidak ada trigger (dibuang untuk versi tugas), jadi `DB::table(...)->update()`, SQL manual, atau akses langsung ke MySQL tetap bisa mengubah atau menghapus baris ledger. Satu-satunya aturan yang ditegakkan database adalah `CHECK (qty <> 0)`, kolom `balance_after` tak bertanda, dan indeks unik pada `reverses_*_id`. Tes tidak mengklaim melindungi dari query langsung.
8. **Satu transaksi database per aksi.** Saat menghitung `balance_after`, baris saldo terakhir dibaca dengan `lockForUpdate()` biasa. Tidak ada aturan urutan kunci.

---

## 2. Diagram relasi

```mermaid
erDiagram
    users ||--o{ cash_shifts : "membuka"
    cash_shifts ||--o{ sales : "berisi"
    members |o--o{ sales : "pembeli (opsional)"
    sales ||--|{ sale_items : "rincian"
    sales ||--|{ payments : "dibayar dengan"
    sales ||--o| sale_voids : "dibatalkan oleh"
    categories |o--o{ products : "mengelompokkan"
    products ||--|{ product_units : "punya satuan"
    products ||--o{ stock_movements : "mutasi"
    stock_entries |o--o{ stock_movements : "dokumen penerimaan"
    sale_items |o--o{ stock_movements : "penjualan/pembatalan"
    stock_movements |o--o| stock_movements : "membalik"
    members ||--o{ savings_ledger : "simpanan"
    savings_ledger |o--o| savings_ledger : "membalik"
```

---

## 3. Tabel

Konvensi:

- PK `id` bigint.
- Uang ditulis `rupiah`: `bigint`, rupiah bulat.
- Jumlah barang: `int` dalam satuan dasar.
- Tabel master memakai `timestamps` + `softDeletes`. Tabel ledger hanya `created_at`.
- Tabel transaksi punya `created_by` (FK `users`).

### 3.1 Pengguna dan peran

**`users`** (bawaan Laravel) + `is_active` (bool) + `deleted_at`.

**Tabel spatie/laravel-permission**: struktur bawaan paket.

| Peran | Hak |
| --- | --- |
| `admin` | semua: pengguna, produk, stok masuk dan koreksi, pembatalan penjualan, laporan, log aktivitas |
| `kasir` | buka dan tutup shift, membuat penjualan |
| `bendahara` | anggota, setoran dan penarikan simpanan, pembalikan simpanan, laporan |

### 3.2 Inventaris

**`categories`**: `name`, timestamps, soft deletes.

**`products`**

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| sku | string unik | |
| name | string | |
| category_id | FK null | |
| min_stock | int | dalam satuan dasar |
| is_active | bool | |
| timestamps, deleted_at | | |

Tidak ada kolom `stock`.

**`product_units`**

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| product_id | FK | |
| name | string | `pcs`, `pak`, `dus`, `gram` |
| conversion | int ≥ 1 | isi satuan dasar per satuan ini (dus = 24) |
| is_base | bool | tepat satu per produk, dengan `conversion` = 1 |
| sell_price | rupiah | harga jual per satuan ini |
| barcode | string null, unik | satu kolom, menunjuk satuan ini (keputusan Q1) |
| timestamps, deleted_at | | |

Aturan (ditegakkan di `SaveProduct`):

- Unik `(product_id, name)`. Tepat satu satuan dasar, isi 1.
- `conversion` tidak boleh diubah setelah satuan dipakai di mutasi (`ProductUnit::isInUse()`). Tahap 3 menambah pengecekan `sale_items`.
- Satuan yang sudah dipakai tidak bisa dihapus. Satuan dasar tidak bisa diganti setelah produk punya mutasi, karena saldo tersimpan dalam satuan dasar.
- Satuan yang belum dipakai dan dihapus (soft delete) melepas barcode dan namanya (nama diberi akhiran `~id`) supaya bisa dipakai lagi.

**`stock_entries`**: catatan penerimaan barang saja (keputusan Q4). Tanpa saldo, tanpa soft delete, tidak bisa diubah. Stok tetap hanya di `stock_movements`.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| number | string unik | `BM-20261121-0001`, urut per hari (tanggal WIB) |
| supplier_name | string null | teks bebas |
| note | text null | |
| occurred_at | datetime | |
| created_by, created_at | | |

Saldo awal (`opening`) dan koreksi (`adjustment`) **tidak** punya dokumen kepala: ditulis langsung ke `stock_movements` dengan `stock_entry_id` null; `adjustment` wajib `note`.

**`stock_movements`** (ledger stok)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| product_id | FK | |
| type | enum | `opening`, `receipt`, `sale`, `sale_void`, `adjustment` |
| qty | int ≠ 0, bertanda | `+` masuk, `−` keluar, satuan dasar |
| balance_after | int tak bertanda | saldo produk setelah mutasi (tidak pernah minus) |
| input_unit_id | FK `product_units` | satuan yang diketik (misalnya dus) |
| input_qty | int | jumlah dalam satuan itu. `qty` = `input_qty × conversion` |
| cost_total | rupiah null | harga beli total, untuk `opening` dan `receipt` |
| stock_entry_id | FK null | hanya untuk `receipt` |
| sale_item_id | FK null | untuk `sale`, `sale_void` |
| reverses_movement_id | FK null, unik | baris yang dibalik; unik agar tidak bisa dibalik dua kali |
| note | string null | |
| occurred_at | datetime | |
| created_by, created_at | | |

Constraint: `CHECK (qty <> 0)`, `balance_after` unsigned, `reverses_movement_id` unik. Indeks `(product_id, id)`. Hanya `AdjustStock` yang boleh menulis ke tabel ini. FK `sale_item_id` ditambahkan di migration Tahap 3.

Waktu: database menyimpan UTC; tampilan dan input tanggal memakai `config('app.display_timezone')` (`Asia/Jakarta`).

| type | Tanda | Sumber |
| --- | --- | --- |
| `opening` | + | langsung, hanya bila produk belum punya mutasi |
| `receipt` | + | `stock_entries` (wajib) |
| `sale` | − | `sale_items` |
| `sale_void` | + | `sale_items`, wajib `reverses_movement_id` |
| `adjustment` | ± | langsung, wajib alasan; juga dipakai untuk membalik mutasi selain `sale` |

### 3.3 Kasir

**`cash_shifts`**

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| user_id | FK | kasir |
| opened_at | datetime | |
| opening_cash | rupiah ≥ 0 | |
| closed_at | datetime null | null = aktif |
| counted_cash | rupiah null | uang fisik saat tutup |
| expected_cash | rupiah null | dihitung sistem saat tutup |
| difference | rupiah null | `counted_cash − expected_cash` |
| closing_note | text null | wajib bila selisih ≠ 0 |
| timestamps | | |

Aturan: satu shift aktif per kasir (dicek di Action `OpenShift`, dengan kunci baris pengguna). Transisi hanya `aktif → tutup`, sekali. Setelah tutup, baris tidak diubah (dijaga di model `CashShift`; tanpa trigger). `CloseShift` dan `VoidSale` sama-sama mengunci baris shift, jadi pembatalan tidak bisa menyelinap saat shift ditutup. Tabel dibuat di Tahap 3.

**`sales`**: dibuat sekali dalam keadaan selesai, tidak pernah diubah (trait `AppendOnly`, tanpa soft delete). **Tahap 3 menunda diskon dan `member_id`**: kolom `member_id` (dengan FK) ditambah di Tahap 4, kolom diskon lewat migration baru bila nanti dibutuhkan; untuk sekarang `total = Σ line_total`.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| number | string unik | `INV-20261121-0001` |
| cash_shift_id | FK | |
| total | rupiah > 0 | Σ `line_total` |
| created_by, created_at | | |

**`sale_items`**: salinan data produk saat transaksi.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| sale_id | FK | |
| product_id, product_unit_id | FK | |
| product_name, unit_name | string | salinan |
| conversion | int | salinan |
| qty | int > 0 | dalam satuan yang dijual |
| base_qty | int | `qty × conversion` |
| unit_price | rupiah | salinan harga saat itu |
| line_total | rupiah | `qty × unit_price` |

**`payments`**

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| sale_id | FK | |
| method | enum | `cash` saja (QRIS dibuang di versi tugas; enum memudahkan menambah cara bayar nanti) |
| amount | rupiah > 0 | |
| tendered | rupiah | uang diterima |
| change | rupiah | `tendered − amount` |
| created_at | | |

Aturan: Σ `payments.amount` = `sales.total`.

**`sale_voids`** (disetujui, Q4): pembatalan, agar `sales` tetap tidak di-update.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| sale_id | FK unik | sekali saja |
| reason | string | wajib |
| created_by, created_at | | `admin` |

Status penjualan dibaca dari ada tidaknya baris `sale_voids`. Foreign key `stock_movements.sale_item_id` → `sale_items.id` ditambahkan lewat migration Tahap 3.

### 3.4 Anggota dan simpanan

**`members`**

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| member_number | string unik | `A-000123`, tidak dipakai ulang (hanya soft delete) |
| name | string | |
| phone, address | string null | |
| joined_at | date | |
| status | enum | `active`, `exited` |
| exited_at | date null | |
| qr_token | string unik | isi QR kartu anggota (token acak) |
| timestamps, deleted_at | | |

**Tarif simpanan** (keputusan Q3): tidak ada tabel `savings_rates`. Besaran simpanan pokok dan wajib ada di berkas `config/koperasi.php` (dibuat di Tahap 4).

**`savings_ledger`** (ledger simpanan)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| number | string unik | `SP-20261121-0001` |
| member_id | FK | |
| savings_type | enum | `pokok`, `wajib`, `sukarela` |
| entry_type | enum | `deposit`, `withdrawal`, `reversal` |
| amount | rupiah ≠ 0, bertanda | `+` setor, `−` tarik |
| balance_after | rupiah ≥ 0 | saldo anggota untuk jenis ini |
| period | date null | bulan wajib yang dibayar (tanggal 1) |
| reverses_entry_id | FK null, unik | |
| note | string null | wajib untuk `reversal` |
| occurred_at | datetime | |
| created_by, created_at | | |

Constraint: `CHECK (amount <> 0)`, `CHECK (balance_after >= 0)`. Indeks `(member_id, savings_type, id)`.

### 3.5 Umum

**`activity_logs`**: tabel sendiri, append-only.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| user_id | FK null | |
| action | string | `product.price_changed`, `sale.voided`, ... |
| subject_type, subject_id | morph | |
| properties | json | nilai lama dan baru |
| created_at | | |

Dicatat untuk: perubahan harga, buka dan tutup shift, pembatalan, koreksi stok, pembalikan simpanan, anggota keluar.

Nomor dokumen (`INV-`, `BM-`, `SP-`, `A-`) dibuat dari nomor urut terakhir hari itu di dalam transaksi yang sama. Tidak ada tabel penomoran terpisah.

---

## 4. Aturan stok

| # | Aturan |
| --- | --- |
| S1 | Stok produk = `balance_after` baris terakhir = Σ `qty`. |
| S2 | `AdjustStock` dalam satu transaksi: baca saldo terakhir, hitung `balance_after`, insert. |
| S3 | `qty` selalu dalam satuan dasar. |
| S4 | Mutasi apa pun yang membuat saldo minus ditolak (keputusan Q2): koreksi, penjualan, dan pembalikan. Dengan begitu penjualan dengan stok kurang otomatis ditolak. |
| S5 | Baris pembalik: `qty` = −`qty` asal, `reverses_movement_id` unik. `sale_void` hanya membalik `sale`. |
| S6 | Peringatan stok minimum bila saldo ≤ `min_stock` (tampilan saja). |
| S7 | Baris pembalik tidak bisa dibalik lagi. Mutasi `sale` dibalik dengan `sale_void`; mutasi lain dibalik dengan `adjustment` (alasan wajib). |
| S8 | `opening` hanya untuk produk yang belum punya mutasi. `receipt` wajib punya dokumen `stock_entries`. |

## 5. Aturan simpanan

| # | Aturan |
| --- | --- |
| T1 | Saldo per anggota per jenis = `balance_after` baris terakhir = Σ `amount`. |
| T2 | `PostSaving` menolak mutasi yang membuat saldo < 0. |
| T3 | **Pokok**: disetor sekali sebesar tarif. Tidak bisa ditarik selama anggota aktif. |
| T4 | **Wajib**: setoran mengisi `period`, satu bulan sekali (baris yang sudah dibalik tidak dihitung). Ditarik hanya saat keluar. |
| T5 | **Sukarela**: setor dan tarik kapan saja selama saldo tidak minus. |
| T6 | **Keluar anggota** (`ExitMember`): satu transaksi, tarik semua saldo lalu status `exited`. Setelah itu tidak ada mutasi baru kecuali pembalikan. |
| T7 | Pembalikan: `amount` = −`amount` asal, `reverses_entry_id` unik, alasan wajib. |
| T8 | Hanya `bendahara` (dan `admin`) yang mencatat simpanan. |

## 6. Aturan kasir dan uang

| # | Aturan |
| --- | --- |
| K1 | Penjualan butuh shift aktif milik kasir itu. |
| K2 | Server menghitung ulang harga dari `product_units.sell_price`. Harga dari browser diabaikan. |
| K3 | `CompleteSale`, satu transaksi: kunci baris shift, insert `sales`, `sale_items`, `payments`, panggil `AdjustStock(sale)` per baris. Stok kurang menolak seluruh penjualan (rollback penuh). Uang diterima harus ≥ total; `payments.amount` = total dan `change` = diterima − total. Baris dengan satuan sama digabung; total harus > 0. `SaleCompleted` dipancarkan setelah commit. |
| K4 | **Ditunda** (diskon tidak dibuat di Tahap 3). |
| K5 | `VoidSale`: hanya selama shift masih aktif, oleh `admin`, alasan wajib. Insert `sale_voids`, lalu `AdjustStock(sale_void)` untuk setiap baris. Penjualan dari shift yang sudah tutup tidak bisa dibatalkan. |
| K6 | `expected_cash` = `opening_cash` + Σ `amount` pembayaran tunai dari penjualan yang tidak dibatalkan di shift itu (`amount`, bukan uang diterima: kembalian tidak masuk laci). Dibekukan saat tutup. `difference` = hitungan fisik − `expected_cash`; catatan wajib bila ≠ 0. Hanya pemilik shift yang bisa menutup. |
| K7 | Peristiwa untuk diorama: `SaleCompleted` dan `SaleVoided` dipancarkan dari Action setelah commit. `SaleOpened` dan `ItemScanned` terjadi di browser sebelum ada data, jadi dikirim lewat `POST /kasir/peristiwa` (fire-and-forget, tanpa database) yang hanya memancarkan event Laravel itu. Kasir yang bersangkutan menggerakkan diorama langsung dari pemancar di browser (`resources/js/lib/store-events.ts`). Reverb menyusul di Tahap 8. |

## 7. Tes Pest wajib

**Tahap 2 (stok)**: sudah ditulis, di `tests/Feature/Inventory/`.

- Saldo = Σ `qty` = `balance_after` terakhir setelah campuran masuk, keluar, koreksi; rantai `balance_after` konsisten baris ke baris.
- Menerima 2 dus (isi 24 atau 40) menambah satuan dasar sesuai isi.
- Barcode dus terbaca sebagai satuan dus; barcode ganda ditolak.
- Model ledger menolak `update` dan `delete` lewat Eloquent. **Hanya itu yang diuji**; query langsung tidak dijaga dan tidak diuji (tanpa trigger).
- Mutasi yang membuat saldo minus ditolak untuk semua jenis.
- Baris yang sama tidak bisa dibalik dua kali; baris pembalik tidak bisa dibalik lagi; unique database ikut diuji.
- `conversion` satuan yang sudah dipakai tidak bisa diubah; satuan terpakai tidak bisa dihapus; satuan dasar tidak bisa diganti setelah ada mutasi.
- `CHECK (qty <> 0)` di database.
- Penerimaan barang: dokumen bernomor urut, mutasi cocok, gagal seluruhnya bila satu baris bermasalah.
- Perubahan harga dan isi satuan tercatat di `activity_logs`.
- Hanya admin yang bisa membuka dan menulis halaman inventaris.
- Zona waktu: input WIB disimpan UTC dan tampil kembali WIB.

**Tahap 3 (kasir)**: sudah ditulis, di `tests/Feature/Pos/` (82 tes pada hasil Pest, 4 berkas). Daftar rencana awal:

- Penjualan mengurangi stok sesuai `base_qty`.
- Harga dari browser diabaikan.
- Pembatalan mengembalikan stok dan tidak bisa dua kali.
- Pembatalan setelah shift tutup ditolak.
- `expected_cash` dan `difference` benar, termasuk dengan pembatalan.
- Kasir tidak bisa membuka dua shift aktif.
- Kasir tidak bisa membatalkan penjualan.
- Tambahan yang sudah ada: stok kurang menolak seluruh penjualan tanpa sisa data; gagal di baris kedua membatalkan baris pertama; satuan dus dan konversi; salinan nama dan harga bertahan; nomor INV berurutan; kembalian tidak masuk `expected_cash`; hak akses kasir, admin, bendahara, dan tamu; kasir tidak bisa melihat struk kasir lain; pencarian barcode dan nama; relai peristiwa; `ProductUnit::isInUse()` memeriksa `sale_items`.
- Seperti ledger stok, perlindungan `sales`, `sale_items`, `payments`, `sale_voids`, dan shift tertutup hanya di model; hanya itu yang diuji, bukan query langsung.

**Tahap 4 (simpanan)**

- Saldo per jenis = Σ `amount`.
- Penarikan sukarela melebihi saldo ditolak.
- Penarikan pokok atau wajib saat aktif ditolak.
- Setoran wajib bulan yang sama dua kali ditolak; setelah dibalik boleh lagi.
- Keluar anggota mengosongkan saldo dan menutup mutasi berikutnya.
- Nomor anggota tidak dipakai ulang.
- Kasir tidak bisa mencatat simpanan.

## 8. Bonus Tahap 7 (sketsa, belum dibuat)

| Tabel | Catatan |
| --- | --- |
| `loans`, `loan_installments` | pinjaman sederhana; anggota tidak bisa keluar bila masih punya pinjaman |
| `shu_periods`, `shu_allocations` | SHU dari jasa modal (saldo simpanan) dan jasa usaha (`sales.member_id`) |

## 9. Keputusan skema

| Kode | Pertanyaan | Keputusan |
| --- | --- | --- |
| Q1 | Barcode di tabel terpisah atau satu kolom? | Satu kolom `barcode` unik di `product_units`. Tabel `product_barcodes` tidak dibuat. |
| Q2 | Stok sistem kurang: tolak atau tetap jalan? | Tolak. Ditegakkan di `AdjustStock` untuk semua jenis mutasi. |
| Q3 | Tarif pokok dan wajib di tabel atau config? | Berkas `config/koperasi.php`. Tabel `savings_rates` tidak dibuat. |
| Q4 | `stock_entries` dan `sale_voids`? | Disetujui. `stock_entries` hanya catatan penerimaan barang tanpa saldo; `opening` dan `adjustment` tanpa dokumen kepala. |
| Q5 | `activity_logs` kapan dibuat? | Di Tahap 2, karena perubahan harga, konversi, penerimaan, dan koreksi stok wajib tercatat. |

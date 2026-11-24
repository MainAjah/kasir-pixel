# REST API Kasir Koperasi

REST API untuk perhitungan total, checkout, dan mutasi stok. Layar kasir di aplikasi juga memakai API ini saat menekan **Proses Pembayaran**.

- **Alamat dasar:** `http://localhost:8000/api/v1`
- **Format:** JSON. Kirim header `Accept: application/json` dan, untuk POST, `Content-Type: application/json`.
- **Uang:** bilangan bulat rupiah, tanpa desimal.
- **Stok:** satuan dasar (misalnya botol, bungkus). Satu dus berisi 24 berarti 24 satuan dasar.
- **Kode:** `routes/api.php` dan `app/Http/Controllers/Api/`. Tesnya ada di `tests/Feature/Api/`.

## Autentikasi

Ada dua cara masuk. Keduanya memakai akun dan hak akses yang sama dengan aplikasi.

| Klien | Cara | Keterangan |
| --- | --- | --- |
| Postman, curl, aplikasi lain | **Token Bearer** (Laravel Sanctum) | Ambil token lewat `POST /token`, lalu kirim `Authorization: Bearer <token>` di setiap permintaan. |
| Layar kasir di browser | **Cookie sesi** (Sanctum stateful) | Kasir yang sudah login langsung memanggil API dengan cookie sesinya dan header `X-XSRF-TOKEN`. Tidak perlu token. |

### Ambil token

```http
POST /api/v1/token
```

```json
{ "email": "kasir@kasir.test", "password": "password", "device_name": "postman" }
```

Jawaban `201`:

```json
{
  "token": "3|Xk9...",
  "token_type": "Bearer",
  "user": { "id": 2, "name": "Kasir Satu", "email": "kasir@kasir.test", "role": "kasir", "role_label": "Kasir" }
}
```

- **Sandi salah atau email tidak dikenal:** `422` ("Email atau kata sandi salah.").
- **Akun nonaktif:** `422` ("Akun Anda dinonaktifkan."). Token milik akun yang kemudian dinonaktifkan ditolak `403`.
- **Batas percobaan:** paling banyak 10 kali per menit.

### Cabut token

```http
DELETE /api/v1/token
```

Jawaban `200` `{"message": "Token dicabut."}`. Setelah itu token tidak berlaku lagi (`401`).

## Daftar endpoint

| Metode | Jalur | Peran | Gunanya |
| --- | --- | --- | --- |
| `POST` | `/token` | siapa saja | Ambil token |
| `DELETE` | `/token` | login | Cabut token |
| `GET` | `/produk` | kasir, admin | Database inventaris: produk aktif, stok, satuan, harga |
| `GET` | `/produk/{id}` | kasir, admin | Satu produk |
| `POST` | `/keranjang/hitung` | kasir, admin | **Perhitungan total** keranjang tanpa menyimpan |
| `POST` | `/penjualan` | kasir, admin | **Checkout all-or-nothing** |
| `GET` | `/penjualan/{id}` | kasir (notanya sendiri), admin | Detail nota |
| `GET` | `/produk/{id}/mutasi` | admin | **Mutasi stok** (kartu stok) |

Bendahara tidak punya akses ke endpoint kasir dan stok (`403`), sama seperti di aplikasi.

## Produk

```http
GET /api/v1/produk
```

```json
{
  "data": [
    {
      "id": 14,
      "sku": "DM-101",
      "name": "Air mineral 600 ml",
      "category": "Minuman",
      "stock": 59,
      "min_stock": 10,
      "image_url": "/storage/produk/abc.png",
      "units": [
        {
          "product_unit_id": 31,
          "product_id": 14,
          "unit_name": "botol",
          "conversion": 1,
          "price": 3500,
          "barcode": "8990000000101",
          "stock_base": 59,
          "stock_units": 59
        },
        {
          "product_unit_id": 32,
          "product_id": 14,
          "unit_name": "dus",
          "conversion": 24,
          "price": 80000,
          "barcode": "8990000000118",
          "stock_base": 59,
          "stock_units": 2
        }
      ]
    }
  ]
}
```

- **Isi daftar:** hanya produk aktif.
- **Stok:** dibaca dari ledger `stock_movements`, yaitu `balance_after` mutasi terakhir.
- **Keranjang:** `product_unit_id` adalah yang dikirim saat menghitung dan checkout.
- **Satu produk:** `GET /produk/{id}` memberi bentuk yang sama di `data`. Produk nonaktif menjawab `404`.

## Hitung total

```http
POST /api/v1/keranjang/hitung
```

```json
{
  "items": [
    { "product_unit_id": 31, "qty": 2 },
    { "product_unit_id": 40, "qty": 1 }
  ]
}
```

Jawaban `200`:

```json
{
  "data": {
    "items": [
      {
        "product_unit_id": 31, "product_id": 14, "product_name": "Air mineral 600 ml", "unit_name": "botol",
        "qty": 2, "base_qty": 2, "unit_price": 3500, "line_total": 7000,
        "stock_available": 59, "stock_enough": true
      },
      {
        "product_unit_id": 40, "product_id": 17, "product_name": "Cokelat batang", "unit_name": "batang",
        "qty": 1, "base_qty": 1, "unit_price": 12000, "line_total": 12000,
        "stock_available": 0, "stock_enough": false
      }
    ],
    "total": 19000,
    "all_stock_enough": false
  }
}
```

- **Tidak menyimpan apa pun** dan tidak butuh shift kasir.
- **Harga selalu dari database.** Kolom harga yang dikirim klien diabaikan.
- **Baris satuan sama** digabung. Bila satu produk muncul dalam dua satuan (pcs dan dus), kebutuhan stoknya dijumlah.
- **Info stok hanya peringatan.** Stok bisa berubah sebelum bayar; yang memutuskan adalah checkout.

## Checkout (all-or-nothing)

```http
POST /api/v1/penjualan
```

```json
{
  "items": [
    { "product_unit_id": 31, "qty": 1 },
    { "product_unit_id": 35, "qty": 1 }
  ],
  "tendered": 20000,
  "member_id": null
}
```

Jawaban `201`:

```json
{
  "data": {
    "id": 4,
    "number": "INV-20261124-0001",
    "created_at": "2026-11-24 15:54:10",
    "cashier": "Kasir Satu",
    "total": 12000,
    "tendered": 20000,
    "change": 8000,
    "method": "cash",
    "is_voided": false,
    "items": [
      { "product_id": 14, "product_unit_id": 31, "name": "Air mineral 600 ml", "unit": "botol", "qty": 1, "unit_price": 3500, "line_total": 3500 },
      { "product_id": 16, "product_unit_id": 35, "name": "Keripik singkong", "unit": "bungkus", "qty": 1, "unit_price": 8500, "line_total": 8500 }
    ],
    "receipt_url": "http://localhost:8000/kasir/penjualan/4/struk"
  }
}
```

**Cara kerjanya** (`App\Actions\Pos\CompleteSale`), semuanya dalam **satu transaksi database**:

1. Kunci shift kasir yang terbuka.
2. **Kunci semua produk di keranjang sekaligus, menurut urutan id** (anti-deadlock).
3. Hitung harga dari database (`PriceCart`, sama dengan endpoint hitung).
4. Tulis nota, lalu per barang: baris nota dan mutasi stok keluar (`AdjustStock`, saldo tidak boleh minus).
5. Tulis pembayaran.
6. Bila **satu saja** langkah gagal, seluruh transaksi di-**rollback**: tidak ada nota, baris, pembayaran, atau mutasi stok yang tersisa.

**Jawaban gagal:**

| Kode | Kapan | Isi |
| --- | --- | --- |
| `409 Conflict` | Stok salah satu barang tidak cukup | `message`, `rolled_back: true`, `failed_item` |
| `422` | Belum buka shift, uang kurang, barang nonaktif atau tidak dikenal, keranjang kosong, isian tidak valid | `message`, plus `errors` untuk galat validasi |
| `401` | Tanpa token atau sesi | `{"message": "Unauthenticated."}` |
| `403` | Peran tidak berhak, atau akun nonaktif | `message` |
| `429` | Lebih dari 60 checkout per menit | `message` |

Contoh `409`:

```json
{
  "message": "Stok Cokelat batang tidak cukup: tersedia 0, diminta 1 (satuan dasar).",
  "rolled_back": true,
  "failed_item": { "product_id": 17, "product_name": "Cokelat batang", "available": 0, "requested": 1 }
}
```

## Detail nota

```http
GET /api/v1/penjualan/{id}
```

Bentuknya sama dengan `data` pada checkout. Kasir hanya bisa membuka notanya sendiri (selain itu `403`); admin bisa membuka semua.

## Mutasi stok (admin)

```http
GET /api/v1/produk/{id}/mutasi?page=1
```

```json
{
  "product": { "id": 14, "sku": "DM-101", "name": "Air mineral 600 ml", "stock": 59 },
  "movements": {
    "current_page": 1,
    "data": [
      {
        "id": 120, "occurred_at": "2026-11-24 15:54:10", "type": "sale", "type_label": "Penjualan",
        "qty": -1, "input_qty": -1, "input_unit": "botol", "balance_after": 59,
        "document": "INV-20261124-0001", "note": null, "by": "Kasir Satu",
        "is_reversal": false, "is_reversed": false
      }
    ],
    "per_page": 25,
    "total": 3
  }
}
```

- **Isi:** sama dengan kartu stok di aplikasi. Ledger hanya-tambah, terbaru di atas.
- **`balance_after`:** saldo setelah baris itu.
- **Jenis mutasi:** `opening`, `receipt`, `sale`, `sale_void`, `adjustment`.

## Demo "30% Hard Problem" dengan Postman

Skenario soal: kasir checkout beberapa barang; di tengah proses, barang ke-4 ternyata habis karena dibeli lewat jalur lain. Seluruh keranjang harus di-rollback.

1. **Token kasir:** `POST /token` dengan `kasir@kasir.test` / `password`. Simpan `token` di variabel Postman, lalu pasang di tab **Authorization → Bearer Token**.
2. **Lihat stok:** `GET /produk`, lalu catat `product_unit_id` keempat produk dan stoknya.
3. **Hitung keranjang:** `POST /keranjang/hitung` berisi 4 barang dengan barang ke-4 **Cokelat batang** (stok demo 0). Hasilnya `stock_enough: false` untuk Cokelat.

   Untuk meniru "dibeli lewat jalur lain" persis seperti soal: hitung keranjang saat semua stok masih cukup, lalu habiskan stok barang ke-4 dari jendela lain (admin → Penyesuaian stok, atau kasir lain menjualnya), baru lanjut ke langkah 4.
4. **Checkout:** `POST /penjualan` dengan keranjang yang sama dan `tendered` cukup. Jawabannya **409** dengan `rolled_back: true` dan `failed_item` = barang ke-4.
5. **Bukti rollback:** `GET /produk` lagi. Stok barang 1–3 **tidak berubah**, padahal di dalam transaksi barang-barang itu sempat diproses sebelum barang ke-4 gagal. `GET /produk/{id}/mutasi` (token admin) juga tidak menunjukkan mutasi baru.

Contoh dengan curl (Git Bash):

```bash
B=http://localhost:8000/api/v1
TOKEN=$(curl -s -X POST $B/token -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"email":"kasir@kasir.test","password":"password","device_name":"curl"}' | python -c "import json,sys;print(json.load(sys.stdin)['token'])")

curl -s $B/produk -H "Accept: application/json" -H "Authorization: Bearer $TOKEN"

curl -s -X POST $B/penjualan -H "Accept: application/json" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"items":[{"product_unit_id":31,"qty":1},{"product_unit_id":33,"qty":1},{"product_unit_id":35,"qty":1},{"product_unit_id":40,"qty":1}],"tendered":100000}'
```

Ganti `product_unit_id` dengan nilai dari `GET /produk` di database Anda.

## Tes otomatis

```bash
php artisan test tests/Feature/Api
```

- **Isi tes:**
  - token (benar, salah, nonaktif, dicabut);
  - akses 401/403 per peran;
  - produk, hitung total, checkout, dan mutasi;
  - **skenario soal persis:** 5 barang, barang ke-4 habis dibeli kasir lain di antara hitung dan bayar → `409`, tanpa sisa nota, baris, pembayaran, atau mutasi, dan stok kelima barang tidak berubah.
- **Yang tidak dites:** deadlock sungguhan (dua koneksi bersamaan) tidak bisa diuji dengan tes Pest satu koneksi. Pencegahannya dijelaskan di [desain.md](desain.md).

<?php

namespace App\Actions\Pos;

use App\Actions\Inventory\AdjustStock;
use App\Enums\PaymentMethod;
use App\Enums\StockMovementType;
use App\Events\SaleCompleted;
use App\Exceptions\PosException;
use App\Models\CashShift;
use App\Models\Member;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Selesaikan penjualan tunai dalam satu transaksi database (docs/skema.md K1-K3).
 *
 * Browser hanya mengirim satuan dan jumlah; harga selalu dibaca dari server (PriceCart).
 * Stok kurang (StockException dari AdjustStock) membatalkan seluruh penjualan:
 * all-or-nothing, tidak ada nota, baris, pembayaran, atau mutasi yang tersisa.
 *
 * Tahap 10: semua produk di keranjang dikunci sekaligus menurut urutan id sebelum
 * apa pun ditulis, supaya dua checkout bersamaan dengan urutan barang berbeda tidak
 * saling mengunci (deadlock). Bila database tetap melaporkan deadlock, transaksi
 * diulang (paling banyak 3 kali); percobaan yang gagal sudah di-rollback seluruhnya.
 */
class CompleteSale
{
    /** Berapa kali transaksi dicoba bila database melaporkan deadlock. */
    private const ATTEMPTS = 3;

    public function __construct(
        private AdjustStock $adjustStock,
        private PriceCart $priceCart,
    ) {}

    /**
     * @param  array<int, array{product_unit_id: int|string, qty: int|string}>  $items
     */
    public function handle(User $cashier, array $items, int $tendered, ?int $memberId = null): Sale
    {
        $lines = $this->priceCart->lines($items);

        return DB::transaction(function () use ($cashier, $lines, $tendered, $memberId) {
            // Kunci baris shift: tidak bisa bersamaan dengan penutupan shift.
            $shift = CashShift::where('user_id', $cashier->id)->whereNull('closed_at')->lockForUpdate()->first();

            if ($shift === null) {
                throw PosException::invalid('Buka shift dulu sebelum menjual.');
            }

            // Anggota hanya penanda dan opsional; harus ada dan masih aktif.
            if ($memberId !== null) {
                $member = Member::whereKey($memberId)->sharedLock()->first();

                if ($member === null || ! $member->isActive()) {
                    throw PosException::invalid('Anggota tidak ditemukan atau sudah keluar.');
                }
            }

            $this->lockProducts(array_keys($lines));

            ['lines' => $prepared, 'total' => $total] = $this->priceCart->price($lines);

            if ($tendered < $total) {
                throw PosException::invalid('Uang diterima kurang dari total belanja.');
            }

            $sale = Sale::create([
                'number' => $this->nextNumber(),
                'cash_shift_id' => $shift->id,
                'member_id' => $memberId,
                'total' => $total,
                'created_by' => $cashier->id,
            ]);

            $eventItems = [];

            foreach ($prepared as $p) {
                $item = $sale->items()->create([
                    'product_id' => $p['product']->id,
                    'product_unit_id' => $p['unit']->id,
                    'product_name' => $p['product']->name,
                    'unit_name' => $p['unit']->name,
                    'conversion' => $p['unit']->conversion,
                    'qty' => $p['qty'],
                    'base_qty' => $p['qty'] * $p['unit']->conversion,
                    'unit_price' => $p['unit']->sell_price,
                    'line_total' => $p['lineTotal'],
                ]);

                $this->adjustStock->handle(
                    $p['product'],
                    StockMovementType::Sale,
                    $p['unit'],
                    -$p['qty'],
                    $cashier->id,
                    saleItemId: $item->id,
                );

                $eventItems[] = ['name' => $item->product_name, 'unit' => $item->unit_name, 'qty' => $item->qty];
            }

            $sale->payments()->create([
                'method' => PaymentMethod::Cash,
                'amount' => $total,
                'tendered' => $tendered,
                'change' => $tendered - $total,
            ]);

            SaleCompleted::dispatch($sale->id, $sale->number, $total, $eventItems, $cashier->id, $cashier->name);

            return $sale->load(['items', 'payments']);
        }, self::ATTEMPTS);
    }

    /**
     * Kunci semua produk keranjang sekaligus, selalu menurut urutan id. Setiap checkout
     * meminta kunci dalam urutan yang sama, jadi tidak ada dua transaksi yang saling
     * menunggu kunci milik yang lain. AdjustStock mengunci ulang produk yang sama di
     * transaksi ini; kunci itu sudah dipegang sehingga tidak menunggu.
     *
     * @param  list<int>  $unitIds
     */
    private function lockProducts(array $unitIds): void
    {
        $productIds = ProductUnit::whereIn('id', $unitIds)->pluck('product_id')->unique()->sort()->values();

        Product::whereIn('id', $productIds)->orderBy('id')->lockForUpdate()->get(['id']);
    }

    /** Nomor INV-yyyymmdd-nnnn: urut per hari (tanggal WIB), dihitung di dalam transaksi. */
    private function nextNumber(): string
    {
        $prefix = 'INV-'.now()->timezone(config('app.display_timezone'))->format('Ymd').'-';

        $last = Sale::where('number', 'like', $prefix.'%')
            ->orderByDesc('number')
            ->lockForUpdate()
            ->value('number');

        $next = $last === null ? 1 : ((int) substr($last, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}

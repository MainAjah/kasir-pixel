<?php

namespace App\Actions\Pos;

use App\Exceptions\PosException;
use App\Models\CashShift;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;

/**
 * "Simulasi pesanan" untuk demo (Tahap 6): satu penjualan tunai acak lewat CompleteSale,
 * atas nama kasir contoh (kasir@kasir.test) dengan shift demo-nya.
 *
 * Tidak menulis ledger sendiri dan tidak pernah memaksa stok minus: hanya produk aktif
 * yang stoknya ada yang dipilih, jumlah dan satuan dibatasi sisa stok (dalam satuan dasar),
 * dan CompleteSale tetap menolak bila saldo kurang.
 */
class SimulateSale
{
    public const DEMO_CASHIER_EMAIL = 'kasir@kasir.test';

    public const OPENING_CASH = 200000;

    /** Paling banyak jenis barang dan jumlah per baris dalam satu pesanan. */
    private const MAX_LINES = 3;

    private const MAX_QTY = 3;

    public function __construct(
        private CompleteSale $completeSale,
        private OpenShift $openShift,
    ) {}

    public function handle(): Sale
    {
        $cashier = User::where('email', self::DEMO_CASHIER_EMAIL)->first();

        if ($cashier === null) {
            throw PosException::invalid('Kasir contoh (kasir@kasir.test) belum ada. Jalankan seeder data contoh dulu.');
        }

        $candidates = Product::query()
            ->withStock()
            ->with('units')
            ->where('is_active', true)
            ->get()
            ->filter(fn (Product $p) => ($p->stock ?? 0) > 0)
            ->shuffle();

        if ($candidates->isEmpty()) {
            throw PosException::invalid('Tidak ada produk yang punya stok untuk disimulasikan.');
        }

        $items = [];

        foreach ($candidates->take(random_int(1, self::MAX_LINES)) as $product) {
            // Hanya satuan yang isinya muat di sisa stok, supaya stok tidak pernah minus.
            $units = $product->units->filter(fn ($u) => $u->conversion <= $product->stock && $u->sell_price > 0);

            if ($units->isEmpty()) {
                continue;
            }

            // Satuan dasar paling sering; satuan besar (dus) sesekali bila muat.
            $unit = $units->count() > 1 && random_int(1, 5) === 1 ? $units->random() : ($units->firstWhere('is_base', true) ?? $units->first());
            $max = min(self::MAX_QTY, intdiv($product->stock, $unit->conversion));

            $items[] = ['product_unit_id' => $unit->id, 'qty' => random_int(1, $max), 'price' => $unit->sell_price];
        }

        if ($items === []) {
            throw PosException::invalid('Tidak ada barang berharga dengan stok cukup untuk disimulasikan.');
        }

        $total = array_sum(array_map(fn ($i) => $i['price'] * $i['qty'], $items));

        if (CashShift::activeFor($cashier) === null) {
            $this->openShift->handle($cashier, self::OPENING_CASH);
        }

        return $this->completeSale->handle(
            $cashier,
            array_map(fn ($i) => ['product_unit_id' => $i['product_unit_id'], 'qty' => $i['qty']], $items),
            (int) (ceil($total / 10000) * 10000),
        );
    }
}

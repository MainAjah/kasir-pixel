<?php

namespace App\Actions\Pos;

use App\Exceptions\PosException;
use App\Models\Product;
use App\Models\ProductUnit;

/**
 * Hitung keranjang dari harga server (docs/skema.md K2). Tidak menulis apa pun.
 *
 * Dipakai CompleteSale (di dalam transaksinya) dan endpoint REST "hitung total",
 * sehingga angka yang dihitung dan yang dibayar pasti sama.
 */
class PriceCart
{
    /**
     * Hitung keranjang mentah dari browser atau klien API.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array{lines: list<array{unit: ProductUnit, product: Product, qty: int, lineTotal: int}>, total: int}
     */
    public function handle(array $items): array
    {
        return $this->price($this->lines($items));
    }

    /**
     * Gabungkan baris dengan satuan sama dan pastikan jumlahnya bilangan bulat positif.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, int> product_unit_id => qty
     */
    public function lines(array $items): array
    {
        if ($items === []) {
            throw PosException::invalid('Keranjang kosong.');
        }

        $lines = [];

        foreach ($items as $row) {
            $unitId = filter_var($row['product_unit_id'] ?? null, FILTER_VALIDATE_INT);
            $qty = filter_var($row['qty'] ?? null, FILTER_VALIDATE_INT);

            if ($unitId === false || $qty === false || $qty < 1) {
                throw PosException::invalid('Jumlah barang harus bilangan bulat minimal 1.');
            }

            $lines[$unitId] = ($lines[$unitId] ?? 0) + $qty;
        }

        return $lines;
    }

    /**
     * Harga per baris dari sell_price satuan di database; urutan baris mengikuti keranjang.
     *
     * @param  array<int, int>  $lines  product_unit_id => qty (hasil lines())
     * @return array{lines: list<array{unit: ProductUnit, product: Product, qty: int, lineTotal: int}>, total: int}
     */
    public function price(array $lines): array
    {
        $units = ProductUnit::with('product')->whereIn('id', array_keys($lines))->get()->keyBy('id');

        $total = 0;
        $prepared = [];

        foreach ($lines as $unitId => $qty) {
            $unit = $units->get($unitId);
            $product = $unit?->product;

            if ($unit === null || $product === null) {
                throw PosException::invalid('Ada barang yang tidak ditemukan atau sudah dihapus.');
            }
            if (! $product->is_active) {
                throw PosException::invalid("Produk {$product->name} sedang nonaktif.");
            }

            $lineTotal = $qty * $unit->sell_price;
            $total += $lineTotal;
            $prepared[] = compact('unit', 'product', 'qty', 'lineTotal');
        }

        if ($total <= 0) {
            throw PosException::invalid('Total penjualan harus lebih dari nol.');
        }

        return ['lines' => $prepared, 'total' => $total];
    }
}

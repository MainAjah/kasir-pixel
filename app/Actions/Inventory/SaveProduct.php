<?php

namespace App\Actions\Inventory;

use App\Actions\Activity\LogActivity;
use App\Models\Product;
use App\Models\ProductUnit;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Simpan produk beserta satuannya (membuat atau memperbarui).
 *
 * Aturan satuan (docs/skema.md 3.2):
 *  - tepat satu satuan dasar, isi (conversion) = 1;
 *  - conversion tidak boleh diubah setelah satuan dipakai di mutasi;
 *  - satuan yang sudah dipakai tidak boleh dihapus;
 *  - satuan dasar tidak boleh diganti setelah produk punya mutasi (saldo tersimpan dalam satuan dasar);
 *  - satuan yang dihapus (belum terpakai) melepas barcode dan namanya agar bisa dipakai lagi.
 */
class SaveProduct
{
    public function __construct(private LogActivity $logActivity) {}

    /**
     * @param  array{sku: string, name: string, category_id?: int|null, min_stock?: int, is_active?: bool, units: array<int, array{id?: int|null, name: string, conversion: int, sell_price: int, barcode?: string|null, is_base?: bool}>}  $data
     */
    public function handle(?Product $product, array $data, int $userId): Product
    {
        $units = $this->normalizeUnits($data['units'] ?? []);

        return DB::transaction(function () use ($product, $data, $units, $userId) {
            $isNew = $product === null;

            if ($isNew) {
                $product = Product::create($this->productAttributes($data));
                $this->logActivity->handle('product.created', $product, ['sku' => $product->sku, 'name' => $product->name], $userId);
            } else {
                $product = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();
                $product->fill($this->productAttributes($data));
                $changes = $product->getDirty();

                if ($changes !== []) {
                    $product->save();
                    $this->logActivity->handle('product.updated', $product, $changes, $userId);
                }
            }

            $this->syncUnits($product, $units, $isNew, $userId);

            return $product->load('units');
        });
    }

    /** @return array<string, mixed> */
    private function productAttributes(array $data): array
    {
        return [
            'sku' => trim($data['sku']),
            'name' => trim($data['name']),
            'category_id' => $data['category_id'] ?? null,
            'min_stock' => $data['min_stock'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $units
     * @return array<int, array{id: int|null, name: string, conversion: int, sell_price: int, barcode: string|null, is_base: bool}>
     */
    private function normalizeUnits(array $units): array
    {
        if ($units === []) {
            $this->fail('units', 'Produk harus punya minimal satu satuan.');
        }

        $out = [];
        $names = [];
        $barcodes = [];
        $baseCount = 0;

        foreach (array_values($units) as $i => $u) {
            $name = trim((string) ($u['name'] ?? ''));
            $barcode = trim((string) ($u['barcode'] ?? '')) ?: null;
            $conversion = (int) ($u['conversion'] ?? 0);
            $isBase = (bool) ($u['is_base'] ?? false);

            if ($name === '') {
                $this->fail("units.$i.name", 'Nama satuan wajib diisi.');
            }
            if (in_array(mb_strtolower($name), $names, true)) {
                $this->fail("units.$i.name", "Nama satuan \"$name\" dipakai dua kali.");
            }
            if ($conversion < 1) {
                $this->fail("units.$i.conversion", 'Isi satuan minimal 1.');
            }
            if ((int) ($u['sell_price'] ?? -1) < 0) {
                $this->fail("units.$i.sell_price", 'Harga jual tidak boleh negatif.');
            }
            if ($barcode !== null && in_array($barcode, $barcodes, true)) {
                $this->fail("units.$i.barcode", 'Barcode dipakai dua kali di produk ini.');
            }
            if ($isBase) {
                $baseCount++;
                if ($conversion !== 1) {
                    $this->fail("units.$i.conversion", 'Satuan dasar harus berisi 1.');
                }
            }

            $names[] = mb_strtolower($name);
            if ($barcode !== null) {
                $barcodes[] = $barcode;
            }

            $out[] = [
                'id' => isset($u['id']) ? (int) $u['id'] : null,
                'name' => $name,
                'conversion' => $conversion,
                'sell_price' => (int) $u['sell_price'],
                'barcode' => $barcode,
                'is_base' => $isBase,
            ];
        }

        if ($baseCount !== 1) {
            $this->fail('units', 'Harus ada tepat satu satuan dasar.');
        }

        return $out;
    }

    /**
     * @param  array<int, array{id: int|null, name: string, conversion: int, sell_price: int, barcode: string|null, is_base: bool}>  $units
     */
    private function syncUnits(Product $product, array $units, bool $isNew, int $userId): void
    {
        $existing = $isNew ? collect() : $product->units()->get()->keyBy('id');
        $payloadIds = collect($units)->pluck('id')->filter()->all();

        foreach ($payloadIds as $id) {
            if (! $existing->has($id)) {
                $this->fail('units', 'Satuan tidak ditemukan pada produk ini.');
            }
        }

        $hasMovements = ! $isNew && $product->hasMovements();

        if ($hasMovements) {
            $currentBase = $existing->firstWhere('is_base', true);
            $newBase = collect($units)->firstWhere('is_base', true);
            if ($currentBase && $currentBase->id !== $newBase['id']) {
                $this->fail('units', 'Satuan dasar tidak bisa diganti setelah produk punya mutasi stok.');
            }
        }

        // 1. Hapus satuan yang dihilangkan (hanya bila belum terpakai).
        foreach ($existing->except($payloadIds) as $unit) {
            if ($unit->is_base && $hasMovements) {
                $this->fail('units', 'Satuan dasar tidak bisa dihapus setelah produk punya mutasi stok.');
            }
            if ($unit->isInUse()) {
                $this->fail('units', "Satuan \"{$unit->name}\" sudah dipakai dan tidak bisa dihapus.");
            }
            $unit->forceFill(['barcode' => null, 'name' => $unit->name.'~'.$unit->id])->save();
            $unit->delete();
        }

        // 2. Kosongkan barcode satuan yang barcodenya berubah, agar tukar barcode antar satuan tidak bentrok.
        foreach ($units as $u) {
            $current = $u['id'] ? $existing->get($u['id']) : null;
            if ($current && $current->barcode !== $u['barcode'] && $current->barcode !== null) {
                $current->forceFill(['barcode' => null])->save();
            }
        }

        // 3. Cek barcode terhadap satuan produk lain.
        foreach ($units as $i => $u) {
            if ($u['barcode'] !== null
                && ProductUnit::where('barcode', $u['barcode'])->when($u['id'], fn ($q) => $q->where('id', '!=', $u['id']))->exists()) {
                $this->fail("units.$i.barcode", 'Barcode sudah dipakai satuan lain.');
            }
        }

        // 4. Perbarui yang ada, lalu buat yang baru.
        foreach ($units as $u) {
            $attrs = Arr::only($u, ['name', 'conversion', 'sell_price', 'barcode', 'is_base']);

            if ($u['id'] === null) {
                $product->units()->create($attrs);

                continue;
            }

            $unit = $existing->get($u['id']);

            if ($unit->conversion !== $u['conversion'] && $unit->isInUse()) {
                $this->fail('units', "Isi satuan \"{$unit->name}\" tidak bisa diubah karena sudah dipakai.");
            }

            $before = ['conversion' => $unit->conversion, 'sell_price' => $unit->sell_price];
            $unit->fill($attrs)->save();

            if ($before['sell_price'] !== $unit->sell_price) {
                $this->logActivity->handle('product.price_changed', $product, [
                    'unit' => $unit->name, 'old' => $before['sell_price'], 'new' => $unit->sell_price,
                ], $userId);
            }
            if ($before['conversion'] !== $unit->conversion) {
                $this->logActivity->handle('product.unit_conversion_changed', $product, [
                    'unit' => $unit->name, 'old' => $before['conversion'], 'new' => $unit->conversion,
                ], $userId);
            }
        }
    }

    private function fail(string $key, string $message): never
    {
        throw ValidationException::withMessages([$key => $message]);
    }
}

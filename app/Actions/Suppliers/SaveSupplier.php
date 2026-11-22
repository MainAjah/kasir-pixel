<?php

namespace App\Actions\Suppliers;

use App\Actions\Activity\LogActivity;
use App\Models\Supplier;

/** Tambah atau ubah supplier (Tahap 6B). Tidak menyentuh stok. */
class SaveSupplier
{
    public function __construct(private LogActivity $logActivity) {}

    /**
     * @param  array{name: string, contact?: string|null, address?: string|null, note?: string|null}  $data
     */
    public function handle(?Supplier $supplier, array $data, int $userId): Supplier
    {
        $fields = [
            'name' => $data['name'],
            'contact' => $data['contact'] ?? null,
            'address' => $data['address'] ?? null,
            'note' => $data['note'] ?? null,
        ];

        if ($supplier === null) {
            $supplier = Supplier::create($fields + ['created_by' => $userId]);
            $this->logActivity->handle('supplier.created', $supplier, ['name' => $supplier->name], $userId);

            return $supplier;
        }

        $supplier->fill($fields);
        $changed = array_keys($supplier->getDirty());
        $supplier->save();

        if ($changed !== []) {
            $this->logActivity->handle('supplier.updated', $supplier, ['fields' => $changed], $userId);
        }

        return $supplier;
    }
}

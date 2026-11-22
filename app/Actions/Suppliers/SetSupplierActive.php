<?php

namespace App\Actions\Suppliers;

use App\Actions\Activity\LogActivity;
use App\Models\Supplier;

/**
 * Menonaktifkan atau mengaktifkan supplier (Tahap 6B). Supplier nonaktif tidak
 * bisa dipilih di Barang masuk, tetapi penerimaan lama tetap menunjuknya.
 */
class SetSupplierActive
{
    public function __construct(private LogActivity $logActivity) {}

    public function handle(Supplier $supplier, bool $active, int $userId): Supplier
    {
        if ($supplier->is_active === $active) {
            return $supplier;
        }

        $supplier->update(['is_active' => $active]);
        $this->logActivity->handle($active ? 'supplier.activated' : 'supplier.deactivated', $supplier, [], $userId);

        return $supplier;
    }
}

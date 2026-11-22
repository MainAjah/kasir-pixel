<?php

namespace App\Http\Requests\Inventory;

use Carbon\Carbon;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // Tahap 6B: supplier dari data master (opsional, harus aktif), atau teks bebas.
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('is_active', true)->whereNull('deleted_at')],
            'supplier_name' => ['nullable', 'string', 'max:150'],
            'note' => ['nullable', 'string', 'max:500'],
            // Diisi dalam WIB (zona tampilan), jadi dibandingkan dengan "sekarang" di zona yang sama.
            'occurred_at' => ['nullable', 'date', function (string $attribute, mixed $value, Closure $fail) {
                if (Carbon::parse($value, config('app.display_timezone'))->isFuture()) {
                    $fail('Tanggal terima tidak boleh di masa depan.');
                }
            }],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'integer', Rule::exists('products', 'id')->whereNull('deleted_at')],
            'lines.*.product_unit_id' => ['required', 'integer', Rule::exists('product_units', 'id')->whereNull('deleted_at')],
            'lines.*.qty' => ['required', 'integer', 'min:1', 'max:1000000'],
            'lines.*.cost_total' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function attributes(): array
    {
        return [
            'lines' => 'baris barang',
            'lines.*.product_id' => 'produk',
            'lines.*.product_unit_id' => 'satuan',
            'lines.*.qty' => 'jumlah',
            'lines.*.cost_total' => 'harga beli',
            'occurred_at' => 'tanggal terima',
            'supplier_id' => 'supplier',
            'supplier_name' => 'nama pemasok',
        ];
    }
}

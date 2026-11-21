<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', Rule::exists('products', 'id')->whereNull('deleted_at')],
            'product_unit_id' => ['required', 'integer', Rule::exists('product_units', 'id')->whereNull('deleted_at')],
            // opening = saldo awal, increase/decrease = koreksi tambah/kurang.
            'kind' => ['required', Rule::in(['opening', 'increase', 'decrease'])],
            'qty' => ['required', 'integer', 'min:1', 'max:1000000'],
            'note' => ['nullable', 'string', 'max:255', 'required_unless:kind,opening'],
            'cost_total' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function attributes(): array
    {
        return [
            'product_id' => 'produk',
            'product_unit_id' => 'satuan',
            'kind' => 'jenis',
            'qty' => 'jumlah',
            'note' => 'alasan',
            'cost_total' => 'harga beli',
        ];
    }
}

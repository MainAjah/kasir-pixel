<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class CompleteSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Sengaja tanpa harga: harga dibaca dari server (docs/skema.md K2).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.product_unit_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:100000'],
            'tendered' => ['required', 'integer', 'min:0', 'max:10000000000'],
        ];
    }

    public function attributes(): array
    {
        return ['items' => 'keranjang', 'items.*.qty' => 'jumlah', 'tendered' => 'uang diterima'];
    }
}

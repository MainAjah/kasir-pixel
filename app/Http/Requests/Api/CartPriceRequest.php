<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Keranjang untuk dihitung. Sama dengan checkout tanpa uang diterima; harga sengaja
 * tidak diterima (dibaca dari server).
 */
class CartPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.product_unit_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:100000'],
        ];
    }

    public function attributes(): array
    {
        return ['items' => 'keranjang', 'items.*.qty' => 'jumlah'];
    }
}

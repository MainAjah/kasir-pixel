<?php

namespace App\Http\Requests\Inventory;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Dijaga middleware role:admin di rute.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var Product|null $product */
        $product = $this->route('product');

        return [
            'sku' => ['required', 'string', 'max:50', Rule::unique('products', 'sku')->ignore($product?->id)],
            'name' => ['required', 'string', 'max:150'],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->whereNull('deleted_at')],
            'min_stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'is_active' => ['required', 'boolean'],
            'units' => ['required', 'array', 'min:1'],
            'units.*.id' => ['nullable', 'integer'],
            'units.*.name' => ['required', 'string', 'max:30'],
            'units.*.conversion' => ['required', 'integer', 'min:1', 'max:1000000'],
            'units.*.sell_price' => ['required', 'integer', 'min:0'],
            'units.*.barcode' => ['nullable', 'string', 'max:64'],
            'units.*.is_base' => ['required', 'boolean'],
            // Tahap 6D: gambar boleh dipilih langsung saat menambah produk.
            'image' => ['nullable', ...ProductImageRequest::IMAGE_RULES],
        ];
    }

    public function messages(): array
    {
        return ProductImageRequest::IMAGE_MESSAGES;
    }

    public function attributes(): array
    {
        return [
            'sku' => 'SKU',
            'name' => 'nama',
            'min_stock' => 'stok minimum',
            'units.*.name' => 'nama satuan',
            'units.*.conversion' => 'isi satuan',
            'units.*.sell_price' => 'harga jual',
            'units.*.barcode' => 'barcode',
            'image' => 'gambar',
        ];
    }
}

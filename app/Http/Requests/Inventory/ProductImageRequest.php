<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class ProductImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Dijaga middleware role:admin di rute.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'image', 'mimes:png,webp,gif,jpg,jpeg', 'max:2048', 'dimensions:max_width=2000,max_height=2000'],
        ];
    }

    public function attributes(): array
    {
        return ['image' => 'gambar'];
    }

    public function messages(): array
    {
        return [
            'image.max' => 'Gambar paling besar 2 MB.',
            'image.dimensions' => 'Gambar paling besar 2000 × 2000 piksel.',
        ];
    }
}

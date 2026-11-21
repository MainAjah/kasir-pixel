<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['sale.opened', 'item.scanned'])],
            'product' => ['required_if:type,item.scanned', 'nullable', 'string', 'max:150'],
            'unit' => ['required_if:type,item.scanned', 'nullable', 'string', 'max:30'],
            'qty' => ['required_if:type,item.scanned', 'nullable', 'integer', 'min:1', 'max:100000'],
        ];
    }
}

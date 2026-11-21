<?php

namespace App\Http\Requests\Pos;

use Illuminate\Foundation\Http\FormRequest;

class OpenShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Dijaga middleware role di rute.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['opening_cash' => ['required', 'integer', 'min:0', 'max:1000000000']];
    }

    public function attributes(): array
    {
        return ['opening_cash' => 'kas awal'];
    }
}

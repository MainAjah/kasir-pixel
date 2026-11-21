<?php

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;

class ReverseSavingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['reason' => ['required', 'string', 'max:255']];
    }

    public function attributes(): array
    {
        return ['reason' => 'alasan'];
    }
}

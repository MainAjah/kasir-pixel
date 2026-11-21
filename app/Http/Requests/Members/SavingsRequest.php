<?php

namespace App\Http\Requests\Members;

use App\Enums\SavingsType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SavingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'savings_type' => ['required', Rule::enum(SavingsType::class)],
            'kind' => ['required', Rule::in(['deposit', 'withdrawal'])],
            'amount' => ['required', 'integer', 'min:1', 'max:1000000000'],
            'period' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'savings_type' => 'jenis simpanan',
            'kind' => 'jenis transaksi',
            'amount' => 'jumlah',
            'period' => 'bulan',
            'note' => 'catatan',
        ];
    }
}

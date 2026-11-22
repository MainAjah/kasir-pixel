<?php

namespace App\Http\Requests\Reports;

use App\Support\ReportPeriod;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filter laporan (Tahap 6C): periode dan kasir (khusus laporan penjualan).
 * Hanya admin (dijaga rute). Rentang bebas: "sampai" ≥ "dari", paling panjang
 * 366 hari, dan tidak di masa depan (zona tampilan).
 */
class ReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $isRange = $this->input('periode') === 'rentang';
        $today = CarbonImmutable::now(ReportPeriod::tz())->format('Y-m-d');

        return [
            'periode' => ['nullable', Rule::in(ReportPeriod::PRESETS)],
            'dari' => [Rule::requiredIf($isRange), 'nullable', 'date_format:Y-m-d', 'before_or_equal:'.$today],
            'sampai' => [
                Rule::requiredIf($isRange), 'nullable', 'date_format:Y-m-d', 'after_or_equal:dari', 'before_or_equal:'.$today,
                function (string $attribute, mixed $value, Closure $fail) {
                    $from = $this->input('dari');

                    if ($from && $value && CarbonImmutable::parse($from)->diffInDays(CarbonImmutable::parse($value)) + 1 > ReportPeriod::MAX_DAYS) {
                        $fail('Rentang laporan paling panjang '.ReportPeriod::MAX_DAYS.' hari.');
                    }
                },
            ],
            'kasir' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ];
    }

    public function attributes(): array
    {
        return ['dari' => 'tanggal awal', 'sampai' => 'tanggal akhir', 'kasir' => 'kasir'];
    }

    public function period(): ReportPeriod
    {
        $data = $this->validated();

        return ReportPeriod::make($data['periode'] ?? 'hari-ini', $data['dari'] ?? null, $data['sampai'] ?? null);
    }

    public function cashierId(): ?int
    {
        $id = $this->validated()['kasir'] ?? null;

        return $id === null ? null : (int) $id;
    }
}

<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;

/**
 * Periode laporan (Tahap 6C): hari ini, 7 hari, bulan ini, atau rentang bebas.
 *
 * Tanggal ditafsirkan di zona tampilan (app.display_timezone, WIB): dari pukul
 * 00.00.00 hari pertama sampai 23.59.59 hari terakhir. Kueri memakai rentang
 * yang sama dalam zona aplikasi (UTC). "Hari ini" di sini sama persis dengan
 * kartu "Hari Ini" di Beranda (TodaySummary memakai ReportPeriod::today()).
 */
final class ReportPeriod
{
    public const PRESETS = ['hari-ini', '7-hari', 'bulan-ini', 'rentang'];

    /** Rentang bebas paling panjang (hari). */
    public const MAX_DAYS = 366;

    private function __construct(
        public readonly string $preset,
        /** Hari pertama, 00.00 di zona tampilan. */
        public readonly CarbonImmutable $start,
        /** Hari terakhir, 23.59.59 di zona tampilan. */
        public readonly CarbonImmutable $end,
    ) {}

    public static function today(?CarbonInterface $now = null): self
    {
        $day = self::now($now)->startOfDay();

        return new self('hari-ini', $day, $day->endOfDay());
    }

    /**
     * @param  string|null  $from  Y-m-d (hanya untuk "rentang")
     * @param  string|null  $to  Y-m-d (hanya untuk "rentang")
     */
    public static function make(string $preset, ?string $from = null, ?string $to = null, ?CarbonInterface $now = null): self
    {
        $today = self::now($now)->startOfDay();

        return match ($preset) {
            '7-hari' => new self('7-hari', $today->subDays(6), $today->endOfDay()),
            'bulan-ini' => new self('bulan-ini', $today->startOfMonth(), $today->endOfDay()),
            'rentang' => new self(
                'rentang',
                CarbonImmutable::parse((string) $from, self::tz())->startOfDay(),
                CarbonImmutable::parse((string) $to, self::tz())->endOfDay(),
            ),
            default => self::today($now),
        };
    }

    /** Batas kueri dalam zona aplikasi (UTC). @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    public function utcRange(): array
    {
        $appTz = config('app.timezone');

        return [$this->start->setTimezone($appTz), $this->end->setTimezone($appTz)];
    }

    /** Tanggal-tanggal di periode (zona tampilan), Y-m-d. @return list<string> */
    public function days(): array
    {
        return array_map(
            fn (CarbonInterface $d) => $d->format('Y-m-d'),
            iterator_to_array(CarbonPeriod::create($this->start->startOfDay(), '1 day', $this->end->startOfDay())),
        );
    }

    /** @return array{preset: string, from: string, to: string} */
    public function toArray(): array
    {
        return [
            'preset' => $this->preset,
            'from' => $this->start->format('Y-m-d'),
            'to' => $this->end->format('Y-m-d'),
        ];
    }

    public static function tz(): string
    {
        return (string) config('app.display_timezone');
    }

    private static function now(?CarbonInterface $now): CarbonImmutable
    {
        return CarbonImmutable::instance($now ?? now())->setTimezone(self::tz());
    }
}

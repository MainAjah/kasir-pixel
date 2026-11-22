<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Ekspor CSV laporan (Tahap 6C): pemisah titik koma (;) dan penanda UTF-8 agar
 * langsung rapi di Excel berbahasa Indonesia.
 *
 * Pengaman rumus: sel TEKS yang diawali =, +, - atau @ diberi awalan tanda petik
 * (') supaya Excel tidak membacanya sebagai rumus. Angka (int) ditulis apa
 * adanya, jadi mutasi negatif seperti -5 tetap angka.
 */
final class CsvWriter
{
    public const DELIMITER = ';';

    private const BOM = "\xEF\xBB\xBF";

    /** Nilai satu sel yang aman ditulis. */
    public static function cell(string|int|null $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_int($value)) {
            return (string) $value;
        }

        return preg_match('/^[=+\-@]/', $value) === 1 ? "'".$value : $value;
    }

    /**
     * Isi CSV lengkap sebagai teks (untuk tes dan unduhan kecil).
     *
     * @param  list<string>  $header
     * @param  iterable<array<int, string|int|null>>  $rows
     */
    public static function toString(array $header, iterable $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        fwrite($handle, self::BOM);
        self::put($handle, $header);

        foreach ($rows as $row) {
            self::put($handle, $row);
        }

        rewind($handle);
        $csv = (string) stream_get_contents($handle);
        fclose($handle);

        return $csv;
    }

    /**
     * @param  list<string>  $header
     * @param  iterable<array<int, string|int|null>>  $rows
     */
    public static function download(string $filename, array $header, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $rows) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, self::BOM);
            self::put($handle, $header);

            foreach ($rows as $row) {
                self::put($handle, $row);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @param  resource  $handle
     * @param  array<int, string|int|null>  $row
     */
    private static function put($handle, array $row): void
    {
        fputcsv($handle, array_map(self::cell(...), $row), self::DELIMITER, '"', '');
    }
}

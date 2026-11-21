<?php

/*
|--------------------------------------------------------------------------
| Aturan koperasi (keputusan Q3: tarif di berkas config, bukan tabel)
|--------------------------------------------------------------------------
|
| Angka di bawah hanya contoh untuk tugas, BUKAN aturan koperasi sungguhan.
| Sesuaikan lewat .env. Semua dalam rupiah bulat.
|
*/

return [

    'savings' => [
        // Simpanan pokok: dibayar sekali, sebesar tarif penuh.
        'pokok' => (int) env('KOPERASI_SIMPANAN_POKOK', 100000),

        // Simpanan wajib: per bulan, sebesar tarif ini.
        'wajib' => (int) env('KOPERASI_SIMPANAN_WAJIB', 25000),

        // Simpanan sukarela: setoran minimal.
        'sukarela_min' => (int) env('KOPERASI_SIMPANAN_SUKARELA_MIN', 1000),
    ],

];

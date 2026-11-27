/**
 * Token desain HD-2D (Tahap B1) dalam bentuk TS.
 *
 * Sumber tampilan tetap `resources/css/hd2d.css` (variabel CSS `--hd-*`).
 * Nilai di sini dipakai tes (kontras, kecocokan dengan CSS) dan oleh modul
 * yang tidak bisa membaca variabel CSS, misalnya adegan three.js nanti.
 */
export const HD_COLORS = {
    /** Emas terang: judul, garis dalam, fokus. */
    emas: '#e3c27a',
    /** Emas tua: garis luar, ujung gradasi tombol. */
    emasTua: '#b8954f',
    /** Teks utama krem. */
    krem: '#f1e8d6',
    /** Teks sekunder. */
    kremRedup: '#b9ad95',
    /** Dasar panel (dipakai dengan opasitas 0,86). */
    panel: '#0c0d1c',
    /** Merah lembut untuk galat. */
    merah: '#e57a6a',
    /** Hijau lembut untuk sukses. */
    hijau: '#9fd39a',
    /** Teks gelap di atas tombol emas. */
    tinta: '#1a1408',
} as const;

export type HdColor = keyof typeof HD_COLORS;

/** Opasitas panel dari spesifikasi (sekitar 0,86). */
export const HD_PANEL_ALPHA = 0.86;

/** Nama variabel CSS untuk tiap warna (mis. emasTua → --hd-emas-tua). */
export function cssVarName(key: HdColor): string {
    return `--hd-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/** Durasi gerak (ms). Semua efek di bawah 500 ms dan tidak menghalangi input. */
export const HD_MOTION = {
    cepat: 120,
    sedang: 220,
    lambat: 420,
} as const;

/** Kecepatan efek mengetik dialog penjaga toko (huruf per detik). */
export const HD_TYPING_CPS = 45;

/**
 * Palet 24 warna pastel diorama (docs/diorama-rancangan.md bagian 7).
 * Semua sprite buatan kode hanya boleh memakai warna di sini.
 */
export const PALETTE = [
    '#2b2a33', //  1 garis tepi gelap
    '#5b5470', //  2 bayangan
    '#8f88a8', //  3 abu lavender (logam)
    '#fdf8f0', //  4 sorotan
    '#f7f1e3', //  5 krem terang
    '#efe2c4', //  6 dinding krem
    '#d9c7a3', //  7 lantai terang
    '#c4ad86', //  8 lantai gelap
    '#a7d7a5', //  9 hijau daun pastel
    '#6fae7b', // 10 hijau tua
    '#ffe9a8', // 11 kuning lampu
    '#f6c56b', // 12 oranye kunyit
    '#e89b4f', // 13 kunyit gelap
    '#e8907e', // 14 merah bata pastel
    '#c2675a', // 15 bata gelap
    '#f4b6c2', // 16 merah muda
    '#c9b6e4', // 17 lavender
    '#9fd3e6', // 18 biru langit, kaca
    '#6a9fc4', // 19 biru tua
    '#7a5c4b', // 20 kayu, rambut
    '#f2c9a5', // 21 kulit terang
    '#c98e6a', // 22 kulit sedang
    '#8d5a3f', // 23 kulit gelap
    '#3a3d6b', // 24 biru malam
] as const;

export type PaletteIndex =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24;

/** Warna palet menurut nomornya di rancangan (1 sampai 24). */
export function C(index: PaletteIndex): string {
    return PALETTE[index - 1];
}

export function isPaletteColor(color: string): boolean {
    return (PALETTE as readonly string[]).includes(color.toLowerCase());
}

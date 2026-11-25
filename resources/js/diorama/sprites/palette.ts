/**
 * Palet 24 warna pastel diorama (docs/diorama-rancangan.md bagian 7).
 * Semua sprite buatan kode hanya boleh memakai warna di sini, ditambah palet
 * bahan (MATERIAL, di bawah) untuk ruangan dan perabot sejak Tahap 5G.
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

/**
 * Palet bahan "cozy elegan" (Tahap 5G, konsep v4 pilihan pemilik): khusus ruangan
 * dan perabot (lantai, dinding, alas, rak, meja, kulkas). Karakter, barang yang
 * dibawa, dan hiasan tetap memakai 24 warna di atas.
 */
export const MATERIAL = {
    'walnut-1': '#7a553c',
    'walnut-2': '#6e4a33',
    'walnut-3': '#64432f',
    'walnut-4': '#5c3c2a',
    'walnut-5': '#4a2f22',
    'walnut-6': '#3a2419',
    'walnut-7': '#2f1f18',
    kuningan: '#c49a52',
    'kuningan-gelap': '#8f6d36',
    marmer: '#efe8dd',
    ivory: '#f2e8da',
    wainscot: '#f7f1e7',
    panel: '#e6d9c8',
    'krem-bayangan': '#d6c9b2',
    mawar: '#c49f9b',
    burgundi: '#9a4a55',
    'burgundi-gelap': '#6e2e3a',
    madu: '#d8b878',
    sage: '#aebca4',
    kaca: '#cfe0dc',
    'kaca-gelap': '#97b2ac',
    'mawar-muda': '#d9b2b0',
    latar: '#1f171a',
} as const;

export type MaterialName = keyof typeof MATERIAL;

/** Warna bahan menurut namanya. */
export function M(name: MaterialName): string {
    return MATERIAL[name];
}

export function isMaterialColor(color: string): boolean {
    return (Object.values(MATERIAL) as string[]).includes(color.toLowerCase());
}

/** Warna yang boleh dipakai sprite ruangan dan perabot: palet 24 atau palet bahan. */
export function isSceneColor(color: string): boolean {
    return isPaletteColor(color) || isMaterialColor(color);
}

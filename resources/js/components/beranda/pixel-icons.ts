/**
 * Ikon menu Beranda (Tahap 5D-1), digambar sendiri sebagai grid 12 × 12 dan
 * hanya memakai warna palet diorama. Tiap huruf menunjuk satu warna; titik
 * berarti transparan.
 */
import { C } from '@/diorama/sprites/palette';

export type PixelIconName =
    | 'produk'
    | 'stok'
    | 'laporan'
    | 'pengguna'
    | 'kasir'
    | 'anggota'
    | 'keluar'
    | 'hak-akses'
    | 'beranda'
    | 'toko';

/** Kunci warna yang dipakai semua ikon. */
export const ICON_COLORS: Record<string, string> = {
    k: C(1), // garis tepi
    w: C(4), // sorotan, kertas
    O: C(7), // kardus terang
    o: C(8), // kardus gelap
    y: C(6), // lakban
    R: C(14), // merah bata
    G: C(9), // hijau daun
    g: C(10), // hijau tua
    B: C(18), // biru langit
    b: C(19), // biru tua
    s: C(21), // kulit
    h: C(20), // rambut, kayu
    K: C(12), // kunyit
    q: C(13), // kunyit gelap
    L: C(17), // lavender
    l: C(11), // kuning lampu
};

export const PIXEL_ICONS: Record<PixelIconName, readonly string[]> = {
    // Kardus berlakban dengan label kecil di pojok.
    produk: [
        '............',
        '.kkkkkkkkkk.',
        '.kOOOyyOOOk.',
        '.kkkkyykkkk.',
        '.koooyyoook.',
        '.koooyyoook.',
        '.koooyyoook.',
        '.koooyyokkk.',
        '.koooyyokwk.',
        '.koooyyokkk.',
        '.kkkkkkkkkk.',
        '............',
    ],
    // Tumpukan tiga kotak barang.
    stok: [
        '............',
        '...kkkkkk...',
        '...kRRRRk...',
        '...kRwRRk...',
        '...kRRRRk...',
        'kkkkkkkkkkkk',
        'kGGGGkkBBBBk',
        'kGwGGkkBwBBk',
        'kGGGGkkBBBBk',
        'kGGGGkkBBBBk',
        'kkkkkkkkkkkk',
        '............',
    ],
    // Kertas dengan diagram batang.
    laporan: [
        '............',
        '.kkkkkkkkkk.',
        '.kwwwwwwwwk.',
        '.kwwwwwwgwk.',
        '.kwwwwwwgwk.',
        '.kwwwwKwgwk.',
        '.kwwwwKwgwk.',
        '.kwwRwKwgwk.',
        '.kwwRwKwgwk.',
        '.kwkkkkkkwk.',
        '.kkkkkkkkkk.',
        '............',
    ],
    // Orang (kepala dan bahu).
    pengguna: [
        '............',
        '....kkkk....',
        '...khhhhk...',
        '...kssssk...',
        '...kssssk...',
        '....kkkk....',
        '...kkkkkk...',
        '..kbbbbbbk..',
        '.kbbbbbbbbk.',
        '.kbbbbbbbbk.',
        '.kkkkkkkkkk.',
        '............',
    ],
    // Mesin kasir dengan layar dan laci.
    kasir: [
        '............',
        '......kkkkk.',
        '......kGGGk.',
        '......kkkkk.',
        '.......kk...',
        '.kkkkkkkkkk.',
        '.kKKKKKKKKk.',
        '.kKkKkKkKKk.',
        '.kkkkkkkkkk.',
        '.kqqqwwqqqk.',
        '.kkkkkkkkkk.',
        '............',
    ],
    // Kartu anggota dengan foto.
    anggota: [
        '............',
        '............',
        'kkkkkkkkkkkk',
        'kLLLLLLLLLLk',
        'kwwwwwwwwwwk',
        'kwssswkkkkwk',
        'kwssswwwwwwk',
        'kwbbbwkkkwwk',
        'kwwwwwwwwwwk',
        'kkkkkkkkkkkk',
        '............',
        '............',
    ],
    // Rumah beratap bata (Beranda, menu samping 5E-1).
    beranda: [
        '.....kk.....',
        '....kRRk....',
        '...kRRRRk...',
        '..kRRRRRRk..',
        '.kRRRRRRRRk.',
        'kkkkkkkkkkkk',
        '.kwwwwwwwwk.',
        '.kwkkwwkkwk.',
        '.kwkBkwkhwk.',
        '.kwkkwwkhwk.',
        '.kwwwwwkhwk.',
        '.kkkkkkkkkk.',
    ],
    // Toko berkanopi garis (logo kerangka 5E-1).
    toko: [
        '............',
        'kkkkkkkkkkkk',
        'kRwRwRwRwRwk',
        'kRwRwRwRwRwk',
        '.kkkkkkkkkk.',
        '.kOOOOOOOOk.',
        '.kOkkkOkkOk.',
        '.kOkBkOkhOk.',
        '.kOkkkOkhOk.',
        '.kOOOOOkhOk.',
        '.kkkkkkkkkk.',
        '............',
    ],
    // Kunci emas (hak akses).
    'hak-akses': [
        '............',
        '............',
        '.kkkk.......',
        'kKKKKk......',
        'kKkkKkkkkkk.',
        'kKkkKKKKKKKk',
        'kKKKKkkkkKKk',
        '.kkkk...kKk.',
        '........kkk.',
        '............',
        '............',
        '............',
    ],
    // Pintu dengan panah keluar.
    keluar: [
        '............',
        '.kkkkkk.....',
        '.khhhhk.....',
        '.khhhhk..k..',
        '.khhhhk..kk.',
        '.khhlhkkkkkk',
        '.khhhhkkkkkk',
        '.khhhhk..kk.',
        '.khhhhk..k..',
        '.khhhhk.....',
        '.kkkkkk.....',
        '............',
    ],
};

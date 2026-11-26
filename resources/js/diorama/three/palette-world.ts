/**
 * Palet dunia diorama 3D (Tahap 5H, docs/rencana-tahap-5h.md bagian 2).
 *
 * Khusus tekstur sumber lingkungan 3D (alas, lantai, dinding, perabot, tanaman,
 * cahaya). Palet antarmuka 24 warna (`sprites/palette.ts` PALETTE, token px-*)
 * TIDAK berubah dan tidak memakai warna di sini. Karakter pemilik tetap berwarna
 * asli; pelanggan buatan kode dan barang tetap palet 24.
 *
 * Nada walnut dan beberapa warna dinding/rak sama dengan palet bahan v4
 * (`MATERIAL`) yang sudah disetujui, supaya suasananya tetap "cozy elegan".
 */
import { MATERIAL } from '../sprites/palette';

export const WORLD = {
    // Latar biru gelap dan tinta bayangan (5)
    'latar-1': '#0f1626',
    'latar-2': '#17213a',
    'latar-3': '#22304f',
    tinta: '#140b0d',
    garis: '#2b2a33',

    // Bata alas balok (6)
    'bata-sorot': '#c98a6b',
    'bata-1': '#b0705a',
    'bata-2': '#9a5c4a',
    'bata-3': '#7f4a3c',
    'nat-1': '#5a3a33',
    'nat-2': '#432b27',

    // Walnut (7), sama dengan palet bahan v4
    'walnut-1': MATERIAL['walnut-1'],
    'walnut-2': MATERIAL['walnut-2'],
    'walnut-3': MATERIAL['walnut-3'],
    'walnut-4': MATERIAL['walnut-4'],
    'walnut-5': MATERIAL['walnut-5'],
    'walnut-6': MATERIAL['walnut-6'],
    'walnut-7': MATERIAL['walnut-7'],

    // Plester mawar, ivory, wainscot, panel (8)
    'mawar-terang': '#d3b1ac',
    mawar: MATERIAL.mawar,
    'mawar-gelap': '#a9837f',
    ivory: MATERIAL.ivory,
    'ivory-gelap': '#e0d2bf',
    wainscot: MATERIAL.wainscot,
    panel: MATERIAL.panel,
    'krem-bayangan': MATERIAL['krem-bayangan'],

    // Kuningan (3)
    'kuningan-sorot': '#e2c27a',
    kuningan: MATERIAL.kuningan,
    'kuningan-gelap': MATERIAL['kuningan-gelap'],

    // Marmer (3)
    marmer: MATERIAL.marmer,
    'marmer-urat': '#d8cfc3',
    'marmer-gelap': '#bfb4a6',

    // Daun dan pot terakota (8)
    'daun-sorot': '#b9cf7a',
    'daun-1': '#8fb162',
    'daun-2': '#6a9150',
    'daun-3': '#4b6e3f',
    'daun-4': '#33502f',
    'pot-sorot': '#d98e64',
    pot: '#b8694a',
    'pot-gelap': '#8a4a36',

    // Kaca dan enamel kulkas (4)
    kaca: MATERIAL.kaca,
    'kaca-gelap': MATERIAL['kaca-gelap'],
    enamel: '#efe4cf',
    'enamel-gelap': '#cdbfa6',

    // Barang rak (6)
    burgundi: MATERIAL.burgundi,
    'burgundi-gelap': MATERIAL['burgundi-gelap'],
    madu: MATERIAL.madu,
    sage: MATERIAL.sage,
    'sage-gelap': '#8e9c86',
    'mawar-muda': MATERIAL['mawar-muda'],

    // Cahaya (5)
    emas: '#ffd27a',
    jingga: '#f29a4a',
    lampu: '#ffe9a8',
    inti: '#fff6dc',
    bara: '#d4643a',
} as const;

export type WorldColor = keyof typeof WORLD;

/** Warna dunia menurut namanya. */
export function W(name: WorldColor): string {
    return WORLD[name];
}

export const WORLD_PALETTE: readonly string[] = Object.values(WORLD).map((c) =>
    c.toLowerCase(),
);

export function isWorldColor(color: string): boolean {
    return WORLD_PALETTE.includes(color.toLowerCase());
}

/** Latar di belakang balok toko (biru gelap, keputusan pemilik). */
export const BACKDROP = WORLD['latar-2'];

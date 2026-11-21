/**
 * Denah minimarket koperasi sebagai data (docs/diorama-rancangan.md bagian 2).
 *
 *  gy\gx 0  1  2  3  4  5  6  7  8  9 10 11
 *    0   Tn .  .  .  .  .  .  Vm Vm Vm .  .
 *    1   .  .  .  .  .  .  .  .  .  .  .  .
 *    2   .  .  RA RA RA RA RA .  .  K2s .  .
 *    3   .  .  .  .  .  .  .  .  .  K2 K2 .
 *    4   .  .  RB RB RB RB RB .  .  .  .  .
 *    5   .  .  .  .  .  .  .  .  .  P  .  Tn
 *    6   Pi .  .  .  .  .  .  .  .  K1 K1 .
 *    7   Pi .  .  .  .  A4 A3 A2 A1 L  .  .
 *    8   .  .  .  .  .  .  .  .  .  .  .  .
 */
import type { Grid } from '../engine/grid';
import { tileKey } from '../engine/iso';
import type { Facing, Tile } from '../engine/iso';

export type FurnitureKind =
    | 'rak'
    | 'vending'
    | 'meja_kasir'
    | 'bangku'
    | 'tanaman';

export type Furniture = {
    id: string;
    kind: FurnitureKind;
    label: string;
    gx: number;
    gy: number;
    /** Panjang searah gx dan gy, dalam tile. */
    w: number;
    h: number;
    /** Tinggi badan benda dalam piksel kanvas dasar. */
    height: number;
    /** Hanya untuk meja kasir: kasir 1 menyala, kasir 2 tutup. */
    active?: boolean;
    /** Warna gambar pengganti sementara (5B). */
    color: string;
};

export type PickPoint = Tile & {
    /** Benda yang diambil barangnya dari titik ini. */
    source: string;
    /** Arah hadap pelanggan saat mengambil (menghadap benda). */
    facing: Facing;
};

export type StoreScene = {
    width: number;
    height: number;
    furniture: Furniture[];
    /** Tile terlarang tambahan di luar perabot (area di belakang meja kasir). */
    extraBlocked: Tile[];
    guard: Tile & { facing: Facing };
    pickPoints: PickPoint[];
    /** Slot antrean; indeks 0 adalah titik dilayani. */
    queueSlots: Tile[];
    door: { outside: Tile; inside: Tile };
    exitLaneGy: number;
};

const rackFront = (source: string, gy: number): PickPoint[] =>
    [2, 3, 4, 5, 6].map((gx) => ({ gx, gy, source, facing: 'ne' }));

export const STORE_SCENE: StoreScene = {
    width: 12,
    height: 9,
    furniture: [
        {
            id: 'tanaman-1',
            kind: 'tanaman',
            label: 'Tanaman',
            gx: 0,
            gy: 0,
            w: 1,
            h: 1,
            height: 24,
            color: '#6fae7b',
        },
        {
            id: 'vending-merah',
            kind: 'vending',
            label: 'Vending',
            gx: 7,
            gy: 0,
            w: 1,
            h: 1,
            height: 76,
            color: '#e8907e',
        },
        {
            id: 'vending-biru',
            kind: 'vending',
            label: 'Vending',
            gx: 8,
            gy: 0,
            w: 1,
            h: 1,
            height: 76,
            color: '#9fd3e6',
        },
        {
            id: 'vending-hijau',
            kind: 'vending',
            label: 'Vending',
            gx: 9,
            gy: 0,
            w: 1,
            h: 1,
            height: 76,
            color: '#a7d7a5',
        },
        {
            id: 'rak-a',
            kind: 'rak',
            label: 'Rak A',
            gx: 2,
            gy: 2,
            w: 5,
            h: 1,
            height: 32,
            color: '#c4ad86',
        },
        {
            id: 'bangku-2',
            kind: 'bangku',
            label: 'Bangku',
            gx: 9,
            gy: 2,
            w: 1,
            h: 1,
            height: 12,
            color: '#c9b6e4',
        },
        {
            id: 'kasir-2',
            kind: 'meja_kasir',
            label: 'Kasir 2',
            gx: 9,
            gy: 3,
            w: 2,
            h: 1,
            height: 28,
            active: false,
            color: '#e89b4f',
        },
        {
            id: 'rak-b',
            kind: 'rak',
            label: 'Rak B',
            gx: 2,
            gy: 4,
            w: 5,
            h: 1,
            height: 32,
            color: '#c4ad86',
        },
        {
            id: 'tanaman-2',
            kind: 'tanaman',
            label: 'Tanaman',
            gx: 11,
            gy: 5,
            w: 1,
            h: 1,
            height: 24,
            color: '#6fae7b',
        },
        {
            id: 'kasir-1',
            kind: 'meja_kasir',
            label: 'Kasir 1',
            gx: 9,
            gy: 6,
            w: 2,
            h: 1,
            height: 28,
            active: true,
            color: '#f6c56b',
        },
    ],
    // Area penjaga di belakang kedua meja kasir.
    extraBlocked: [
        { gx: 9, gy: 5 },
        { gx: 10, gy: 5 },
        { gx: 10, gy: 2 },
        { gx: 11, gy: 2 },
    ],
    guard: { gx: 9, gy: 5, facing: 'sw' },
    pickPoints: [
        ...rackFront('rak-a', 3),
        ...rackFront('rak-b', 5),
        { gx: 7, gy: 1, source: 'vending-merah', facing: 'ne' },
        { gx: 8, gy: 1, source: 'vending-biru', facing: 'ne' },
        { gx: 9, gy: 1, source: 'vending-hijau', facing: 'ne' },
    ],
    queueSlots: [
        { gx: 9, gy: 7 },
        { gx: 8, gy: 7 },
        { gx: 7, gy: 7 },
        { gx: 6, gy: 7 },
        { gx: 5, gy: 7 },
    ],
    door: { outside: { gx: -1, gy: 7 }, inside: { gx: 0, gy: 7 } },
    exitLaneGy: 8,
};

/** Grid jalan dari denah: semua tapak perabot dan area penjaga terlarang. */
export function buildGrid(scene: StoreScene): Grid {
    const blocked = new Set<string>();

    for (const item of scene.furniture) {
        for (let dx = 0; dx < item.w; dx++) {
            for (let dy = 0; dy < item.h; dy++) {
                blocked.add(tileKey(item.gx + dx, item.gy + dy));
            }
        }
    }

    for (const tile of scene.extraBlocked) {
        blocked.add(tileKey(tile.gx, tile.gy));
    }

    return { width: scene.width, height: scene.height, blocked };
}

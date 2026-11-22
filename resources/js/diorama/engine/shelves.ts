/**
 * Isi rak dan vending menurut stok nyata (Tahap 5D-1, disetujui pemilik).
 *
 * Server (ShelfStock) mengirim tingkat isi tiap produk aktif, sudah urut:
 * `rak` (urut kategori lalu nama) dan `vending` (kategori Minuman, urut nama).
 * Di sini daftar itu dibagi rata ke potongan rak (Rak A kiri ke kanan, lalu
 * Rak B) dan ke mesin vending sesuai urutan di denah. Potongan berisi lebih dari
 * satu produk memakai rata-rata tingkatnya, dibulatkan ke bawah. Bila produk
 * lebih sedikit dari potongan, satu produk mengisi beberapa potongan; tanpa
 * produk sama sekali semuanya kosong. Diorama hanya membaca.
 */
import type { StoreScene } from '../scenes/store-scene';
import { RACK_FILLS } from '../sprites/rack-sprite';
import type { RackFill } from '../sprites/rack-sprite';
import { sliceFootprint } from './depth';

export type ShelfLevels = {
    rak: RackFill[];
    vending: RackFill[];
};

/** Isi tiap potongan, kuncinya `${id perabot}#${indeks potongan}`. */
export type ShelfFills = Record<string, RackFill>;

export function fillKey(furnitureId: string, index: number): string {
    return `${furnitureId}#${index}`;
}

/** Bagi tingkat isi produk (urut) ke sejumlah potongan. */
export function distribute(levels: RackFill[], slots: number): RackFill[] {
    const n = levels.length;

    return Array.from({ length: slots }, (_, i) => {
        if (n === 0) {
            return 'kosong';
        }

        const start = Math.floor((i * n) / slots);
        const end = Math.max(Math.floor(((i + 1) * n) / slots), start + 1);
        const group = levels.slice(start, end);
        const ranks = group.map((level) => RACK_FILLS.indexOf(level));
        const average = ranks.reduce((sum, r) => sum + r, 0) / ranks.length;

        return RACK_FILLS[Math.floor(average)];
    });
}

/** Isi tiap potongan rak dan tiap mesin vending di denah. */
export function shelfFills(levels: ShelfLevels, scene: StoreScene): ShelfFills {
    const fills: ShelfFills = {};

    for (const kind of ['rak', 'vending'] as const) {
        const slices = scene.furniture
            .filter((item) => item.kind === kind)
            .flatMap((item) =>
                sliceFootprint(item).map((s) => fillKey(item.id, s.index)),
            );
        const values = distribute(levels[kind], slices.length);

        slices.forEach((key, i) => {
            fills[key] = values[i];
        });
    }

    return fills;
}

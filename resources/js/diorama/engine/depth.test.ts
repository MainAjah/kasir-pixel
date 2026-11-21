import { describe, expect, it } from 'vite-plus/test';
import {
    LAYER,
    actorDepth,
    effectDepth,
    sliceFootprint,
    sortDrawItems,
} from './depth';
import type { Layer } from './depth';

const item = (id: string, depth: number, layer: Layer, gx: number) => ({
    id,
    depth,
    layer,
    gx,
});
const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe('urutan kedalaman', () => {
    it('yang lebih jauh (gx + gy kecil) digambar lebih dulu', () => {
        const sorted = sortDrawItems([
            item('depan', 16, LAYER.actor, 9),
            item('belakang', 4, LAYER.furniture, 2),
            item('tengah', 9, LAYER.actor, 7),
        ]);

        expect(ids(sorted)).toEqual(['belakang', 'tengah', 'depan']);
    });

    it('seri: perabot, lalu aktor, lalu efek, lalu gx kecil', () => {
        const sorted = sortDrawItems([
            item('efek', 10, LAYER.effect, 1),
            item('aktor-kanan', 10, LAYER.actor, 8),
            item('aktor-kiri', 10, LAYER.actor, 3),
            item('perabot', 10, LAYER.furniture, 9),
        ]);

        expect(ids(sorted)).toEqual([
            'perabot',
            'aktor-kiri',
            'aktor-kanan',
            'efek',
        ]);
    });

    it('tidak mengubah daftar aslinya', () => {
        const items = [
            item('b', 2, LAYER.actor, 0),
            item('a', 1, LAYER.actor, 0),
        ];
        sortDrawItems(items);

        expect(ids(items)).toEqual(['b', 'a']);
    });

    it('efek tepat di depan pemiliknya, tetapi di belakang benda yang lebih dekat', () => {
        const owner = actorDepth(9, 7);
        const sorted = sortDrawItems([
            item('koin', effectDepth(owner), LAYER.effect, 9),
            item('pelanggan', owner, LAYER.actor, 9),
            item('benda-depan', owner + 1, LAYER.furniture, 9),
        ]);

        expect(ids(sorted)).toEqual(['pelanggan', 'koin', 'benda-depan']);
    });
});

describe('objek panjang dipotong per tile', () => {
    it('rak 5 tile menjadi 5 potongan dengan kedalaman masing-masing', () => {
        const slices = sliceFootprint({ gx: 2, gy: 4, w: 5, h: 1 });

        expect(slices.map((s) => [s.gx, s.gy, s.depth])).toEqual([
            [2, 4, 6],
            [3, 4, 7],
            [4, 4, 8],
            [5, 4, 9],
            [6, 4, 10],
        ]);
    });

    it('pelanggan di belakang ujung rak tertutup, di depan rak terlihat', () => {
        const rack = sliceFootprint({ gx: 2, gy: 4, w: 5, h: 1 }).map((s) =>
            item(`rak#${s.index}`, s.depth, LAYER.furniture, s.gx),
        );
        // (3,3) di lorong belakang rak B, (3,5) di depannya.
        const behind = item('belakang', actorDepth(3, 3), LAYER.actor, 3);
        const front = item('depan', actorDepth(3, 5), LAYER.actor, 3);
        const order = ids(sortDrawItems([...rack, behind, front]));

        expect(order.indexOf('belakang')).toBeLessThan(order.indexOf('rak#1'));
        expect(order.indexOf('depan')).toBeGreaterThan(order.indexOf('rak#1'));
    });

    it('tanpa pemotongan, pelanggan di depan ujung rak salah tertutup rak utuh', () => {
        // Rak utuh memakai kedalaman tile depan-kanannya (6,4) = 10. Pelanggan di (3,5) = 8
        // akan tergambar di belakangnya; dengan potongan per tile ia benar di depan.
        const whole = item('rak-utuh', 10, LAYER.furniture, 6);
        const front = item('depan', actorDepth(3, 5), LAYER.actor, 3);

        expect(ids(sortDrawItems([whole, front]))).toEqual([
            'depan',
            'rak-utuh',
        ]);
    });

    it('aktor berjalan memakai kedalaman pecahan', () => {
        expect(actorDepth(1.5, 4)).toBe(5.5);
    });
});

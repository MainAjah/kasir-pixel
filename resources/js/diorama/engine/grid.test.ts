import { describe, expect, it } from 'vite-plus/test';
import { STORE_SCENE, buildGrid } from '../scenes/store-scene';
import { bfs, isWalkable } from './grid';
import type { Grid } from './grid';

const open = (width: number, height: number, blocked: string[] = []): Grid => ({
    width,
    height,
    blocked: new Set(blocked),
});

const isFourWay = (
    path: { gx: number; gy: number }[],
    start: { gx: number; gy: number },
) =>
    path.every((step, i) => {
        const prev = i === 0 ? start : path[i - 1];

        return Math.abs(step.gx - prev.gx) + Math.abs(step.gy - prev.gy) === 1;
    });

describe('bfs', () => {
    it('mengembalikan jalur terpendek 4 arah tanpa titik awal', () => {
        const path = bfs(open(5, 5), { gx: 0, gy: 0 }, { gx: 2, gy: 1 });

        expect(path).toHaveLength(3);
        expect(path?.at(-1)).toEqual({ gx: 2, gy: 1 });
        expect(isFourWay(path ?? [], { gx: 0, gy: 0 })).toBe(true);
    });

    it('mengembalikan daftar kosong bila sudah di tujuan', () => {
        expect(bfs(open(3, 3), { gx: 1, gy: 1 }, { gx: 1, gy: 1 })).toEqual([]);
    });

    it('memutari tile terlarang', () => {
        // Dinding di kolom 1 dengan celah hanya di baris 2.
        const grid = open(3, 3, ['1,0', '1,1']);
        const path = bfs(grid, { gx: 0, gy: 0 }, { gx: 2, gy: 0 });

        expect(path).toEqual([
            { gx: 0, gy: 1 },
            { gx: 0, gy: 2 },
            { gx: 1, gy: 2 },
            { gx: 2, gy: 2 },
            { gx: 2, gy: 1 },
            { gx: 2, gy: 0 },
        ]);
        expect(path?.some((t) => !isWalkable(grid, t.gx, t.gy))).toBe(false);
    });

    it('null bila tujuan terlarang, di luar grid, atau tidak terjangkau', () => {
        expect(
            bfs(open(3, 3, ['2,2']), { gx: 0, gy: 0 }, { gx: 2, gy: 2 }),
        ).toBeNull();
        expect(bfs(open(3, 3), { gx: 0, gy: 0 }, { gx: 3, gy: 0 })).toBeNull();
        expect(
            bfs(
                open(3, 3, ['1,0', '1,1', '1,2']),
                { gx: 0, gy: 0 },
                { gx: 2, gy: 0 },
            ),
        ).toBeNull();
    });

    it('hasilnya selalu sama untuk masukan yang sama', () => {
        const grid = buildGrid(STORE_SCENE);
        const a = bfs(grid, { gx: 0, gy: 7 }, { gx: 9, gy: 1 });
        const b = bfs(grid, { gx: 0, gy: 7 }, { gx: 9, gy: 1 });

        expect(a).toEqual(b);
    });
});

describe('denah toko', () => {
    const grid = buildGrid(STORE_SCENE);
    const door = STORE_SCENE.door.inside;

    it('perabot dan area penjaga terlarang, lorong bebas', () => {
        for (const tile of [
            '2,2',
            '6,2',
            '2,4',
            '6,4',
            '7,0',
            '9,0',
            '9,3',
            '10,3',
            '9,6',
            '10,6',
            '9,5',
            '10,5',
            '9,2',
            '0,0',
            '11,5',
        ]) {
            expect(grid.blocked.has(tile), tile).toBe(true);
        }

        for (const tile of ['0,7', '1,3', '7,2', '8,5', '9,7', '0,8', '11,8']) {
            const [gx, gy] = tile.split(',').map(Number);
            expect(isWalkable(grid, gx, gy), tile).toBe(true);
        }
    });

    it('setiap titik ambil, slot antrean, dan lajur keluar terjangkau dari pintu', () => {
        const targets = [
            ...STORE_SCENE.pickPoints,
            ...STORE_SCENE.queueSlots,
            { gx: 0, gy: STORE_SCENE.exitLaneGy },
        ];

        for (const target of targets) {
            const path = bfs(grid, door, target);
            expect(path, `${target.gx},${target.gy}`).not.toBeNull();
            expect(isFourWay(path ?? [], door)).toBe(true);
        }
    });

    it('titik ambil dan slot antrean tidak bertumpuk', () => {
        const keys = [...STORE_SCENE.pickPoints, ...STORE_SCENE.queueSlots].map(
            (t) => `${t.gx},${t.gy}`,
        );

        expect(new Set(keys).size).toBe(keys.length);
    });
});

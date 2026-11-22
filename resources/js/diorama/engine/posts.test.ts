import { describe, expect, it } from 'vite-plus/test';
import { STORE_SCENE, buildGrid } from '../scenes/store-scene';
import { isPaletteColor } from '../sprites/palette';
import { colorsOf } from '../sprites/pixels';
import {
    inventoryPlaceholderFrame,
    portraitCap,
    portraitMaxHeight,
    portraitScale,
} from '../sprites/post-guard';
import { CANVAS_H, CANVAS_W, tileCenter, tileKey } from './iso';
import { POST_KEYS, postAnchor } from './posts';

describe('pos di denah (5D-2)', () => {
    it('ada dua pos: Kasir di meja kasir 1 dan Inventaris di meja kasir 2', () => {
        expect(POST_KEYS).toEqual(['kasir', 'inventaris']);
        expect(STORE_SCENE.posts.kasir.desk).toBe('kasir-1');
        expect(STORE_SCENE.posts.inventaris.desk).toBe('kasir-2');
        expect(
            STORE_SCENE.furniture.find((f) => f.id === 'kasir-2')?.label,
        ).toBe('Meja Inventaris');
    });

    it('penjaga berdiri di tile terlarang di belakang mejanya, jadi pelanggan tidak menabraknya', () => {
        const grid = buildGrid(STORE_SCENE);

        for (const key of POST_KEYS) {
            const { gx, gy } = STORE_SCENE.posts[key].guard;
            expect(grid.blocked.has(tileKey(gx, gy))).toBe(true);
        }
    });

    it('tombol berada di depan (di bawah) meja dan penjaganya, di dalam kanvas', () => {
        for (const key of POST_KEYS) {
            const anchor = postAnchor(STORE_SCENE, key);
            const guard = STORE_SCENE.posts[key].guard;

            expect(anchor.y).toBeGreaterThan(tileCenter(guard.gx, guard.gy).y);
            expect(anchor.x).toBeGreaterThan(0);
            expect(anchor.x).toBeLessThan(CANVAS_W);
            expect(anchor.y).toBeLessThan(CANVAS_H);
        }
    });

    it('tombol Kasir dan Inventaris tidak bertumpuk', () => {
        const kasir = postAnchor(STORE_SCENE, 'kasir');
        const inventaris = postAnchor(STORE_SCENE, 'inventaris');

        expect(
            Math.abs(kasir.x - inventaris.x) + Math.abs(kasir.y - inventaris.y),
        ).toBeGreaterThan(60);
    });
});

describe('penjaga Inventaris sementara dan potret besar', () => {
    it('sosok pengganti hanya memakai warna palet', () => {
        for (const color of colorsOf(inventoryPlaceholderFrame())) {
            expect(isPaletteColor(color)).toBe(true);
        }
    });

    it('potret diperbesar dengan skala bulat 3× sampai 14×', () => {
        expect(portraitScale(27, 41, 369)).toBe(9);
        expect(portraitScale(19, 46, 369)).toBe(10);
        expect(portraitScale(27, 41, 60)).toBe(3);
        expect(portraitScale(10, 10, 1000)).toBe(14);
        expect(Number.isInteger(portraitScale(37, 46, 233))).toBe(true);
    });

    it('zombie tetap 9× di layar 1366 × 768 (ukuran yang sudah disetujui)', () => {
        const size = portraitMaxHeight(1366, 768);
        const cap = portraitCap(1366, 768);

        expect(portraitScale(27, 41, size, cap)).toBe(9);
    });

    it('gurita (kurus) tampak sebesar zombie: luasnya hampir sama, jadi gurita lebih tinggi', () => {
        for (const [w, h] of [
            [1366, 768],
            [1536, 864],
            [1920, 1080],
        ]) {
            const size = portraitMaxHeight(w, h);
            const cap = portraitCap(w, h);
            const zombie = portraitScale(27, 41, size, cap);
            const gurita = portraitScale(19, 46, size, cap);
            const areaZombie = 27 * 41 * zombie * zombie;
            const areaGurita = 19 * 46 * gurita * gurita;

            expect(46 * gurita).toBeGreaterThan(41 * zombie);
            expect(areaGurita / areaZombie).toBeGreaterThan(0.85);
            expect(areaGurita / areaZombie).toBeLessThan(1.15);
            expect(46 * gurita).toBeLessThanOrEqual(cap);
        }
    });

    it('di layar sempit potret tidak melebihi batasnya, menyisakan tempat untuk kotak dialog', () => {
        const size = portraitMaxHeight(375, 812);
        const cap = portraitCap(375, 812);

        expect(cap).toBeLessThanOrEqual(320);

        for (const [w, h] of [
            [27, 41],
            [19, 46],
            [26, 46],
        ]) {
            expect(h * portraitScale(w, h, size, cap)).toBeLessThanOrEqual(cap);
        }
    });
});

import { describe, expect, it } from 'vite-plus/test';
import { PALETTE, isPaletteColor } from '../sprites/palette';
import { WORLD, WORLD_PALETTE, isWorldColor } from './palette-world';

describe('palet dunia diorama 3D (Tahap 5H)', () => {
    it('berisi 48 sampai 64 warna hex tanpa duplikat', () => {
        expect(WORLD_PALETTE.length).toBeGreaterThanOrEqual(48);
        expect(WORLD_PALETTE.length).toBeLessThanOrEqual(64);
        expect(new Set(WORLD_PALETTE).size).toBe(WORLD_PALETTE.length);

        for (const color of WORLD_PALETTE) {
            expect(color).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it('isWorldColor mengenali warna dunia, tidak peka huruf besar', () => {
        expect(isWorldColor(WORLD['bata-1'].toUpperCase())).toBe(true);
        expect(isWorldColor('#123456')).toBe(false);
    });

    it('palet antarmuka tetap 24 warna yang sama (penjaga)', () => {
        expect(PALETTE).toEqual([
            '#2b2a33',
            '#5b5470',
            '#8f88a8',
            '#fdf8f0',
            '#f7f1e3',
            '#efe2c4',
            '#d9c7a3',
            '#c4ad86',
            '#a7d7a5',
            '#6fae7b',
            '#ffe9a8',
            '#f6c56b',
            '#e89b4f',
            '#e8907e',
            '#c2675a',
            '#f4b6c2',
            '#c9b6e4',
            '#9fd3e6',
            '#6a9fc4',
            '#7a5c4b',
            '#f2c9a5',
            '#c98e6a',
            '#8d5a3f',
            '#3a3d6b',
        ]);
    });

    it('palet dunia terpisah: yang sama dengan palet antarmuka hanya garis dan lampu', () => {
        const shared = Object.entries(WORLD)
            .filter(([, c]) => isPaletteColor(c))
            .map(([name]) => name);

        expect(shared.sort()).toEqual(['garis', 'lampu']);
        expect(PALETTE).toHaveLength(24);
    });
});

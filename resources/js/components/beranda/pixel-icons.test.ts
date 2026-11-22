import { describe, expect, it } from 'vite-plus/test';
import { isPaletteColor } from '@/diorama/sprites/palette';
import { ICON_COLORS, PIXEL_ICONS } from './pixel-icons';

describe('ikon menu Beranda', () => {
    it('semua ikon 12 × 12 dan hanya memakai warna palet', () => {
        for (const [name, rows] of Object.entries(PIXEL_ICONS)) {
            expect(rows, name).toHaveLength(12);

            for (const row of rows) {
                expect(row, name).toHaveLength(12);

                for (const ch of row) {
                    if (ch !== '.') {
                        expect(
                            isPaletteColor(ICON_COLORS[ch]),
                            `${name}: ${ch}`,
                        ).toBe(true);
                    }
                }
            }
        }
    });

    it('ada ikon Pengguna dan Hak akses untuk menu admin (6B)', () => {
        expect(PIXEL_ICONS).toHaveProperty('pengguna');
        expect(PIXEL_ICONS).toHaveProperty('hak-akses');
    });
});

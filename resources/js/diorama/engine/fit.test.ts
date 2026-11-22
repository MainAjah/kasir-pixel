import { describe, expect, it } from 'vite-plus/test';
import { backdropColor } from '../render/lighting';
import { C } from '../sprites/palette';
import { screenScale } from './fit';

describe('screenScale (Beranda layar penuh)', () => {
    it('memakai kelipatan bulat bila pas', () => {
        expect(screenScale(1536, 864)).toBe(2);
        expect(screenScale(768, 432)).toBe(1);
    });

    it('dibatasi sisi yang lebih sempit', () => {
        // Layar tinggi sempit: lebar yang membatasi.
        expect(screenScale(768, 2000)).toBe(1);
        // Layar lebar pendek: tinggi yang membatasi.
        expect(screenScale(3000, 864)).toBe(2);
    });

    it('menurunkan ke kelipatan bulat piksel layar bila masih mengisi ≥ 90%', () => {
        // 1600 × 900, dpr 1: muat 2,08 → 2 (96%).
        expect(screenScale(1600, 900)).toBe(2);
        // dpr 1,25: 1280 × 720 muat 1,667 = 2,08 piksel layar → 2 (96%) → 1,6 css.
        expect(screenScale(1280, 720, 1.25)).toBeCloseTo(1.6);
        // dpr 1,25: 1366 × 768 = 2,22 piksel layar, 2 hanya 89,9% → tetap pecahan.
        expect(screenScale(1366, 768, 1.25)).toBeCloseTo(1366 / 768);
    });

    it('memakai skala pecahan bila kelipatan bulat terlalu kecil', () => {
        // 1300 × 800: muat 1,69, kelipatan bulat 1 hanya 59%.
        expect(screenScale(1300, 800)).toBeCloseTo(1300 / 768);
    });

    it('nol bila wadah belum punya ukuran', () => {
        expect(screenScale(0, 0)).toBe(0);
    });
});

describe('backdropColor', () => {
    it('siang sama dengan latar kanvas', () => {
        expect(backdropColor('siang')).toBe(C(4));
    });

    it('senja dan malam makin gelap ke biru malam', () => {
        const lum = (hex: string) =>
            [16, 8, 0].reduce(
                (s, sh) => s + ((parseInt(hex.slice(1), 16) >> sh) & 255),
                0,
            );

        expect(lum(backdropColor('senja'))).toBeLessThan(lum(C(4)));
        expect(lum(backdropColor('malam'))).toBeLessThan(
            lum(backdropColor('senja')),
        );
        expect(backdropColor('malam')).toMatch(/^#[0-9a-f]{6}$/);
    });
});

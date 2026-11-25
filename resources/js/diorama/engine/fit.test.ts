import { describe, expect, it } from 'vite-plus/test';
import {
    VIGNETTE_ALPHA,
    WARM_TINT,
    backdropColor,
    vignette,
    warmTint,
} from '../render/lighting';
import { C, M } from '../sprites/palette';
import { ROOM_SCHEME } from '../sprites/room-sprite';
import { screenScale } from './fit';

// Kanvas dasar 768 × 480 (Tahap 5F).
describe('screenScale (Beranda layar penuh)', () => {
    it('memakai kelipatan bulat bila pas', () => {
        expect(screenScale(1536, 960)).toBe(2);
        expect(screenScale(768, 480)).toBe(1);
    });

    it('dibatasi sisi yang lebih sempit', () => {
        // Layar tinggi sempit: lebar yang membatasi.
        expect(screenScale(768, 2000)).toBe(1);
        // Layar lebar pendek: tinggi yang membatasi.
        expect(screenScale(3000, 960)).toBe(2);
    });

    it('menurunkan ke kelipatan bulat piksel layar bila masih mengisi ≥ 90%', () => {
        // 1600 × 1000, dpr 1: muat 2,08 → 2 (96%).
        expect(screenScale(1600, 1000)).toBe(2);
        // dpr 1,25: 1280 × 800 muat 1,667 = 2,08 piksel layar → 2 (96%) → 1,6 css.
        expect(screenScale(1280, 800, 1.25)).toBeCloseTo(1.6);
        // dpr 1,25: 1366 × 860 = 2,22 piksel layar, 2 hanya 89,9% → tetap pecahan.
        expect(screenScale(1366, 860, 1.25)).toBeCloseTo(1366 / 768);
    });

    it('memakai skala pecahan bila kelipatan bulat terlalu kecil', () => {
        // 1300 × 820: muat 1,69, kelipatan bulat 1 hanya 59%.
        expect(screenScale(1300, 820)).toBeCloseTo(1300 / 768);
        // Layar 1366 × 768: tinggi yang membatasi (768 / 480 = 1,6).
        expect(screenScale(1366, 768)).toBeCloseTo(1.6);
    });

    it('nol bila wadah belum punya ukuran', () => {
        expect(screenScale(0, 0)).toBe(0);
    });
});

describe('backdropColor', () => {
    it('latar gelap hangat sama dengan latar kanvas (Tahap 5G)', () => {
        expect(ROOM_SCHEME.background).toBe(M('latar'));
        expect(backdropColor('siang')).toBe(M('latar'));
        // Senja dan malam ikut lapisan malam seperti seluruh kanvas.
        expect(backdropColor('malam')).not.toBe(M('latar'));
        expect(backdropColor('malam')).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('latar terang tetap makin gelap ke biru malam saat senja dan malam', () => {
        const lum = (hex: string) =>
            [16, 8, 0].reduce(
                (s, sh) => s + ((parseInt(hex.slice(1), 16) >> sh) & 255),
                0,
            );

        expect(backdropColor('siang', C(4))).toBe(C(4));
        expect(lum(backdropColor('senja', C(4)))).toBeLessThan(lum(C(4)));
        expect(lum(backdropColor('malam', C(4)))).toBeLessThan(
            lum(backdropColor('senja', C(4))),
        );
        expect(backdropColor('malam', C(4))).toMatch(/^#[0-9a-f]{6}$/);
    });
});

describe('rona hangat Beranda (Tahap 5G)', () => {
    it('siang dan senja saja, senja lebih pekat; malam tidak ada', () => {
        expect(warmTint('siang')).toContain('rgba(240, 140, 90');
        expect(WARM_TINT.senja).toBeGreaterThan(WARM_TINT.siang);
        expect(warmTint('malam')).toBeNull();
    });
});

describe('vinyet Beranda', () => {
    it('makin pekat dari siang ke malam, tengahnya bening', () => {
        expect(VIGNETTE_ALPHA.siang).toBeLessThan(VIGNETTE_ALPHA.senja);
        expect(VIGNETTE_ALPHA.senja).toBeLessThan(VIGNETTE_ALPHA.malam);
        expect(vignette('malam')).toContain(`${VIGNETTE_ALPHA.malam})`);
        expect(vignette('siang')).toContain('0) 55%');
    });
});

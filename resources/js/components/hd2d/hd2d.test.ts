import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import {
    blend,
    contrastRatio,
    moveActive,
    nextTabIndex,
    sliceChars,
    typedLength,
} from './logic';
import { HD_COLORS, HD_PANEL_ALPHA, cssVarName } from './tokens';
import type { HdColor } from './tokens';

const css = readFileSync(
    new URL('../../../css/hd2d.css', import.meta.url),
    'utf8',
);

describe('token desain HD-2D (Tahap B1)', () => {
    it('nilai warna TS sama dengan variabel CSS', () => {
        for (const key of Object.keys(HD_COLORS) as HdColor[]) {
            expect(css).toContain(`${cssVarName(key)}: ${HD_COLORS[key]};`);
        }
    });

    it('palet sesuai spesifikasi pemilik', () => {
        expect(HD_COLORS).toMatchObject({
            emas: '#e3c27a',
            emasTua: '#b8954f',
            krem: '#f1e8d6',
            kremRedup: '#b9ad95',
            panel: '#0c0d1c',
            merah: '#e57a6a',
            hijau: '#9fd39a',
        });
        expect(HD_PANEL_ALPHA).toBeCloseTo(0.86);
        expect(cssVarName('kremRedup')).toBe('--hd-krem-redup');
    });

    it('teks di atas panel tetap ≥ 4,5:1 walau latar di belakangnya putih', () => {
        // Kasus terburuk: panel 0,86 di atas cahaya paling terang di adegan.
        const panel = blend(HD_COLORS.panel, HD_PANEL_ALPHA, '#ffffff');

        for (const key of [
            'krem',
            'kremRedup',
            'emas',
            'merah',
            'hijau',
        ] as const) {
            expect(contrastRatio(HD_COLORS[key], panel)).toBeGreaterThanOrEqual(
                4.5,
            );
        }
    });

    it('teks tombol primer terbaca di seluruh gradasi emas', () => {
        for (const back of ['#f3dca6', HD_COLORS.emas, HD_COLORS.emasTua]) {
            expect(contrastRatio(HD_COLORS.tinta, back)).toBeGreaterThanOrEqual(
                4.5,
            );
        }
    });

    it('teks contoh di kolom isian tetap ≥ 4,5:1', () => {
        const field = blend('#050610', 0.72, HD_COLORS.panel);

        expect(contrastRatio('#8d846f', field)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(HD_COLORS.krem, field)).toBeGreaterThanOrEqual(7);
    });

    it('gerak dikurangi mematikan kedip dan animasi masuk', () => {
        const reduced = css.slice(css.indexOf('prefers-reduced-motion'));

        expect(reduced).toContain('animation: none');
        expect(reduced).toContain('.hd-penjaga__lanjut');
        expect(reduced).toContain(".hd-baris[aria-selected='true']::before");
    });
});

describe('efek mengetik dialog penjaga toko', () => {
    it('bertambah sesuai waktu dan berhenti di panjang kalimat', () => {
        expect(typedLength(20, 0, 45)).toBe(0);
        expect(typedLength(20, 100, 45)).toBe(4);
        expect(typedLength(20, 10_000, 45)).toBe(20);
        expect(typedLength(20, 100, 0)).toBe(0);
    });

    it('memotong per titik kode, bukan per unit UTF-16', () => {
        expect(sliceChars('Halo 😀 kasir', 6)).toBe('Halo 😀');
        expect(Array.from('Halo 😀 kasir')).toHaveLength(12);
    });
});

describe('tab: panah, Home, End', () => {
    it('berputar di ujung dan melewati tab nonaktif', () => {
        expect(nextTabIndex(0, 'ArrowRight', 3)).toBe(1);
        expect(nextTabIndex(2, 'ArrowRight', 3)).toBe(0);
        expect(nextTabIndex(0, 'ArrowLeft', 3)).toBe(2);
        expect(nextTabIndex(0, 'ArrowRight', 3, [false, true, false])).toBe(2);
    });

    it('Home dan End ke tab aktif pertama dan terakhir', () => {
        expect(nextTabIndex(1, 'Home', 4, [true, false, false, false])).toBe(1);
        expect(nextTabIndex(1, 'End', 4, [false, false, false, true])).toBe(2);
    });

    it('tombol lain diabaikan; semua nonaktif tidak ke mana-mana', () => {
        expect(nextTabIndex(0, 'Enter', 3)).toBeNull();
        expect(nextTabIndex(0, 'ArrowRight', 2, [true, true])).toBeNull();
        expect(nextTabIndex(0, 'ArrowRight', 0)).toBeNull();
    });
});

describe('baris aktif di daftar barang', () => {
    it('panah memindah tanpa berputar dan berhenti di ujung', () => {
        expect(moveActive(0, 1, 3)).toBe(1);
        expect(moveActive(2, 1, 3)).toBe(2);
        expect(moveActive(0, -1, 3)).toBe(0);
    });

    it('dari belum ada pilihan, panah bawah ke atas daftar dan sebaliknya', () => {
        expect(moveActive(-1, 1, 5)).toBe(0);
        expect(moveActive(-1, -1, 5)).toBe(4);
        expect(moveActive(3, 1, 0)).toBe(-1);
    });
});

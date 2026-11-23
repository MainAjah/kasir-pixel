import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const read = (path: string) =>
    readFileSync(resolve(__dirname, '../../../', path), 'utf8');

const svg = read('images/kopi-serat.svg');
const css = read('css/app.css');

/** Warna kopi yang disetujui pemilik, diambil dari token --color-kopi-* di app.css. */
const KOPI = new Set(
    [...css.matchAll(/--color-kopi[\w-]*:\s*(#[0-9a-f]{6})/gi)].map((m) =>
        m[1].toLowerCase(),
    ),
);

describe('serat kayu menu samping kopi (5E-1)', () => {
    it('ada 9 warna kopi di app.css', () => {
        expect(KOPI.size).toBe(9);
    });

    it('ubin hanya memakai warna kopi', () => {
        const fills = [...svg.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map((m) =>
            m[1].toLowerCase(),
        );

        expect(fills.length).toBeGreaterThan(1);

        for (const fill of fills) {
            expect(KOPI.has(fill)).toBe(true);
        }
    });

    it('ubin 64 × 96 dengan tepi tajam', () => {
        expect(svg).toContain('viewBox="0 0 64 96"');
        expect(svg).toContain('shape-rendering="crispEdges"');
    });
});

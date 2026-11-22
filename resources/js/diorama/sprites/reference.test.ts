import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { createCustomer } from '../actors/customer';
import { customerCharacter, headingOf } from '../render/placeholder-renderer';
import { CUSTOMER_ACTIONS, FRAME_COUNT } from './customer-sprite';
import { isPaletteColor } from './palette';
import { colorsOf, createMatrix, fillRect } from './pixels';
import type { PixelMatrix } from './pixels';
import {
    MOTIONS,
    PAD_TOP,
    PAD_X,
    REFERENCE_CHARACTERS,
    mapToPalette,
    matrixFromRgba,
    motionFrame,
    reduceColors,
    referenceByKey,
    referenceFlip,
    referenceFrameSize,
    transformFrame,
} from './reference-sprite';
import type { MotionProfile } from './reference-sprite';

/** Gambar uji 6 × 10: badan merah, kaki biru di dua baris bawah. */
function figure(): PixelMatrix {
    const m = createMatrix(6, 10);
    fillRect(m, 0, 0, 6, 8, '#cc3333');
    fillRect(m, 1, 8, 4, 2, '#3355cc');

    return m;
}

function bounds(m: PixelMatrix) {
    let top = Infinity;
    let bottom = -1;
    let left = Infinity;

    for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
            if (m.pixels[y * m.width + x]) {
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
                left = Math.min(left, x);
            }
        }
    }

    return { top, bottom, height: bottom - top + 1, left };
}

const rowLeft = (m: PixelMatrix, y: number) =>
    m.pixels.slice(y * m.width, (y + 1) * m.width).findIndex((p) => p !== null);

describe('transformasi gambar karakter', () => {
    const T = { dy: 0, stretch: 0, widen: 0, lean: 0 };

    it('tanpa transformasi: gambar utuh, kaki di baris terbawah, di tengah bingkai', () => {
        const src = figure();
        const out = transformFrame(src, T);
        const size = referenceFrameSize(src);

        expect([out.width, out.height]).toEqual([6 + PAD_X * 2, 10 + PAD_TOP]);
        expect(bounds(out).bottom).toBe(size.footY);
        expect(bounds(out).height).toBe(10);
        expect(colorsOf(out)).toEqual(colorsOf(src));
    });

    it('memanjang dan memipih mengubah tinggi, kaki tetap menapak', () => {
        const src = figure();

        expect(bounds(transformFrame(src, { ...T, stretch: 2 })).height).toBe(
            12,
        );
        expect(bounds(transformFrame(src, { ...T, stretch: -2 })).height).toBe(
            8,
        );
        expect(bounds(transformFrame(src, { ...T, stretch: -2 })).bottom).toBe(
            referenceFrameSize(src).footY,
        );
    });

    it('naik-turun menggeser seluruh tokoh', () => {
        const src = figure();

        expect(bounds(transformFrame(src, { ...T, dy: -3 })).bottom).toBe(
            referenceFrameSize(src).footY - 3,
        );
    });

    it('miring menggeser kepala, kaki tetap di tempat', () => {
        const src = figure();
        const plain = transformFrame(src, T);
        const lean = transformFrame(src, { ...T, lean: -3 });
        const footY = referenceFrameSize(src).footY;
        const topY = bounds(plain).top;

        expect(rowLeft(lean, footY)).toBe(rowLeft(plain, footY));
        expect(rowLeft(lean, topY)).toBe(rowLeft(plain, topY) - 3);
    });

    it('tetap tajam: tidak ada warna baru', () => {
        const src = figure();
        const out = transformFrame(src, {
            dy: -1,
            stretch: 3,
            widen: -2,
            lean: 2,
        });

        expect([...colorsOf(out)].every((c) => colorsOf(src).has(c))).toBe(
            true,
        );
    });
});

describe('titik pijak', () => {
    it('mengikuti letak kaki, bukan tengah gambar', () => {
        // Badan di kiri, kaki di kanan (seperti zombie yang membungkuk).
        const m = createMatrix(10, 8);
        fillRect(m, 0, 0, 6, 5, '#cc3333');
        fillRect(m, 6, 5, 4, 3, '#3355cc');

        expect(referenceFrameSize(m).footX).toBe(PAD_X + 8);
    });
});

describe('profil gerak cara 1', () => {
    it('jumlah bingkai sama dengan pelanggan buatan kode', () => {
        for (const profile of Object.keys(MOTIONS) as MotionProfile[]) {
            for (const action of CUSTOMER_ACTIONS) {
                expect(
                    MOTIONS[profile][action],
                    `${profile} ${action}`,
                ).toHaveLength(FRAME_COUNT[action]);
            }
        }
    });

    it('lari condong ke arah hadap: kiri untuk zombie, kanan untuk bajak laut', () => {
        const zombie = referenceByKey('zombie')!;
        const pirate = referenceByKey('bajak_laut')!;

        for (let f = 0; f < FRAME_COUNT.lari; f++) {
            expect(motionFrame(zombie, 'lari', f).lean).toBeLessThan(0);
            expect(motionFrame(pirate, 'lari', f).lean).toBeGreaterThan(0);
        }
    });

    it('cermin agar tokoh menghadap ke arah jalannya', () => {
        const zombie = referenceByKey('zombie')!;
        const pirate = referenceByKey('bajak_laut')!;

        expect(referenceFlip(zombie, true)).toBe(false);
        expect(referenceFlip(zombie, false)).toBe(true);
        expect(referenceFlip(pirate, true)).toBe(true);
        expect(referenceFlip(pirate, false)).toBe(false);
    });
});

describe('daftar karakter', () => {
    it('sembilan karakter, penjaganya zombie (kasir) dan gurita (inventaris), semua gambarnya ada', () => {
        expect(REFERENCE_CHARACTERS).toHaveLength(9);
        expect(
            REFERENCE_CHARACTERS.filter((c) => c.role === 'penjaga').map(
                (c) => c.key,
            ),
        ).toEqual(['zombie', 'inventaris']);

        for (const c of REFERENCE_CHARACTERS) {
            const path = fileURLToPath(
                new URL(`./referensi/${c.file}`, import.meta.url),
            );
            expect(existsSync(path), c.file).toBe(true);
        }
    });

    it('semua mulai dari cara 1', () => {
        expect(REFERENCE_CHARACTERS.every((c) => c.approach === 1)).toBe(true);
    });
});

describe('arah hadap', () => {
    it('arah asli tiap gambar', () => {
        const natural = Object.fromEntries(
            REFERENCE_CHARACTERS.map((c) => [c.key, c.natural]),
        );

        expect(natural).toEqual({
            ninja: 'kanan',
            bertopeng: 'kanan',
            bajak_laut: 'kanan',
            monster: 'kiri',
            zirah: 'kanan',
            bintang_laut: 'kiri',
            ikan: 'kiri',
            zombie: 'kiri',
            inventaris: 'depan',
        });
    });

    it('gambar yang menghadap depan tidak pernah dicermin, tetapi condongnya ikut arah jalan', () => {
        const front = {
            ...referenceByKey('ninja')!,
            natural: 'depan' as const,
        };

        expect(referenceFlip(front, true)).toBe(false);
        expect(referenceFlip(front, false)).toBe(false);
        expect(motionFrame(front, 'lari', 0, true).lean).toBeLessThan(0);
        expect(motionFrame(front, 'lari', 0, false).lean).toBeGreaterThan(0);
    });

    it('bintang laut memantul pelan: kepala tidak bergoyang bolak-balik saat berjalan', () => {
        const star = referenceByKey('bintang_laut')!;
        const leans = [0, 1, 2, 3].map(
            (f) => motionFrame(star, 'jalan', f).lean,
        );

        expect(new Set(leans).size).toBe(1);
        expect(Math.abs(leans[0])).toBeLessThanOrEqual(1);
    });

    it('arah tampilan mengikuti tujuan jalan, bukan tiap langkah bertangga', () => {
        const c = createCustomer({
            id: 1,
            kind: 'pembeli',
            saleId: 1,
            look: 0,
            shelvesLeft: 1,
            at: { gx: 3, gy: 3 },
        });
        // Jalur bertangga ke kanan-bawah layar: langkah +gx (kanan) dan +gy (kiri) bergantian.
        c.path = [
            { gx: 4, gy: 3 },
            { gx: 4, gy: 4 },
            { gx: 5, gy: 4 },
            { gx: 5, gy: 5 },
            { gx: 6, gy: 5 },
        ];
        c.facing = 'sw';

        // Tujuan (6,5): layar x naik 1, layar y naik 5 → ke kanan, mendekat.
        expect(headingOf(c)).toEqual({ left: false, front: true });
    });

    it('seri ke kiri-kanan memakai arah sebelumnya; berdiri mengikuti arah hadap', () => {
        const c = createCustomer({
            id: 1,
            kind: 'pembeli',
            saleId: 1,
            look: 0,
            shelvesLeft: 1,
            at: { gx: 3, gy: 3 },
        });
        c.path = [
            { gx: 4, gy: 3 },
            { gx: 4, gy: 4 },
        ];

        expect(headingOf(c, { left: true, front: false }).left).toBe(true);
        expect(headingOf(c, { left: false, front: false }).left).toBe(false);

        c.path = [];
        c.facing = 'ne';
        expect(headingOf(c, { left: true, front: true })).toEqual({
            left: false,
            front: false,
        });
    });

    it('keluar menuju pintu: ke kiri dan menjauh', () => {
        const c = createCustomer({
            id: 1,
            kind: 'pembeli',
            saleId: 1,
            look: 0,
            shelvesLeft: 0,
            at: { gx: 9, gy: 7 },
        });
        c.path = [
            { gx: 9, gy: 8 },
            { gx: 0, gy: 8 },
            { gx: 0, gy: 7 },
            { gx: -1, gy: 7 },
        ];

        expect(headingOf(c)).toEqual({ left: true, front: false });
    });
});

describe('karakter pelanggan di diorama', () => {
    it('ketujuh karakter pemilik bergiliran, lalu satu pelanggan buatan kode', () => {
        const keys = Array.from(
            { length: 16 },
            (_, i) => customerCharacter({ id: i + 1 })?.key ?? 'kode',
        );

        expect(keys.slice(0, 8)).toEqual([
            'ninja',
            'bertopeng',
            'bajak_laut',
            'monster',
            'zirah',
            'bintang_laut',
            'ikan',
            'kode',
        ]);
        expect(keys.slice(8)).toEqual(keys.slice(0, 8));
        expect(keys).not.toContain('zombie');
        expect(keys).not.toContain('inventaris');
    });
});

describe('warna', () => {
    it('RGBA → matriks: alfa rendah transparan', () => {
        const m = matrixFromRgba([255, 0, 0, 255, 0, 255, 0, 10], 2, 1);

        expect(m.pixels).toEqual(['#ff0000', null]);
    });

    it('merapikan ke paling banyak k warna tanpa mengubah bentuk', () => {
        const m = createMatrix(20, 1);
        m.pixels = m.pixels.map(
            (_, i) => `#${(100 + i).toString(16)}${(40 + i).toString(16)}30`,
        );
        const reduced = reduceColors(m, 4);

        expect(colorsOf(reduced).size).toBeLessThanOrEqual(4);
        expect(reduced.pixels.map((p) => p !== null)).toEqual(
            m.pixels.map((p) => p !== null),
        );
    });

    it('dipaksa ke palet: hanya warna palet', () => {
        const mapped = mapToPalette(figure());

        expect([...colorsOf(mapped)].every(isPaletteColor)).toBe(true);
    });
});

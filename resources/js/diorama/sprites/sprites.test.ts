import { describe, expect, it } from 'vite-plus/test';
import { createCustomer } from '../actors/customer';
import { customerAction } from '../render/placeholder-renderer';
import {
    CUSTOMER_ACTIONS,
    FRAME_COUNT,
    FRAME_H,
    FRAME_W,
    HAIRS,
    PANTS,
    SHIRTS,
    SKINS,
    buildCustomerFrame,
    frameAt,
    sideForFacing,
    variantForLook,
    variantKey,
} from './customer-sprite';
import type { CustomerVariant, SpriteSide } from './customer-sprite';
import { M, PALETTE, isPaletteColor, isSceneColor } from './palette';
import { colorsOf, mirror } from './pixels';
import type { PixelMatrix } from './pixels';
import { PRODUCTS, RACK_FILLS, drawRackSlice } from './rack-sprite';
import type { RackFill } from './rack-sprite';

const SIDES: SpriteSide[] = ['depan', 'belakang'];
const BASE: CustomerVariant = { skin: 0, hair: 0, shirt: 0, pants: 0 };

const allVariants = (): CustomerVariant[] => {
    const list: CustomerVariant[] = [];

    for (let skin = 0; skin < SKINS.length; skin++) {
        for (let hair = 0; hair < HAIRS.length; hair++) {
            for (let shirt = 0; shirt < SHIRTS.length; shirt++) {
                for (let pants = 0; pants < PANTS.length; pants++) {
                    list.push({ skin, hair, shirt, pants });
                }
            }
        }
    }

    return list;
};

const bottomRowFilled = (m: PixelMatrix) =>
    m.pixels.slice((m.height - 1) * m.width).some((p) => p !== null);

const same = (a: PixelMatrix, b: PixelMatrix) =>
    a.pixels.every((p, i) => p === b.pixels[i]);

describe('palet', () => {
    it('24 warna, sesuai rancangan', () => {
        expect(PALETTE).toHaveLength(24);
        expect(new Set(PALETTE).size).toBe(24);
    });
});

describe('sprite pelanggan', () => {
    it('semua variasi, sisi, gerakan, dan bingkai hanya memakai warna palet', () => {
        const used = new Set<string>();

        for (const variant of allVariants()) {
            for (const side of SIDES) {
                for (const action of CUSTOMER_ACTIONS) {
                    for (let f = 0; f < FRAME_COUNT[action]; f++) {
                        colorsOf(
                            buildCustomerFrame(variant, side, action, f),
                        ).forEach((c) => used.add(c));
                    }
                }
            }
        }

        expect([...used].filter((c) => !isPaletteColor(c))).toEqual([]);
    });

    it('ukuran bingkai tetap dan tiap bingkai berisi gambar', () => {
        for (const side of SIDES) {
            for (const action of CUSTOMER_ACTIONS) {
                for (let f = 0; f < FRAME_COUNT[action]; f++) {
                    const m = buildCustomerFrame(BASE, side, action, f);

                    expect([m.width, m.height]).toEqual([FRAME_W, FRAME_H]);
                    expect(colorsOf(m).size).toBeGreaterThan(5);
                }
            }
        }
    });

    it('jalan, lari, dan ambil benar-benar bergerak: bingkainya berbeda-beda', () => {
        for (const side of SIDES) {
            for (const action of ['jalan', 'lari', 'ambil'] as const) {
                const frames = Array.from(
                    { length: FRAME_COUNT[action] },
                    (_, f) => buildCustomerFrame(BASE, side, action, f),
                );

                expect(same(frames[0], frames[1]), `${side} ${action}`).toBe(
                    false,
                );
            }
        }
    });

    it('kaki menapak lantai saat diam, jalan, dan ambil; melayang sesaat saat lari', () => {
        for (const side of SIDES) {
            for (const action of ['diam', 'jalan', 'ambil'] as const) {
                for (let f = 0; f < FRAME_COUNT[action]; f++) {
                    expect(
                        bottomRowFilled(
                            buildCustomerFrame(BASE, side, action, f),
                        ),
                    ).toBe(true);
                }
            }

            const run = Array.from({ length: FRAME_COUNT.lari }, (_, f) =>
                bottomRowFilled(buildCustomerFrame(BASE, side, 'lari', f)),
            );
            expect(run).toEqual([true, false, true, false]);
        }
    });

    it('depan dan belakang berbeda (wajah hanya di depan)', () => {
        // Baju hijau, supaya merah muda hanya mungkin berasal dari pipi.
        const green: CustomerVariant = { ...BASE, shirt: 2 };
        const front = buildCustomerFrame(green, 'depan', 'diam', 0);
        const back = buildCustomerFrame(green, 'belakang', 'diam', 0);

        expect(same(front, back)).toBe(false);
        // Pipi merah muda hanya ada di gambar depan.
        expect(colorsOf(front).has(PALETTE[15])).toBe(true);
        expect(colorsOf(back).has(PALETTE[15])).toBe(false);
    });

    it('tukar palet hanya mengganti warna, bukan bentuk', () => {
        const a = buildCustomerFrame(BASE, 'depan', 'jalan', 1);
        const b = buildCustomerFrame(
            { skin: 2, hair: 4, shirt: 3, pants: 1 },
            'depan',
            'jalan',
            1,
        );

        expect(a.pixels.map((p) => p !== null)).toEqual(
            b.pixels.map((p) => p !== null),
        );
        expect(same(a, b)).toBe(false);
    });

    it('nomor tampilan memberi variasi yang tetap dan beragam', () => {
        expect(variantForLook(5)).toEqual(variantForLook(5));

        const keys = new Set(
            Array.from({ length: 24 }, (_, look) =>
                variantKey(variantForLook(look)),
            ),
        );
        expect(keys.size).toBeGreaterThanOrEqual(12);

        for (let look = 0; look < 50; look++) {
            const v = variantForLook(look);
            expect(v.skin).toBeLessThan(SKINS.length);
            expect(v.hair).toBeLessThan(HAIRS.length);
            expect(v.shirt).toBeLessThan(SHIRTS.length);
            expect(v.pants).toBeLessThan(PANTS.length);
        }
    });

    it('arah hadap: depan untuk sw dan se (cermin), belakang untuk ne dan nw (cermin)', () => {
        expect(sideForFacing('sw')).toEqual({ side: 'depan', flip: false });
        expect(sideForFacing('se')).toEqual({ side: 'depan', flip: true });
        expect(sideForFacing('ne')).toEqual({ side: 'belakang', flip: false });
        expect(sideForFacing('nw')).toEqual({ side: 'belakang', flip: true });

        const m = buildCustomerFrame(BASE, 'depan', 'jalan', 0);
        expect(same(mirror(mirror(m)), m)).toBe(true);
        expect(same(mirror(m), m)).toBe(false);
    });

    it('bingkai berputar menurut waktu', () => {
        expect(frameAt('jalan', 0)).toBe(0);
        expect(frameAt('jalan', 1 / 8)).toBe(1);
        expect(frameAt('jalan', 4 / 8)).toBe(0);
        expect(frameAt('diam', 0.6)).toBe(1);
    });

    it('gerakan dari state mesin: diam, jalan, lari saat kabur atau kejar, ambil', () => {
        const c = createCustomer({
            id: 1,
            kind: 'pembeli',
            saleId: 1,
            look: 0,
            shelvesLeft: 1,
            at: { gx: 0, gy: 7 },
        });

        expect(customerAction(c)).toBe('diam');
        c.path = [{ gx: 1, gy: 7 }];
        expect(customerAction(c)).toBe('jalan');
        c.speed = 3;
        expect(customerAction(c)).toBe('lari');
        c.path = [];
        c.state = 'ambil';
        expect(customerAction(c)).toBe('ambil');
    });
});

/** Konteks kanvas palsu: mencatat warna setiap fillRect. */
function recorder() {
    const pixels = new Map<string, string>();
    const ctx = {
        fillStyle: '#000000',
        fillRect(x: number, y: number, w: number, h: number) {
            for (let yy = y; yy < y + h; yy++) {
                for (let xx = x; xx < x + w; xx++) {
                    pixels.set(`${xx},${yy}`, String(this.fillStyle));
                }
            }
        },
    };

    return { ctx: ctx as unknown as CanvasRenderingContext2D, pixels };
}

function rack(fill: RackFill, seed = 3) {
    const { ctx, pixels } = recorder();
    drawRackSlice(ctx, 32, 33, fill, seed);

    return pixels;
}

describe('sprite rak', () => {
    it('hanya memakai palet 24 + palet bahan; badan walnut berlis kuningan (Tahap 5G)', () => {
        for (const fill of RACK_FILLS) {
            const colors = new Set(rack(fill).values());

            expect([...colors].filter((c) => !isSceneColor(c))).toEqual([]);
            expect(colors.has(M('walnut-5'))).toBe(true);
            expect(colors.has(M('kuningan'))).toBe(true);
        }
    });

    it('makin banyak stok, makin banyak barang di rak', () => {
        // Warna badan barang (bukan kayu, papan, bayangan, atau label).
        const bodies = PRODUCTS.map(([body]) => body);
        const goods = (fill: RackFill) =>
            [...rack(fill).values()].filter((c) => bodies.includes(c)).length;
        const counts = RACK_FILLS.map(goods);

        expect(counts[0]).toBe(0);
        expect(counts[1]).toBeGreaterThan(counts[0]);
        expect(counts[2]).toBeGreaterThan(counts[1]);
        expect(counts[3]).toBeGreaterThan(counts[2]);
    });

    it('tata letak barang tetap untuk benih yang sama, berbeda untuk benih lain', () => {
        const key = (m: Map<string, string>) =>
            [...m.entries()]
                .map(([at, color]) => `${at}=${color}`)
                .sort((a, b) => a.localeCompare(b))
                .join(';');

        expect(key(rack('penuh', 3))).toBe(key(rack('penuh', 3)));
        expect(key(rack('penuh', 3))).not.toBe(key(rack('penuh', 4)));
    });
});

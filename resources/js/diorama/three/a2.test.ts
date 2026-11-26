import { describe, expect, it } from 'vite-plus/test';
import { createCustomer } from '../actors/customer';
import { packAtlas } from '../assets/atlas';
import {
    COUNTER_TEXELS,
    FRIDGE_TEXELS,
    GOODS,
    RACK_TEXELS,
    fridgeFrontTexture,
    rackFrontTexture,
} from '../assets/procedural/furniture';
import {
    A2_DECOR,
    A2_FURNITURE,
    decorKey,
    fillEntries,
    furnitureEntries,
    furnitureKey,
    storeEntries,
} from '../assets/procedural-source';
import { ShelfAllocator } from '../assets/shelf-allocator';
import { fillKey, shelfFills } from '../engine/shelves';
import { STORE_SCENE } from '../scenes/store-scene';
import { WALL_DECOR, lampMatrix } from '../sprites/decor-sprite';
import { createMatrix, setPixel } from '../sprites/pixels';
import type { PixelMatrix } from '../sprites/pixels';
import { isPaletteColor } from '../sprites/palette';
import { customerSprite, footOf, plantSprite, zombieSprite } from './actors';
import { decorCorners, furnitureBox, plantTop } from './build-furniture';
import { buildFurniture } from './build-furniture';
import { buildStore } from './build-store';
import { cameraBasis, projectOrtho } from './camera-math';
import { W, isWorldColor } from './palette-world';
import { TEXEL_V } from './space';
import { rectToNdc, spriteRect } from './sprite-quad';

const item = (id: string) => STORE_SCENE.furniture.find((f) => f.id === id)!;

function goodsCount(m: PixelMatrix): number {
    const bodies = new Set(GOODS.map(([body]) => body));

    return m.pixels.filter((p) => p !== null && bodies.has(p)).length;
}

describe('tekstur perabot (Tahap 5H a2)', () => {
    it('setinggi perabot di denah: rak 32, meja 28, kulkas 76 piksel', () => {
        expect(RACK_TEXELS).toBe(item('rak-a').height);
        expect(COUNTER_TEXELS).toBe(item('kasir-1').height);
        expect(FRIDGE_TEXELS).toBe(item('vending-merah').height);
    });

    it('hanya palet dunia; lampu memakai gambar 5C (palet 24) apa adanya', () => {
        const fills = shelfFills(
            { rak: ['penuh'], vending: ['penuh'] },
            STORE_SCENE,
        );

        for (const e of furnitureEntries(
            STORE_SCENE,
            A2_FURNITURE,
            A2_DECOR,
            fills,
        )) {
            for (const c of new Set(e.matrix.pixels)) {
                if (c === null) {
                    continue;
                }

                if (e.key === decorKey('lampu-kanan')) {
                    expect(isPaletteColor(c), `${e.key} ${c}`).toBe(true);
                } else {
                    expect(isWorldColor(c), `${e.key} ${c}`).toBe(true);
                }
            }
        }

        expect(
            furnitureEntries(STORE_SCENE, [], A2_DECOR).find(
                (e) => e.key === decorKey('lampu-kanan'),
            )?.matrix,
        ).toEqual(lampMatrix(false));
    });

    it('isi rak mengikuti stok: makin penuh makin banyak barang, letak barang tetap', () => {
        const counts = (
            ['kosong', 'sedikit', 'setengah', 'penuh'] as const
        ).map((f) => goodsCount(rackFrontTexture([f, f, f, f, f], 9)));

        expect(counts[0]).toBe(0);
        expect(counts[1]).toBeGreaterThan(0);
        expect(counts[2]).toBeGreaterThan(counts[1]);
        expect(counts[3]).toBeGreaterThan(counts[2]);

        // Potongan yang sama penuh menghasilkan piksel yang sama walau potongan lain berubah.
        const a = rackFrontTexture(['penuh', 'kosong'], 9);
        const b = rackFrontTexture(['penuh', 'penuh'], 9);
        for (let y = 0; y < RACK_TEXELS; y++) {
            for (let x = 1; x < 15; x++) {
                expect(a.pixels[y * a.width + x]).toBe(
                    b.pixels[y * b.width + x],
                );
            }
        }

        // Kulkas: kaca pintunya sewarna botol kaca, jadi warna kaca tidak dihitung.
        const glass = W('kaca');
        const bottles = (m: PixelMatrix) =>
            m.pixels.filter(
                (p) =>
                    p !== null && p !== glass && GOODS.some(([b]) => b === p),
            ).length;
        expect(bottles(fridgeFrontTexture('kosong', 3))).toBe(0);
        expect(bottles(fridgeFrontTexture('penuh', 3))).toBeGreaterThan(0);
    });

    it('ukuran bingkai isi tetap, jadi bisa dilukis ulang di tempat yang sama', () => {
        const kosong = fillEntries(STORE_SCENE, A2_FURNITURE, {});
        const penuh = fillEntries(
            STORE_SCENE,
            A2_FURNITURE,
            shelfFills({ rak: ['penuh'], vending: ['penuh'] }, STORE_SCENE),
        );

        expect(kosong.map((e) => e.key).sort()).toEqual([
            furnitureKey('rak-a', 'depan'),
            furnitureKey('vending-merah', 'depan'),
        ]);
        kosong.forEach((e, i) => {
            expect(penuh[i].key).toBe(e.key);
            expect([e.matrix.width, e.matrix.height]).toEqual([
                penuh[i].matrix.width,
                penuh[i].matrix.height,
            ]);
        });
        const rack = penuh.find(
            (e) => e.key === furnitureKey('rak-a', 'depan'),
        )!;
        expect(rack.matrix.width / 16, 'satu potongan per ubin rak').toBe(
            item('rak-a').w,
        );
        expect(
            fillKey('rak-a', 0) in
                shelfFills({ rak: ['penuh'], vending: [] }, STORE_SCENE),
        ).toBe(true);
    });
});

describe('geometri perabot dan hiasan (Tahap 5H a2)', () => {
    it('kotak perabot sesuai denah; pot di tengah ubinnya', () => {
        expect(furnitureBox(item('rak-a'))).toMatchObject({
            x0: 2,
            x1: 7,
            z0: 2,
            z1: 3,
            y0: 0,
        });
        expect(furnitureBox(item('rak-a')).y1).toBeCloseTo(32 * TEXEL_V);
        const pot = furnitureBox(item('tanaman-1'));
        expect((pot.x0 + pot.x1) / 2).toBe(0.5);
        expect(plantTop(item('tanaman-1'))[1]).toBeCloseTo(pot.y1);
    });

    it('semua perabot masuk satu geometri; mukanya menghadap kamera', () => {
        const entries = [
            ...storeEntries(STORE_SCENE),
            ...furnitureEntries(STORE_SCENE, A2_FURNITURE, A2_DECOR),
        ];
        const layout = packAtlas(
            entries.map((e) => ({
                key: e.key,
                w: e.matrix.width,
                h: e.matrix.height,
            })),
        );
        const arrays = buildStore(STORE_SCENE, layout, (k) => layout.frames[k]);
        const before = arrays.normals.length;
        buildFurniture(
            arrays,
            STORE_SCENE,
            A2_FURNITURE,
            layout,
            (k) => layout.frames[k],
        );
        const { back } = cameraBasis(30);

        expect(arrays.normals.length - before).toBe(A2_FURNITURE.length * 3);
        expect(layout.height).toBeLessThanOrEqual(1024);

        for (const n of arrays.normals) {
            expect(
                n[0] * back[0] + n[1] * back[1] + n[2] * back[2],
            ).toBeGreaterThan(0);
        }
    });

    it('lampu menempel di dinding kanan seperti di Canvas: 1 kolom gambar = 1 piksel layar', () => {
        const lamp = WALL_DECOR.find((d) => d.key === 'lampu-kanan')!;
        const corners = decorCorners('lampu-kanan', 7, 9)!;
        const b = cameraBasis(30);
        const tl = projectOrtho(corners[0], [0, 0, 0], b);
        const tr = projectOrtho(corners[1], [0, 0, 0], b);
        const bl = projectOrtho(corners[3], [0, 0, 0], b);

        expect(tr.x - tl.x).toBeCloseTo(7);
        expect(tl.y - bl.y).toBeCloseTo(9);
        expect(corners[0][1]).toBeCloseTo(lamp.top * TEXEL_V);
        expect(corners[0][2]).toBeGreaterThan(0);
    });
});

describe('sprite karakter (Tahap 5H a2)', () => {
    it('1 piksel gambar = 1 piksel dalam; kaki dibulatkan ke sudut piksel', () => {
        const frame = { w: 32, h: 49, footX: 19, footY: 48 };
        const r = spriteRect({ x: 100.4, y: 50.6 }, frame);

        expect(r.right - r.left).toBe(32);
        expect(r.top - r.bottom).toBe(49);
        expect([r.left, r.right, r.top, r.bottom].every(Number.isInteger)).toBe(
            true,
        );
        // Piksel kaki (19, 48) menempati piksel tepat di kanan-bawah titik pijak (100, 51).
        expect(r.left + 19).toBe(100);
        expect(r.top - 48).toBe(51);
        expect(spriteRect({ x: 100.4, y: 50.6 }, frame, 10).top).toBe(
            r.top + 10,
        );
    });

    it('kotak piksel → NDC gambar dalam', () => {
        expect(
            rectToNdc(
                { left: 0, right: 50, bottom: 25, top: 100 },
                { width: 100, height: 100 },
            ),
        ).toEqual({ left: -1, right: 0, bottom: -0.5, top: 1 });
    });

    it('pelanggan memakai karakter, aksi, dan arah yang sama dengan Canvas', () => {
        const src = createMatrix(20, 46);
        for (let y = 0; y < 46; y++) {
            setPixel(src, 10, y, '#123456');
        }

        const customer = createCustomer({
            id: 1,
            kind: 'pembeli',
            saleId: 1,
            look: 0,
            shelvesLeft: 1,
            at: { gx: 3, gy: 5 },
        });
        const sprite = customerSprite(
            { time: 0 },
            customer,
            (key) => (key === 'ninja' ? src : null),
            new Map(),
        )!;
        const built = sprite.build();

        expect(sprite.key.startsWith('ref|ninja|')).toBe(true);
        expect(sprite.foot).toEqual(footOf(3, 5));
        expect(built.matrix.pixels).toContain('#123456');
        // Gambar asli tidak diskala: tingginya tetap ditambah ruang gerak.
        expect(built.matrix.height).toBe(46 + 8);

        // Di luar pintu (fx < -1) tidak digambar; di ambang memudar.
        customer.fx = -1;
        expect(
            customerSprite({ time: 0 }, customer, () => src, new Map()),
        ).toBeNull();
        customer.fx = -0.5;
        expect(
            customerSprite({ time: 0 }, customer, () => src, new Map())?.alpha,
        ).toBeCloseTo(0.5);
    });

    it('zombie diam di tempat penjaga; tanpa gambar belum digambar', () => {
        const world = {
            time: 0,
            cashier: { fx: 9, fy: 5, facing: 'sw' },
        } as unknown as Parameters<typeof zombieSprite>[0];

        expect(zombieSprite(world, () => null)).toBeNull();
        const s = zombieSprite(world, () => createMatrix(27, 41))!;
        expect(s.key).toContain('|diam|');
        expect(s.foot).toEqual(footOf(9, 5));
        expect(plantSprite(item('tanaman-1'), 1).build().matrix.width).toBe(32);
    });
});

describe('atlas karakter: penempatan bertahap', () => {
    it('tidak tumpang tindih dan null saat penuh', () => {
        const a = new ShelfAllocator(64, 32, 1);
        const spots = [
            a.allocate(20, 10),
            a.allocate(20, 10),
            a.allocate(20, 10),
        ];

        expect(spots.every((s) => s !== null)).toBe(true);
        expect(spots[1]!.x).toBeGreaterThanOrEqual(spots[0]!.x + 22);
        expect(a.allocate(70, 4)).toBeNull();
        expect(a.allocate(20, 20)).toBeNull();
        a.reset();
        expect(a.allocate(20, 10)).toEqual({ x: 1, y: 1 });
    });
});

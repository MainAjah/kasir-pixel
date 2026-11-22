import { CellSections, clearCell } from '@/components/diorama/sprite-cells';
import type { Cell, CellSection } from '@/components/diorama/sprite-cells';
import { isoBox } from '@/diorama/render/pixel';
import {
    counterBagPoint,
    counterDrawerPoint,
    drawCounterSlice,
    formatDisplay,
} from '@/diorama/sprites/counter-sprite';
import type { CounterLook } from '@/diorama/sprites/counter-sprite';
import {
    FOOT_X,
    FOOT_Y,
    buildCustomerFrame,
} from '@/diorama/sprites/customer-sprite';
import type {
    CustomerAction,
    SpriteSide,
} from '@/diorama/sprites/customer-sprite';
import {
    COIN_FRAMES,
    COIN_SPIN,
    arcPoint,
    bagMatrix,
    coinMatrix,
    drawItemBox,
    handOffset,
    productColor,
} from '@/diorama/sprites/goods-sprite';
import type { Point } from '@/diorama/sprites/goods-sprite';
import { C } from '@/diorama/sprites/palette';
import { RACK_CANVAS, drawRackSlice } from '@/diorama/sprites/rack-sprite';
import { SpriteCache } from '@/diorama/sprites/sprite-cache';

const cache = new SpriteCache();
const BASE = { skin: 0, hair: 0, shirt: 2, pants: 0 };

/** Barang contoh yang sama dengan tombol uji di lab. */
const PRODUCTS = [
    'Beras 5 kg',
    'Minyak goreng 1 L',
    'Gula pasir 1 kg',
    'Teh celup',
    'Air mineral 600 ml',
    'Mi instan',
];

function customer(
    ctx: CanvasRenderingContext2D,
    foot: Point,
    side: SpriteSide,
    action: CustomerAction,
    frame: number,
) {
    const canvas = cache.get(`lab-barang|${side}|${action}|${frame}`, () =>
        buildCustomerFrame(BASE, side, action, frame),
    );
    ctx.globalAlpha = 0.25;
    isoBox(ctx, foot.x, foot.y - 6, 12, 12, 0, C(2), null, null);
    ctx.globalAlpha = 1;
    ctx.drawImage(canvas, foot.x - FOOT_X, foot.y - FOOT_Y);
}

function bag(ctx: CanvasRenderingContext2D, p: Point) {
    ctx.drawImage(cache.get('lab-kantong', bagMatrix), p.x - 4, p.y - 1);
}

function coin(ctx: CanvasRenderingContext2D, p: Point, time: number) {
    const frame = Math.floor(time * COIN_SPIN) % COIN_FRAMES;
    const canvas = cache.get(`lab-koin|${frame}`, () => coinMatrix(frame));
    ctx.drawImage(canvas, p.x - Math.floor(canvas.width / 2), p.y - 2);
}

function hand(foot: Point, left: boolean): Point {
    const h = handOffset(null, left);

    return { x: foot.x + h.x, y: foot.y + h.y };
}

// ---- 1. Barang sesuai produk --------------------------------------------------

function productsCell(): Cell {
    const width = PRODUCTS.length * 14 + 6;
    const height = 20;

    return {
        key: 'barang-produk',
        label: `Kiri ke kanan: ${PRODUCTS.join(', ')}`,
        width,
        height,
        draw: (ctx) => {
            clearCell(ctx, width, height);
            PRODUCTS.forEach((name, k) =>
                drawItemBox(ctx, 10 + k * 14, 15, productColor(name)),
            );
        },
    };
}

// ---- 2. Ambil dari rak ----------------------------------------------------------

function pickCell(): Cell {
    const width = 100;
    const height = 84;
    const rack = { x: 62, y: 40 };
    // Pelanggan berdiri di tile depan rak, menghadap rak (dari belakang).
    const foot = { x: rack.x - 32, y: rack.y + 32 };
    const shelf = { x: foot.x + 19, y: foot.y - 10 - 18 };
    const names = ['Teh celup', 'Gula pasir 1 kg'];

    return {
        key: 'barang-ambil',
        label: 'Mengambil dari rak: barang melayang dari papan rak ke tangan, lalu bertumpuk di tangan',
        width,
        height,
        draw: (ctx, time) => {
            clearCell(ctx, width, height);
            isoBox(ctx, foot.x, foot.y - 16, 32, 32, 0, C(9), null, null);
            ctx.drawImage(
                cache.getDrawn(
                    'lab-barang-rak',
                    RACK_CANVAS.width,
                    RACK_CANVAS.height,
                    (c) =>
                        drawRackSlice(
                            c,
                            RACK_CANVAS.originX,
                            RACK_CANVAS.originY,
                            'penuh',
                            5,
                        ),
                ),
                rack.x - RACK_CANVAS.originX,
                rack.y - RACK_CANVAS.originY,
            );

            // Dua kali mengambil (1 detik), lalu diam memegang dua barang.
            const t = time % 2.8;
            const picking = t < 2 ? Math.floor(t) : -1;
            const held = picking === -1 ? 2 : picking;
            const action: CustomerAction = picking === -1 ? 'diam' : 'ambil';
            customer(ctx, foot, 'belakang', action, Math.floor(time * 4) % 2);
            const h = hand(foot, false);

            for (let k = 0; k < held; k++) {
                drawItemBox(ctx, h.x, h.y - k * 6, productColor(names[k]));
            }

            if (picking >= 0) {
                const p = arcPoint(
                    shelf,
                    { x: h.x, y: h.y - held * 6 },
                    t - picking,
                    6,
                );
                drawItemBox(ctx, p.x, p.y, productColor(names[picking]));
            }
        },
    };
}

// ---- 3-5. Di meja kasir ----------------------------------------------------------

const CX = 50;
const TY = 54;
const RIGHT = { x: CX + 32, y: TY + 16 };
/** Pelanggan di titik dilayani (9,7), menghadap meja (dari belakang). */
const SERVED = { x: CX - 32, y: TY + 32 };
const COUNTER_W = 118;
const COUNTER_H = 110;

function counterScene(
    ctx: CanvasRenderingContext2D,
    look: Partial<CounterLook>,
) {
    clearCell(ctx, COUNTER_W, COUNTER_H);
    isoBox(ctx, SERVED.x, SERVED.y - 16, 32, 32, 0, C(9), null, null);
    const full: CounterLook = {
        on: true,
        scan: null,
        beep: false,
        receipt: null,
        display: { text: formatDisplay(312_500), mode: 'harian' },
        ...look,
    };
    drawCounterSlice(ctx, CX, TY, 'kiri', full);
    drawCounterSlice(ctx, RIGHT.x, RIGHT.y, 'kanan', full);
}

function scanCell(): Cell {
    const names = ['Beras 5 kg', 'Teh celup', 'Mi instan'];

    return {
        key: 'barang-scanner',
        label: 'Meluncur di scanner: warna barang mengikuti produk yang sedang dipindai',
        width: COUNTER_W,
        height: COUNTER_H,
        draw: (ctx, time) => {
            const k = Math.floor(time / 0.7) % names.length;
            const progress = (time % 0.7) / 0.7;
            counterScene(ctx, {
                scan: progress,
                beep: progress > 0.85,
                scanColors: productColor(names[k]),
            });
        },
    };
}

function bagCell(): Cell {
    return {
        key: 'barang-kantong',
        label: 'Kantong berpindah dari tumpukan di meja ke tangan pelanggan',
        width: COUNTER_W,
        height: COUNTER_H,
        draw: (ctx, time) => {
            counterScene(ctx, {});
            const t = (time % 1.6) / 0.6;
            customer(ctx, SERVED, 'belakang', 'diam', Math.floor(time * 2) % 2);
            const h = hand(SERVED, false);
            const p =
                t < 1
                    ? arcPoint(counterBagPoint(RIGHT.x, RIGHT.y), h, t, 8)
                    : h;
            bag(ctx, p);
        },
    };
}

function coinCell(): Cell {
    return {
        key: 'barang-koin',
        label: 'Koin berputar terbang ke laci uang, lalu berkilau; layar mini menampilkan total belanja',
        width: COUNTER_W,
        height: COUNTER_H,
        draw: (ctx, time) => {
            const t = (time % 1.4) / 0.7;
            counterScene(ctx, {
                receipt: Math.min(1, t),
                display: { text: formatDisplay(23_500), mode: 'belanja' },
            });
            customer(ctx, SERVED, 'belakang', 'diam', 0);
            const drawer = counterDrawerPoint(RIGHT.x, RIGHT.y);

            if (t < 1) {
                coin(ctx, arcPoint(hand(SERVED, false), drawer, t, 14), time);
            } else if (t < 1.3) {
                ctx.fillStyle = C(4);
                ctx.fillRect(drawer.x, drawer.y - 4, 1, 3);
                ctx.fillRect(drawer.x - 1, drawer.y - 3, 3, 1);
                ctx.fillStyle = C(11);
                ctx.fillRect(drawer.x - 3, drawer.y - 6, 1, 1);
                ctx.fillRect(drawer.x + 3, drawer.y - 5, 1, 1);
            }
        },
    };
}

function coinFramesCell(): Cell {
    const width = COIN_FRAMES * 8 + 2;
    const height = 9;

    return {
        key: 'barang-koin-bingkai',
        label: 'Empat bingkai putaran koin: muka, miring, tepi, miring',
        width,
        height,
        draw: (ctx) => {
            clearCell(ctx, width, height);

            for (let f = 0; f < COIN_FRAMES; f++) {
                const canvas = cache.get(`lab-koin|${f}`, () => coinMatrix(f));
                ctx.drawImage(
                    canvas,
                    4 + f * 8 - Math.floor(canvas.width / 2),
                    2,
                );
            }
        },
    };
}

const SECTIONS: CellSection[] = [
    {
        title: 'Barang bawaan sesuai produk (perbesaran 4×)',
        note: 'Warna kotak dipilih dari nama produk, jadi produk yang sama selalu berwarna sama: di tangan, saat diambil, dan di scanner. Hanya palet 24 warna.',
        cells: [productsCell(), pickCell()],
    },
    {
        title: 'Di meja kasir: scanner, kantong, dan koin (perbesaran 4×)',
        cells: [scanCell(), bagCell(), coinCell(), coinFramesCell()],
    },
];

/** Pratinjau elemen barang bawaan, kantong, dan koin (Tahap 5C elemen 4). */
export default function GoodsLab() {
    return <CellSections sections={SECTIONS} />;
}

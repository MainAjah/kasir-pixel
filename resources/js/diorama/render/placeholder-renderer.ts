/**
 * Renderer gambar pengganti Tahap 5B: kotak isometrik berwarna untuk lantai,
 * dinding, perabot, pelanggan, dan penjaga kasir. Sprite sungguhan menyusul di 5C;
 * yang diuji di sini adalah mesin, jalur, kedalaman, dan urutan gerak.
 *
 * Urutan gambar (rancangan bagian 8): latar (lantai + dinding, dirender sekali),
 * lalu perabot per tile dan aktor menurut kedalaman, lalu antarmuka ("+N").
 */
import { CASHIER_DURATION } from '../actors/cashier';
import type { Customer } from '../actors/customer';
import { DURATION, RUN, isWalking } from '../actors/customer';
import {
    LAYER,
    actorDepth,
    effectDepth,
    sliceFootprint,
    sortDrawItems,
} from '../engine/depth';
import type { DrawItem } from '../engine/depth';
import { CANVAS_H, CANVAS_W, tileCenter, tileTop } from '../engine/iso';
import type { Facing } from '../engine/iso';
import type { DioramaWorld } from '../engine/world';
import type { Furniture, StoreScene } from '../scenes/store-scene';
import {
    FOOT_X,
    FOOT_Y,
    FRAME_W,
    buildCustomerFrame,
    customerBob,
    frameAt,
    variantForLook,
    variantKey,
} from '../sprites/customer-sprite';
import type { CustomerAction } from '../sprites/customer-sprite';
import { mirror } from '../sprites/pixels';
import { RACK_CANVAS, drawRackSlice } from '../sprites/rack-sprite';
import { referenceMatrix } from '../sprites/reference-loader';
import {
    REFERENCE_CHARACTERS,
    cashierMotion,
    motionFrame,
    referenceByKey,
    referenceFlip,
    referenceFrameSize,
    transformFrame,
} from '../sprites/reference-sprite';
import type { ReferenceCharacter } from '../sprites/reference-sprite';
import {
    counterBagPoint,
    counterDrawerPoint,
    drawCounterSlice,
    drawStool,
    formatDisplay,
} from '../sprites/counter-sprite';
import type { CounterLook } from '../sprites/counter-sprite';
import {
    COIN_FRAMES,
    COIN_SPIN,
    arcPoint,
    bagMatrix,
    coinMatrix,
    drawItemBox,
    handOffset,
    productColor,
} from '../sprites/goods-sprite';
import type { GoodsColors, Point } from '../sprites/goods-sprite';
import { C } from '../sprites/palette';
import { drawRoom } from '../sprites/room-sprite';
import {
    VENDING_CANVAS,
    drawVending,
    vendingLightOn,
} from '../sprites/vending-sprite';
import type { VendingColor } from '../sprites/vending-sprite';
import { SpriteCache } from '../sprites/sprite-cache';
import { drawText, isoBox, leftDot, onTop, rightDot, textWidth } from './pixel';

export type RenderOptions = {
    /** Tandai tile terlarang. */
    blocked?: boolean;
    /** Titik-titik jalur tiap pelanggan. */
    paths?: boolean;
    /** Nomor pelanggan di atas kepala. */
    ids?: boolean;
};

const INK = '#2b2a33';
const SHADOW = '#5b5470';
const WHITE = '#fdf8f0';
const SKIN = ['#f2c9a5', '#c98e6a', '#8d5a3f'];
const SHIRTS = [
    '#e8907e',
    '#9fd3e6',
    '#f6c56b',
    '#c9b6e4',
    '#f4b6c2',
    '#a7d7a5',
];

const fl = Math.floor;

/** Warna badan tiap vending machine di denah: merah, biru, hijau. */
const VENDING_COLORS: Record<string, VendingColor> = {
    'vending-merah': 0,
    'vending-biru': 1,
    'vending-hijau': 2,
};

/** Kasir 2: komputer mati, layar bertuliskan TUTUP. */
const CLOSED_COUNTER: CounterLook = {
    on: false,
    scan: null,
    beep: false,
    receipt: null,
    display: { text: 'TUTUP', mode: 'harian' },
};

const CUSTOMER_REFERENCES = REFERENCE_CHARACTERS.filter(
    (c) => c.role === 'pelanggan',
);

/**
 * Karakter pelanggan (keputusan D6): ketujuh karakter dari gambar pemilik
 * bergiliran menurut nomor pelanggan, dan setiap giliran kedelapan pelanggan
 * buatan kode (variasi palet). null = pelanggan buatan kode.
 */
export function customerCharacter(
    customer: Pick<Customer, 'id'>,
): ReferenceCharacter | null {
    const slot = (customer.id - 1) % (CUSTOMER_REFERENCES.length + 1);

    return slot < CUSTOMER_REFERENCES.length ? CUSTOMER_REFERENCES[slot] : null;
}

/** Arah tampilan di layar: ke kiri atau kanan, mendekat (depan) atau menjauh (belakang). */
export type Heading = { left: boolean; front: boolean };

/**
 * Arah tampilan pelanggan. Saat berjalan mengikuti tujuan jalurnya, bukan tiap
 * langkah, supaya tidak berbalik bolak-balik di jalur bertangga; bila seri
 * memakai arah sebelumnya. Saat berdiri mengikuti arah hadapnya (menghadap
 * kasir di antrean, menghadap rak saat mengambil barang).
 */
export function headingOf(customer: Customer, previous?: Heading): Heading {
    const standing: Heading = {
        left: customer.facing === 'sw' || customer.facing === 'nw',
        front: customer.facing === 'sw' || customer.facing === 'se',
    };
    const goal = customer.path.at(-1);

    if (!goal) {
        return standing;
    }

    const base = previous ?? standing;
    // Layar: x mengikuti gx - gy, y mengikuti gx + gy.
    const dx = goal.gx - goal.gy - (customer.fx - customer.fy);
    const dy = goal.gx + goal.gy - (customer.fx + customer.fy);

    return {
        left: dx < 0 ? true : dx > 0 ? false : base.left,
        front: dy > 0 ? true : dy < 0 ? false : base.front,
    };
}

/** Gerakan sprite pelanggan dari state mesin. Kejar ketinggalan dan kabur memakai lari. */
export function customerAction(customer: Customer): CustomerAction {
    if (customer.state === 'ambil') {
        return 'ambil';
    }

    if (isWalking(customer)) {
        return customer.speed >= RUN ? 'lari' : 'jalan';
    }

    return 'diam';
}

/** Warna lebih gelap atau terang untuk sisi balok. */
function shade(hex: string, amount: number): string {
    const value = parseInt(hex.slice(1), 16);
    const channel = (shift: number) => {
        const c = (value >> shift) & 255;
        const next = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;

        return Math.max(0, Math.min(255, Math.round(next)));
    };

    return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

export class PlaceholderRenderer {
    private background: HTMLCanvasElement | null = null;
    private readonly sprites = new SpriteCache();
    private readonly headings = new Map<number, Heading>();
    private shownDaily: number | null = null;
    private lastTime = 0;

    constructor(private readonly scene: StoreScene) {}

    render(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        options: RenderOptions = {},
    ): void {
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1;
        ctx.drawImage(this.backgroundCanvas(), 0, 0);

        this.stepDailyCounter(world);

        if (options.blocked) {
            this.drawBlocked(ctx, world);
        }

        const items: DrawItem[] = [];

        for (const item of this.scene.furniture) {
            for (const slice of sliceFootprint(item)) {
                items.push({
                    id: `${item.id}#${slice.index}`,
                    depth: slice.depth,
                    layer: LAYER.furniture,
                    gx: slice.gx,
                    draw: (c) =>
                        this.drawFurnitureSlice(
                            c,
                            world,
                            item,
                            slice.gx,
                            slice.gy,
                            slice.index,
                        ),
                });
            }
        }

        // Penjaga bisa meninggalkan meja (mengejar pelanggan kabur): kedalaman dari posisinya.
        const cashier = world.cashier;
        const guardDepth = actorDepth(cashier.fx, cashier.fy);
        items.push({
            id: 'penjaga',
            depth: guardDepth,
            layer: LAYER.actor,
            gx: cashier.fx,
            draw: (c) => this.drawGuard(c, world),
        });

        const bubble =
            cashier.state === 'batal'
                ? 'xx'
                : cashier.state === 'mengejar' || cashier.state === 'di_pintu'
                  ? '!!'
                  : null;

        if (bubble) {
            items.push({
                id: 'gelembung-penjaga',
                depth: effectDepth(guardDepth),
                layer: LAYER.effect,
                gx: cashier.fx,
                draw: (c) => this.drawGuardBubble(c, world, bubble),
            });
        }

        if (this.headings.size > 64) {
            const present = new Set(world.customers.map((c) => c.id));

            for (const id of this.headings.keys()) {
                if (!present.has(id)) {
                    this.headings.delete(id);
                }
            }
        }

        for (const customer of world.customers) {
            const depth = actorDepth(customer.fx, customer.fy);
            items.push({
                id: `pelanggan-${customer.id}`,
                depth,
                layer: LAYER.actor,
                gx: customer.fx,
                draw: (c) =>
                    this.drawCustomer(c, world, customer, options.ids ?? false),
            });

            if (customer.state === 'bayar') {
                items.push({
                    id: `koin-${customer.id}`,
                    depth: effectDepth(depth),
                    layer: LAYER.effect,
                    gx: customer.fx,
                    draw: (c) => this.drawCoin(c, world, customer),
                });
            }
        }

        for (const item of sortDrawItems(items)) {
            item.draw(ctx);
        }

        ctx.globalAlpha = 1;

        if (options.paths) {
            this.drawPaths(ctx, world);
        }

        this.drawInterface(ctx, world);
    }

    // ---- Latar: lantai, karpet, keset, dinding, pintu (sprite 5C), dirender sekali ---

    private backgroundCanvas(): HTMLCanvasElement {
        if (this.background) {
            return this.background;
        }

        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            drawRoom(ctx, this.scene, CANVAS_W, CANVAS_H);
        }

        this.background = canvas;

        return canvas;
    }

    private drawBlocked(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
    ): void {
        ctx.globalAlpha = 0.45;

        for (const key of world.grid.blocked) {
            const [gx, gy] = key.split(',').map(Number);
            const { x, y } = tileTop(gx, gy);
            isoBox(ctx, x, y, 32, 32, 0, '#c2675a', null, null);
        }

        ctx.globalAlpha = 1;
    }

    // ---- Perabot ------------------------------------------------------------

    private drawFurnitureSlice(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        item: Furniture,
        gx: number,
        gy: number,
        index: number,
    ): void {
        const { x: cx, y: ty } = tileTop(gx, gy);

        switch (item.kind) {
            case 'rak': {
                // Sprite 5C. Isi rak menurut stok menyusul di 5D; sementara penuh.
                const seed = (item.id === 'rak-a' ? 0 : 10) + index + 1;
                const sprite = this.sprites.getDrawn(
                    `rak|penuh|${seed}`,
                    RACK_CANVAS.width,
                    RACK_CANVAS.height,
                    (c) =>
                        drawRackSlice(
                            c,
                            RACK_CANVAS.originX,
                            RACK_CANVAS.originY,
                            'penuh',
                            seed,
                        ),
                );
                ctx.drawImage(
                    sprite,
                    cx - RACK_CANVAS.originX,
                    ty - RACK_CANVAS.originY,
                );

                break;
            }

            case 'vending': {
                // Sprite 5C. Isi menurut stok menyusul di 5D; sementara penuh.
                const color = VENDING_COLORS[item.id] ?? 0;
                const on = vendingLightOn(world.time, color);
                const sprite = this.sprites.getDrawn(
                    `vending|${color}|penuh|${on ? 1 : 0}`,
                    VENDING_CANVAS.width,
                    VENDING_CANVAS.height,
                    (c) =>
                        drawVending(
                            c,
                            VENDING_CANVAS.originX,
                            VENDING_CANVAS.originY,
                            color,
                            'penuh',
                            on,
                        ),
                );
                ctx.drawImage(
                    sprite,
                    cx - VENDING_CANVAS.originX,
                    ty - VENDING_CANVAS.originY,
                );

                break;
            }

            case 'meja_kasir':
                this.drawCounterSlice(ctx, world, item, cx, ty, index);

                break;

            case 'bangku':
                drawStool(ctx, cx, ty);

                break;

            case 'tanaman': {
                const [ox, oy] = onTop(cx, ty, 0, 10, 10);
                isoBox(
                    ctx,
                    ox,
                    oy,
                    12,
                    12,
                    10,
                    '#c2675a',
                    '#e8907e',
                    '#c2675a',
                );
                const [lx, ly] = onTop(cx, ty, 10, 8, 8);
                isoBox(
                    ctx,
                    lx,
                    ly,
                    16,
                    16,
                    14,
                    '#a7d7a5',
                    '#6fae7b',
                    '#5a9466',
                );

                break;
            }
        }
    }

    /** Meja kasir (sprite 5C elemen 2): kasir 1 hidup mengikuti penjaga, kasir 2 tutup. */
    private drawCounterSlice(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        item: Furniture,
        cx: number,
        ty: number,
        index: number,
    ): void {
        drawCounterSlice(
            ctx,
            cx,
            ty,
            index === 0 ? 'kiri' : 'kanan',
            item.active ? this.counterLook(world) : CLOSED_COUNTER,
        );
    }

    /** Keadaan meja kasir 1 dari penjaga dan total harian. */
    private counterLook(world: DioramaWorld): CounterLook {
        const { state, progress } = world.cashier;
        const paying = state === 'terima_koin' && world.display.total !== null;

        // Warna barang yang sedang dipindai = warna produknya.
        const served = world.customers.find((c) => c.state === 'dipindai');
        const played = served ? (world.saleOf(served)?.scansPlayed ?? 0) : 0;
        const scanColors = served
            ? this.goodsColor(
                  this.goodsNames(world, served),
                  served,
                  Math.max(0, played - 1),
              )
            : undefined;

        return {
            on: true,
            scan: state === 'pindai' ? progress : null,
            scanColors,
            beep: state === 'bungkus',
            receipt: state === 'terima_koin' ? progress : null,
            display: paying
                ? {
                      text: formatDisplay(world.display.total ?? 0),
                      mode: 'belanja',
                  }
                : {
                      text: formatDisplay(this.shownDaily ?? world.dailyTotal),
                      mode: 'harian',
                  },
        };
    }

    /** Angka total harian di layar mini menghitung naik atau turun menuju total nyata. */
    private stepDailyCounter(world: DioramaWorld): void {
        const dt = Math.max(0, world.time - this.lastTime);
        this.lastTime = world.time;
        const target = world.dailyTotal;

        if (this.shownDaily === null || dt > 1) {
            this.shownDaily = target;

            return;
        }

        const next =
            this.shownDaily + (target - this.shownDaily) * Math.min(1, dt * 4);
        this.shownDaily = Math.abs(target - next) < 100 ? target : next;
    }

    // ---- Aktor --------------------------------------------------------------

    private drawFigure(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        colors: { shirt: string; skin: string; hair: string; legs: string },
        facing: Facing,
        lift: number,
        headShift = { dx: 0, dy: 0 },
    ): void {
        // Bayangan di lantai.
        ctx.globalAlpha *= 0.25;
        isoBox(ctx, x, y - 6, 12, 12, 0, SHADOW, null, null);
        ctx.globalAlpha /= 0.25;

        const base = y - 6 - lift;
        isoBox(
            ctx,
            x,
            base,
            12,
            12,
            10,
            null,
            colors.legs,
            shade(colors.legs, -0.3),
        );
        isoBox(
            ctx,
            x,
            base - 10,
            12,
            12,
            16,
            shade(colors.shirt, 0.2),
            colors.shirt,
            shade(colors.shirt, -0.25),
        );

        const hx = x + headShift.dx;
        const hy = y - 5 - lift - 26 + headShift.dy;
        const back = facing === 'ne' || facing === 'nw';
        isoBox(
            ctx,
            hx,
            hy,
            10,
            10,
            10,
            colors.hair,
            back ? colors.hair : colors.skin,
            back ? shade(colors.hair, -0.2) : shade(colors.skin, -0.15),
        );

        // Mata menunjukkan arah hadap: sisi kiri balok menghadap +gy, sisi kanan menghadap +gx.
        if (facing === 'sw') {
            leftDot(ctx, hx, hy, 10, 10, 2, 4, INK);
            leftDot(ctx, hx, hy, 10, 10, 6, 4, INK);
        } else if (facing === 'se') {
            rightDot(ctx, hx, hy, 10, 10, 10, 2, 4, INK);
            rightDot(ctx, hx, hy, 10, 10, 10, 6, 4, INK);
        }
    }

    /** Pelanggan: sprite 5C (diam, jalan, lari, ambil), arah hadap lewat cermin. */
    private drawCustomer(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        customer: Customer,
        ids: boolean,
    ): void {
        const { x, y } = tileCenter(customer.fx, customer.fy);
        // Muncul dan hilang perlahan di ambang pintu (di luar grid, fx < 0).
        const alpha = Math.max(0, Math.min(1, customer.fx + 1));
        const action = customerAction(customer);
        const frame = frameAt(action, world.time, customer.id * 0.37);
        const lift = 0;
        const heading = headingOf(customer, this.headings.get(customer.id));
        this.headings.set(customer.id, heading);
        const character = customerCharacter(customer);
        const src = character ? referenceMatrix(character.key) : null;
        // Puncak kepala, untuk nomor pelanggan.
        let top = y - 42;

        if (character && src) {
            // Karakter dari gambar pemilik, cara 1: transformasi saja.
            const movingLeft = heading.left;
            const flip = referenceFlip(character, movingLeft);
            const size = referenceFrameSize(src);
            const sprite = this.sprites.get(
                `ref|${character.key}|${action}|${frame}|${flip ? 1 : 0}|${movingLeft ? 1 : 0}`,
                () => {
                    const m = transformFrame(
                        src,
                        motionFrame(character, action, frame, movingLeft),
                    );

                    return flip ? mirror(m) : m;
                },
            );
            const footX = flip ? size.width - 1 - size.footX : size.footX;
            const s = Math.max(8, Math.min(24, Math.round(src.width * 0.45)));

            ctx.globalAlpha = alpha * 0.25;
            isoBox(ctx, x, y - fl(s / 2), s, s, 0, SHADOW, null, null);
            ctx.globalAlpha = alpha;
            ctx.drawImage(sprite, x - footX, y - size.footY - character.hover);
            top = y - src.height - character.hover;
        } else {
            // Gambar depan menghadap kiri-bawah, gambar belakang kanan-atas.
            const side = heading.front ? 'depan' : 'belakang';
            const flip = heading.front ? !heading.left : heading.left;
            const variant = variantForLook(customer.look);
            const sprite = this.sprites.get(
                `pelanggan|${variantKey(variant)}|${side}|${action}|${frame}|${flip ? 1 : 0}`,
                () => {
                    const m = buildCustomerFrame(variant, side, action, frame);

                    return flip ? mirror(m) : m;
                },
            );
            const footX = flip ? FRAME_W - 1 - FOOT_X : FOOT_X;

            ctx.globalAlpha = alpha * 0.25;
            isoBox(ctx, x, y - 6, 12, 12, 0, SHADOW, null, null);
            ctx.globalAlpha = alpha;
            ctx.drawImage(sprite, x - footX, y - FOOT_Y);
        }

        this.drawGoods(ctx, world, customer);

        if (ids) {
            const label = String(customer.id);
            drawText(
                ctx,
                x - fl(textWidth(label) / 2),
                top - 8 - lift,
                label,
                INK,
            );
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Penjaga kasir = zombie dari gambar pemilik (D6), cara 1: transformasi saja.
     * Lari saat mengejar, jalan saat pulang, diam di meja; geleng dan angguk
     * lewat geser kecil. Mengembalikan false bila gambar belum termuat.
     */
    private drawZombie(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        x: number,
        y: number,
    ): boolean {
        const zombie = referenceByKey('zombie');
        const src = referenceMatrix('zombie');

        if (!zombie || !src) {
            return false;
        }

        const cashier = world.cashier;
        const movingLeft = cashier.facing === 'sw' || cashier.facing === 'nw';
        const flip = referenceFlip(zombie, movingLeft);
        // Aksi di meja (sapa, pindai, bungkus, terima koin, batal) dan di pintu punya gerak sendiri.
        const serving = cashierMotion(cashier.state, cashier.stateTime);
        const action: CustomerAction =
            cashier.state === 'mengejar'
                ? 'lari'
                : cashier.state === 'kembali'
                  ? 'jalan'
                  : 'diam';
        const frame = serving ? serving.frame : frameAt(action, world.time);
        const key = serving ? cashier.state : action;
        const size = referenceFrameSize(src);
        const sprite = this.sprites.get(
            `ref|zombie|${key}|${frame}|${flip ? 1 : 0}`,
            () => {
                const m = transformFrame(
                    src,
                    serving
                        ? serving.transform
                        : motionFrame(zombie, action, frame),
                );

                return flip ? mirror(m) : m;
            },
        );
        const footX = flip ? size.width - 1 - size.footX : size.footX;

        ctx.globalAlpha = 0.25;
        isoBox(ctx, x, y - 6, 12, 12, 0, SHADOW, null, null);
        ctx.globalAlpha = 1;
        ctx.drawImage(sprite, x - footX, y - size.footY);

        return true;
    }

    private drawGuard(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
    ): void {
        const cashier = world.cashier;
        const { x, y } = tileCenter(cashier.fx, cashier.fy);
        const { state, stateTime } = cashier;
        const headShift = { dx: 0, dy: 0 };
        const running = cashier.path.length > 0;
        const lift = running
            ? fl(stateTime * (state === 'mengejar' ? 12 : 6)) % 2
            : 0;

        if (state === 'di_pintu') {
            // Kesal di pintu: kepala menggeleng pelan.
            headShift.dx = fl(stateTime * 4) % 2 === 0 ? -1 : 1;
        } else if (state === 'menyapa') {
            headShift.dy = fl(stateTime * 8) % 2;
        } else if (state === 'batal') {
            headShift.dx = fl(stateTime * 10) % 2 === 0 ? -1 : 1;
        } else if (state === 'diam' && stateTime % 4 > 3.85) {
            headShift.dy = 1;
        }

        if (this.drawZombie(ctx, world, x, y)) {
            return;
        }

        // Cadangan selama gambar zombie belum termuat.
        this.drawFigure(
            ctx,
            x,
            y,
            {
                shirt: '#6fae7b',
                skin: SKIN[0],
                hair: '#6fae7b',
                legs: '#5b5470',
            },
            cashier.facing,
            lift,
            headShift,
        );

        // Lengan: menyapu saat memindai, maju saat menerima koin.
        if (
            state === 'pindai' ||
            state === 'bungkus' ||
            state === 'terima_koin'
        ) {
            const progress = Math.min(1, stateTime / CASHIER_DURATION[state]);
            const dx =
                state === 'pindai'
                    ? -6 + fl(progress * 12)
                    : state === 'bungkus'
                      ? 6
                      : -4;
            const dy = state === 'bungkus' ? fl(progress * 4) : 0;
            isoBox(
                ctx,
                x + dx,
                y - 22 + dy,
                4,
                4,
                4,
                SKIN[0],
                shade(SKIN[0], -0.1),
                shade(SKIN[0], -0.2),
            );
        }
    }

    /** Gelembung di atas kepala penjaga: "xx" saat batal, "!!" saat mengejar dan di pintu. */
    private drawGuardBubble(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        text: string,
    ): void {
        const { x, y } = tileCenter(world.cashier.fx, world.cashier.fy);
        const bx = x - 6;
        const by = y - 62;
        ctx.fillStyle = INK;
        ctx.fillRect(bx - 1, by - 1, 13, 11);
        ctx.fillStyle = WHITE;
        ctx.fillRect(bx, by, 11, 9);
        drawText(ctx, bx + 2, by + 2, text, '#c2675a', 1);
    }

    // ---- Barang, kantong, koin (sprite 5C elemen 4) --------------------------

    /** Letak tangan pelanggan saat ini, mengikuti naik-turun badan. */
    private handPoint(world: DioramaWorld, customer: Customer): Point {
        const { x, y } = tileCenter(customer.fx, customer.fy);
        const heading = this.headings.get(customer.id) ?? headingOf(customer);
        const action = customerAction(customer);
        const frame = frameAt(action, world.time, customer.id * 0.37);
        const character = customerCharacter(customer);
        const src = character ? referenceMatrix(character.key) : null;

        if (character && src) {
            const hand = handOffset(src, heading.left);
            const bob = motionFrame(character, action, frame, heading.left).dy;

            return { x: x + hand.x, y: y + hand.y + bob - character.hover };
        }

        const hand = handOffset(null, heading.left);

        return { x: x + hand.x, y: y + hand.y + customerBob(action, frame) };
    }

    /** Puncak tile kanan meja kasir 1 (laci, tumpukan kantong). */
    private activeCounterRight(): Point | null {
        const counter = this.scene.furniture.find(
            (f) => f.kind === 'meja_kasir' && f.active,
        );

        return counter ? tileTop(counter.gx + counter.w - 1, counter.gy) : null;
    }

    /** Nama barang penjualan ini, urut pindai (atau rincian bila belum ada pindai). */
    private goodsNames(world: DioramaWorld, customer: Customer): string[] {
        const sale = world.saleOf(customer);

        if (!sale) {
            return [];
        }

        return (sale.scanned.length > 0 ? sale.scanned : sale.items).map(
            (item) => item.name,
        );
    }

    private goodsColor(
        names: string[],
        customer: Customer,
        k: number,
    ): GoodsColors {
        return productColor(names[k] ?? `${customer.id}:${k}`);
    }

    /**
     * Barang di tangan (bertumpuk), barang melayang dari rak saat diambil,
     * kantong dari meja ke tangan, lalu kantong dibawa pulang.
     */
    private drawGoods(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        customer: Customer,
    ): void {
        const hand = this.handPoint(world, customer);
        const names = this.goodsNames(world, customer);
        const played = world.saleOf(customer)?.scansPlayed ?? 0;
        const state = customer.state;

        // Kantong: terbang dari tumpukan di meja ke tangan, lalu dibawa.
        if (state === 'ambil_kantong') {
            const right = this.activeCounterRight();

            if (right) {
                const from = counterBagPoint(right.x, right.y);
                const t = customer.stateTime / DURATION.ambil_kantong;
                const p = arcPoint(from, hand, t, 8);
                ctx.drawImage(this.bagCanvas(), p.x - 4, p.y - 1);
            }

            return;
        }

        if (customer.hasBag) {
            ctx.drawImage(this.bagCanvas(), hand.x - 4, hand.y - 1);

            return;
        }

        // Barang dibawa: berkurang satu per satu saat dipindai, habis saat membayar.
        const atCounter = state === 'dilayani' || state === 'dipindai';
        const offset = atCounter ? played : 0;
        const shown =
            state === 'bayar' ? 0 : Math.max(0, customer.carrying - offset);

        for (let k = 0; k < Math.min(shown, 3); k++) {
            drawItemBox(
                ctx,
                hand.x,
                hand.y - k * 6,
                this.goodsColor(names, customer, offset + k),
            );
        }

        // Mengambil: barang melayang dari papan rak (atau pintu vending) ke tangan.
        if (state === 'ambil' && customer.pick) {
            const vending = customer.pick.source.startsWith('vending');
            const shelf = tileCenter(customer.pick.gx, customer.pick.gy - 0.6);
            const from = { x: shelf.x, y: shelf.y - (vending ? 10 : 18) };
            const to = { x: hand.x, y: hand.y - Math.min(shown, 3) * 6 };
            const t = customer.stateTime / (DURATION.ambil / customer.speed);
            const p = arcPoint(from, to, t, 6);
            drawItemBox(
                ctx,
                p.x,
                p.y,
                this.goodsColor(names, customer, customer.carrying),
            );
        }
    }

    private bagCanvas(): HTMLCanvasElement {
        return this.sprites.get('kantong', bagMatrix);
    }

    /** Koin berputar terbang dari tangan ke laci uang, lalu berkilau sesaat. */
    private drawCoin(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        customer: Customer,
    ): void {
        const right = this.activeCounterRight();

        if (!right) {
            return;
        }

        const flight = DURATION.bayar * 0.7;
        const drawer = counterDrawerPoint(right.x, right.y);
        const t = customer.stateTime / flight;

        if (t < 1) {
            const p = arcPoint(this.handPoint(world, customer), drawer, t, 14);
            const frame = Math.floor(world.time * COIN_SPIN) % COIN_FRAMES;
            const coin = this.sprites.get(`koin|${frame}`, () =>
                coinMatrix(frame),
            );
            ctx.drawImage(coin, p.x - fl(coin.width / 2), p.y - 2);
        } else if (customer.stateTime < flight + 0.2) {
            // Kilau kecil saat koin masuk laci.
            ctx.fillStyle = C(4);
            ctx.fillRect(drawer.x, drawer.y - 4, 1, 3);
            ctx.fillRect(drawer.x - 1, drawer.y - 3, 3, 1);
            ctx.fillStyle = C(11);
            ctx.fillRect(drawer.x - 3, drawer.y - 6, 1, 1);
            ctx.fillRect(drawer.x + 3, drawer.y - 5, 1, 1);
        }
    }

    // ---- Antarmuka ------------------------------------------------------------

    private drawPaths(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
    ): void {
        for (const customer of world.customers) {
            ctx.fillStyle =
                customer.kind === 'latar'
                    ? '#5b5470'
                    : SHIRTS[customer.look % SHIRTS.length];

            for (const step of customer.path) {
                const { x, y } = tileCenter(step.gx, step.gy);
                ctx.fillRect(x - 1, y - 1, 3, 3);
            }
        }
    }

    private drawInterface(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
    ): void {
        // "+N" di atas ujung antrean untuk pembeli yang belum tampil.
        if (world.waitingCount > 0) {
            const last =
                this.scene.queueSlots[this.scene.queueSlots.length - 1];
            const { x, y } = tileCenter(last.gx - 1, last.gy);
            const label = `+${world.waitingCount}`;
            const w = textWidth(label, 2) + 8;
            ctx.fillStyle = INK;
            ctx.fillRect(x - fl(w / 2) - 1, y - 59, w + 2, 16);
            ctx.fillStyle = '#ffe9a8';
            ctx.fillRect(x - fl(w / 2), y - 58, w, 14);
            drawText(ctx, x - fl(w / 2) + 4, y - 56, label, INK, 2);
        }

        // Total harian kini tampil di layar mini meja kasir 1 (sprite 5C).
    }
}

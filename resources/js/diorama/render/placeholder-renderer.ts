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
    motionFrame,
    referenceByKey,
    referenceFlip,
    referenceFrameSize,
    transformFrame,
} from '../sprites/reference-sprite';
import type { ReferenceCharacter } from '../sprites/reference-sprite';
import { drawRoom } from '../sprites/room-sprite';
import { SpriteCache } from '../sprites/sprite-cache';
import {
    drawText,
    formatRupiah,
    isoBox,
    leftDot,
    onTop,
    rightDot,
    textWidth,
    topDot,
} from './pixel';

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

    constructor(private readonly scene: StoreScene) {}

    render(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        options: RenderOptions = {},
    ): void {
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1;
        ctx.drawImage(this.backgroundCanvas(), 0, 0);

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
                    draw: (c) => this.drawCoin(c, customer),
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
                const [ox, oy] = onTop(cx, ty, 0, 2, 4);
                isoBox(
                    ctx,
                    ox,
                    oy,
                    28,
                    24,
                    item.height,
                    shade(item.color, 0.35),
                    item.color,
                    shade(item.color, -0.25),
                );
                leftDot(ctx, ox, oy, 24, item.height, 4, 14, '#e8f6fb', 18, 36);

                break;
            }

            case 'meja_kasir':
                this.drawCounterSlice(ctx, world, item, cx, ty, index);

                break;

            case 'bangku': {
                const [ox, oy] = onTop(cx, ty, 0, 10, 10);
                isoBox(
                    ctx,
                    ox,
                    oy,
                    12,
                    12,
                    item.height,
                    item.color,
                    shade(item.color, -0.2),
                    shade(item.color, -0.35),
                );

                break;
            }

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

    private drawCounterSlice(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
        item: Furniture,
        cx: number,
        ty: number,
        index: number,
    ): void {
        const h = item.height;
        isoBox(
            ctx,
            cx,
            ty,
            32,
            32,
            h,
            WHITE,
            item.color,
            shade(item.color, -0.2),
        );

        if (index === 0) {
            // Monitor kasir dilihat dari belakang.
            const [mx, my] = onTop(cx, ty, h, 8, 6);
            isoBox(ctx, mx, my, 16, 4, 13, '#8f88a8', '#5b5470', '#4a4560');

            if (item.active) {
                // Scanner datar dengan garis laser yang berkedip saat memindai.
                const [sx, sy] = onTop(cx, ty, h, 14, 18);
                isoBox(ctx, sx, sy, 10, 8, 1, INK, null, null);
                const scanning =
                    world.cashier.state === 'pindai' &&
                    fl(world.cashier.stateTime * 12) % 2 === 0;

                if (scanning) {
                    for (let i = 0; i < 10; i++) {
                        topDot(ctx, sx, sy, 1, i, 4, '#ff4d4d');
                    }
                }
            }

            return;
        }

        // Layar pelanggan: total belanja saat membayar, atau TUTUP di kasir 2.
        const [px, py] = onTop(cx, ty, h, 12, 22);
        const label = item.active
            ? world.display.total === null
                ? '-'
                : formatRupiah(world.display.total)
            : 'TUTUP';
        const width = Math.max(24, textWidth(label) + 6);
        ctx.fillStyle = INK;
        ctx.fillRect(px - fl(width / 2), py - 12, width, 10);
        drawText(
            ctx,
            px - fl(textWidth(label) / 2),
            py - 10,
            label,
            item.active ? '#a7d7a5' : '#8f88a8',
        );
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

        if (customer.hasBag) {
            isoBox(
                ctx,
                x + 8,
                y - 10 - lift,
                7,
                7,
                9,
                '#e6d0a7',
                '#c98e6a',
                '#a8763f',
            );
        } else if (customer.carrying > 0) {
            for (let k = 0; k < Math.min(customer.carrying, 3); k++) {
                isoBox(
                    ctx,
                    x + 8,
                    y - 14 - lift - k * 5,
                    5,
                    5,
                    4,
                    '#ffe9a8',
                    '#f6c56b',
                    '#e89b4f',
                );
            }
        }

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
        shift: { dx: number; dy: number },
    ): boolean {
        const zombie = referenceByKey('zombie');
        const src = referenceMatrix('zombie');

        if (!zombie || !src) {
            return false;
        }

        const cashier = world.cashier;
        const action: CustomerAction =
            cashier.state === 'mengejar'
                ? 'lari'
                : cashier.state === 'kembali'
                  ? 'jalan'
                  : 'diam';
        const frame = frameAt(action, world.time);
        const movingLeft = cashier.facing === 'sw' || cashier.facing === 'nw';
        const flip = referenceFlip(zombie, movingLeft);
        const size = referenceFrameSize(src);
        const sprite = this.sprites.get(
            `ref|zombie|${action}|${frame}|${flip ? 1 : 0}`,
            () => {
                const m = transformFrame(
                    src,
                    motionFrame(zombie, action, frame),
                );

                return flip ? mirror(m) : m;
            },
        );
        const footX = flip ? size.width - 1 - size.footX : size.footX;

        ctx.globalAlpha = 0.25;
        isoBox(ctx, x, y - 6, 12, 12, 0, SHADOW, null, null);
        ctx.globalAlpha = 1;
        ctx.drawImage(sprite, x - footX + shift.dx, y - size.footY + shift.dy);

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

        if (this.drawZombie(ctx, world, x, y, headShift)) {
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

    private drawCoin(ctx: CanvasRenderingContext2D, customer: Customer): void {
        const from = tileCenter(customer.fx, customer.fy);
        const counter = this.scene.furniture.find(
            (f) => f.kind === 'meja_kasir' && f.active,
        );

        if (!counter) {
            return;
        }

        const drawer = tileCenter(counter.gx + counter.w - 1, counter.gy);
        const progress = Math.min(
            1,
            customer.stateTime / (DURATION.bayar * 0.7),
        );
        const arc = Math.sin(progress * Math.PI) * 10;
        const x = Math.round(from.x + 6 + (drawer.x - from.x - 6) * progress);
        const y = Math.round(
            from.y -
                22 +
                (drawer.y - counter.height - 4 - from.y + 22) * progress -
                arc,
        );

        if (progress < 1) {
            ctx.fillStyle = '#c2675a';
            ctx.fillRect(x - 2, y - 2, 5, 5);
            ctx.fillStyle = '#ffe9a8';
            ctx.fillRect(x - 1, y - 1, 3, 3);
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

        // Total harian di pojok kiri atas (layar harian; di 5D diisi dari server).
        const label = `HARI INI ${formatRupiah(world.dailyTotal)}`;
        const w = textWidth(label) + 8;
        ctx.fillStyle = INK;
        ctx.fillRect(8, 8, w, 11);
        drawText(ctx, 12, 11, label, '#a7d7a5');
    }
}

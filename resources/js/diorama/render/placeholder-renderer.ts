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
import { DURATION, isWalking } from '../actors/customer';
import {
    LAYER,
    actorDepth,
    effectDepth,
    sliceFootprint,
    sortDrawItems,
} from '../engine/depth';
import type { DrawItem } from '../engine/depth';
import {
    CANVAS_H,
    CANVAS_W,
    ORIGIN,
    WALL_H,
    depthOf,
    tileCenter,
    tileTop,
} from '../engine/iso';
import type { Facing } from '../engine/iso';
import type { DioramaWorld } from '../engine/world';
import type { Furniture, StoreScene } from '../scenes/store-scene';
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
const CREAM = '#f7f1e3';
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
const HAIR = ['#7a5c4b', '#2b2a33', '#e89b4f', '#5b5470'];

const fl = Math.floor;

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

        const guard = this.scene.guard;
        const guardDepth = depthOf(guard.gx, guard.gy);
        items.push({
            id: 'penjaga',
            depth: guardDepth,
            layer: LAYER.actor,
            gx: guard.gx,
            draw: (c) => this.drawGuard(c, world),
        });

        if (world.cashier.state === 'batal') {
            items.push({
                id: 'gelembung-batal',
                depth: effectDepth(guardDepth),
                layer: LAYER.effect,
                gx: guard.gx,
                draw: (c) => this.drawCancelBubble(c),
            });
        }

        for (const customer of world.customers) {
            const depth = actorDepth(customer.fx, customer.fy);
            items.push({
                id: `pelanggan-${customer.id}`,
                depth,
                layer: LAYER.actor,
                gx: customer.fx,
                draw: (c) =>
                    this.drawCustomer(c, customer, options.ids ?? false),
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

    // ---- Latar: lantai dan dinding, dirender sekali ------------------------

    private backgroundCanvas(): HTMLCanvasElement {
        if (this.background) {
            return this.background;
        }

        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.fillStyle = '#efe7d6';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            this.drawFloor(ctx);
            this.drawWalls(ctx);
        }

        this.background = canvas;

        return canvas;
    }

    private drawFloor(ctx: CanvasRenderingContext2D): void {
        const rugRow = this.scene.queueSlots[0].gy;
        const rugGx = this.scene.queueSlots.map((s) => s.gx);

        for (let gy = 0; gy < this.scene.height; gy++) {
            for (let gx = 0; gx < this.scene.width; gx++) {
                const { x, y } = tileTop(gx, gy);
                const alt = (gx + gy) % 2 === 1;
                // Lantai yang disetujui: kotak mint dan krem (D7).
                isoBox(
                    ctx,
                    x,
                    y,
                    32,
                    32,
                    0,
                    alt ? '#cfe8cf' : CREAM,
                    null,
                    null,
                );

                for (let t = 0; t < 32; t++) {
                    topDot(ctx, x, y, 0, t, 0, '#e2d8c3');
                    topDot(ctx, x, y, 0, 0, t, '#e2d8c3');

                    if (t > 0) {
                        topDot(ctx, x, y, 0, t, 1, alt ? '#e1f1e1' : WHITE);
                        topDot(ctx, x, y, 0, 1, t, alt ? '#e1f1e1' : WHITE);
                    }
                }

                // Karpet antrean (terakota berpinggir krem) di bawah titik dilayani dan antrean.
                if (gy === rugRow && rugGx.includes(gx)) {
                    const [rx, ry] = onTop(x, y, 0, 0, 6);
                    isoBox(ctx, rx, ry, 32, 20, 0, '#e8907e', null, null);
                }
            }
        }
    }

    private drawWalls(ctx: CanvasRenderingContext2D): void {
        const { x: ox, y: oy } = ORIGIN;
        const doorFrom = this.scene.door.inside.gy - 1;
        const doorTo = this.scene.door.inside.gy;

        // Dinding belakang kanan (sepanjang gx, di atas baris gy = 0).
        for (let u = 0; u < this.scene.width * 32; u++) {
            const base = oy + fl(u / 2);
            ctx.fillStyle = '#efe2c4';
            ctx.fillRect(ox + u, base - WALL_H, 1, WALL_H);
            ctx.fillStyle = '#c4ad86';
            ctx.fillRect(ox + u, base - 5, 1, 5);
            ctx.fillStyle = WHITE;
            ctx.fillRect(ox + u, base - WALL_H, 1, 3);
        }

        // Dinding belakang kiri (sepanjang gy, di kiri kolom gx = 0) dengan lubang pintu.
        for (let v = 0; v < this.scene.height * 32; v++) {
            const x = ox - 1 - v;
            const base = oy + fl(v / 2);
            const tile = fl(v / 32);
            const inDoor = tile >= doorFrom && tile <= doorTo;

            ctx.fillStyle = '#e6d6b4';
            ctx.fillRect(x, base - WALL_H, 1, WALL_H);
            ctx.fillStyle = WHITE;
            ctx.fillRect(x, base - WALL_H, 1, 3);

            if (inDoor) {
                const edge = v === doorFrom * 32 || v === (doorTo + 1) * 32 - 1;
                ctx.fillStyle = edge ? '#7a5c4b' : '#cfeaf2';
                ctx.fillRect(x, base - 64, 1, 64);
                ctx.fillStyle = '#7a5c4b';
                ctx.fillRect(x, base - 66, 1, 2);
            } else {
                ctx.fillStyle = '#c4ad86';
                ctx.fillRect(x, base - 5, 1, 5);
            }
        }
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
                const [ox, oy] = onTop(cx, ty, 0, 0, 4);
                isoBox(
                    ctx,
                    ox,
                    oy,
                    32,
                    24,
                    item.height,
                    CREAM,
                    '#b08d62',
                    '#937452',
                );

                for (const d of [11, 21]) {
                    leftDot(
                        ctx,
                        ox,
                        oy,
                        24,
                        item.height,
                        0,
                        d,
                        '#7a5c4b',
                        32,
                        1,
                    );
                }

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

    private drawCustomer(
        ctx: CanvasRenderingContext2D,
        customer: Customer,
        ids: boolean,
    ): void {
        const { x, y } = tileCenter(customer.fx, customer.fy);
        const alpha = Math.max(0, Math.min(1, customer.fx + 1));
        const lift = isWalking(customer) ? fl(customer.stateTime * 6) % 2 : 0;
        const latar = customer.kind === 'latar';

        ctx.globalAlpha = alpha;
        this.drawFigure(
            ctx,
            x,
            y,
            {
                shirt: latar
                    ? '#d9d2e4'
                    : SHIRTS[customer.look % SHIRTS.length],
                skin: SKIN[customer.look % SKIN.length],
                hair: HAIR[customer.look % HAIR.length],
                legs: latar ? '#8f88a8' : '#6a9fc4',
            },
            customer.facing,
            lift,
            customer.state === 'ambil' ? { dx: 0, dy: -1 } : undefined,
        );

        if (latar) {
            // Topi abu: penanda pelanggan latar.
            isoBox(
                ctx,
                x,
                y - 6 - lift - 36,
                12,
                12,
                2,
                '#8f88a8',
                '#5b5470',
                '#4a4560',
            );
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
                y - 56 - lift,
                label,
                INK,
            );
        }

        ctx.globalAlpha = 1;
    }

    private drawGuard(
        ctx: CanvasRenderingContext2D,
        world: DioramaWorld,
    ): void {
        const { x, y } = tileCenter(this.scene.guard.gx, this.scene.guard.gy);
        const { state, stateTime } = world.cashier;
        const headShift = { dx: 0, dy: 0 };

        if (state === 'menyapa') {
            headShift.dy = fl(stateTime * 8) % 2;
        } else if (state === 'batal') {
            headShift.dx = fl(stateTime * 10) % 2 === 0 ? -1 : 1;
        } else if (state === 'diam' && stateTime % 4 > 3.85) {
            headShift.dy = 1;
        }

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
            this.scene.guard.facing,
            0,
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

    private drawCancelBubble(ctx: CanvasRenderingContext2D): void {
        const { x, y } = tileCenter(this.scene.guard.gx, this.scene.guard.gy);
        const bx = x - 6;
        const by = y - 62;
        ctx.fillStyle = INK;
        ctx.fillRect(bx - 1, by - 1, 13, 11);
        ctx.fillStyle = WHITE;
        ctx.fillRect(bx, by, 11, 9);
        drawText(ctx, bx + 2, by + 2, 'x', '#c2675a', 1);
        drawText(ctx, bx + 6, by + 2, 'x', '#c2675a', 1);
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

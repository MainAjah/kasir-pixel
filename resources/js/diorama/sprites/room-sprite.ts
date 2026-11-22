/**
 * Lantai, karpet antrean, keset, dinding, dan pintu kaca (Tahap 5C elemen 1).
 *
 * Bentuknya dipindahkan dari halaman rancangan 5A yang disetujui: lantai kotak
 * mint dan krem dengan nat dan kilau, karpet terakota bermotif zig-zag kunyit,
 * keset hijau bergaris, dua dinding belakang setinggi 80 px dengan list atas dan
 * plint, pintu kaca berbingkai kayu dengan pantulan dan gagang dorong.
 *
 * Warna: skema "langit dan lavender" pilihan pemilik di 5C (hanya palet 24):
 * dinding lavender (berpintu) dan biru langit, list putih, plint dan alas hijau,
 * lantai mint memakai hijau palet. Ditambah alas diorama di tepi depan lantai.
 */
import { HALF_H, HALF_W, ORIGIN, WALL_H, tileTop } from '../engine/iso';
import { isoBox, topDot } from '../render/pixel';
import type { StoreScene } from '../scenes/store-scene';
import { DOOR_GLASS_H, doorViewColor } from './decor-sprite';
import type { TimeOfDay } from './decor-sprite';
import { C } from './palette';

export type RoomScheme = {
    /** Latar di luar ruangan. */
    background: string;
    floor: {
        /** Ubin krem dan ubin selang-seling. */
        a: string;
        b: string;
        /** Nat di tepi belakang tiap ubin. */
        grout: string;
        /** Garis kilau di dalam nat; null = tanpa kilau. */
        shineA: string | null;
        shineB: string | null;
    };
    /** Dinding kiri (berpintu) dan dinding kanan (panjang, di belakang vending machine). */
    wallLeft: string;
    wallRight: string;
    /** List atas dinding. */
    trim: string;
    /** Plint di kaki dinding dan garis di atasnya. */
    plinth: string;
    plinthLine: string;
    /** Alas diorama di tepi depan lantai: sisi kiri (terang) dan kanan (gelap). */
    base: { left: string; right: string };
    door: { frame: string; glass: string; shine: string; handle: string };
};

const T = 32;
const fl = Math.floor;
/** Tebal alas diorama di tepi depan lantai. */
export const BASE_H = 6;

/** Skema ruangan yang disetujui pemilik: langit dan lavender. */
export const ROOM_SCHEME: RoomScheme = {
    background: C(4),
    floor: { a: C(5), b: C(9), grout: C(6), shineA: C(4), shineB: null },
    wallLeft: C(17),
    wallRight: C(18),
    trim: C(4),
    plinth: C(10),
    plinthLine: C(9),
    base: { left: C(9), right: C(10) },
    door: { frame: C(20), glass: C(18), shine: C(4), handle: C(3) },
};

function floorTile(
    ctx: CanvasRenderingContext2D,
    gx: number,
    gy: number,
    scheme: RoomScheme,
): void {
    const { x: cx, y: ty } = tileTop(gx, gy);
    const alt = (gx + gy) % 2 === 1;
    const f = scheme.floor;

    for (let i = 0; i < T; i++) {
        for (let j = 0; j < T; j++) {
            let color = alt ? f.b : f.a;

            if (i === 0 || j === 0) {
                color = f.grout;
            } else if ((i === 1 || j === 1) && (alt ? f.shineB : f.shineA)) {
                color = (alt ? f.shineB : f.shineA) as string;
            }

            ctx.fillStyle = color;
            ctx.fillRect(cx + i - j, ty + fl((i + j) / 2), 1, 1);
        }
    }
}

/** Karpet antrean di bawah titik dilayani dan antrean: terakota, pinggir krem, zig-zag kunyit. */
function drawRug(ctx: CanvasRenderingContext2D, scene: StoreScene): void {
    const slots = [...scene.queueSlots].sort((a, b) => a.gx - b.gx);
    const first = slots[0].gx;
    const length = slots.length * T;

    for (const slot of slots) {
        const { x: cx, y: ty } = tileTop(slot.gx, slot.gy);

        for (let i = 0; i < T; i++) {
            for (let j = 3; j < T - 3; j++) {
                const u = (slot.gx - first) * T + i;
                const edge = Math.min(u, length - 1 - u, j - 3, T - 4 - j);
                const color =
                    edge < 1 || edge === 3
                        ? C(15)
                        : edge < 3
                          ? C(5)
                          : (u + Math.abs((j % 8) - 4)) % 10 === 0
                            ? C(12)
                            : C(14);

                ctx.fillStyle = color;
                ctx.fillRect(cx + i - j, ty + fl((i + j) / 2), 1, 1);
            }
        }
    }
}

/** Keset hijau bergaris di dalam pintu. */
function drawDoormat(
    ctx: CanvasRenderingContext2D,
    doorRows: readonly number[],
): void {
    for (const gy of doorRows) {
        const { x: cx, y: ty } = tileTop(0, gy);
        isoBox(ctx, cx + 4, ty + 2, 20, T, 0, C(10), null, null);

        for (let j = 2; j < T; j += 4) {
            for (let i = 2; i < 18; i++) {
                topDot(ctx, cx + 4, ty + 2, 0, i, j, C(9));
            }
        }
    }
}

/** Dua baris dinding kiri yang menjadi pintu kaca. */
export function doorRowsOf(scene: StoreScene): [number, number] {
    return [scene.door.inside.gy - 1, scene.door.inside.gy];
}

/**
 * Kaca pintu: pemandangan luar menurut waktu (siang, senja, malam), pantulan
 * kaca, dan gagang dorong. Tiang, ambang, dan kusen tengah tidak ikut digambar,
 * jadi di malam hari kaca bisa digambar ulang terang tanpa mencerahkan kayunya.
 */
export function drawDoorGlass(
    ctx: CanvasRenderingContext2D,
    scene: StoreScene,
    time: TimeOfDay,
    scheme: RoomScheme = ROOM_SCHEME,
): void {
    const [doorTop, doorBottom] = doorRowsOf(scene);

    for (let gy = doorTop; gy <= doorBottom; gy++) {
        const { x: cx, y: ty } = tileTop(0, gy);

        for (let i = 0; i < HALF_W; i++) {
            const post =
                (gy === doorBottom && i < 3) ||
                (gy === doorTop && i > HALF_W - 4);

            if (post || i % 16 === 0) {
                continue;
            }

            const x = cx - HALF_W + i;
            const top = ty + HALF_H - fl(i / 2) - WALL_H + 10;
            // Kolom dari kiri pintu: baris pintu bawah (gy besar) ada di kiri layar.
            const u = (doorBottom - gy) * HALF_W + i;
            let run = 0;

            // Gabungkan baris berwarna sama menjadi satu fillRect.
            for (let v = 1; v <= DOOR_GLASS_H; v++) {
                const color = doorViewColor(u, run, time);

                if (v === DOOR_GLASS_H || doorViewColor(u, v, time) !== color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x, top + run, 1, v - run);
                    run = v;
                }
            }

            if ((i + gy * 3) % 9 === 0) {
                // Pantulan kaca: terang di siang dan senja, redup di malam hari.
                ctx.fillStyle = time === 'malam' ? C(3) : scheme.door.shine;
                ctx.fillRect(
                    x,
                    top + 6 + (i % 5),
                    1,
                    time === 'malam' ? 6 : 12,
                );
            }
        }
    }

    // Gagang dorong di pintu.
    const { x: cx, y: ty } = tileTop(0, doorBottom);
    ctx.fillStyle = scheme.door.handle;

    for (let i = 6; i < 26; i++) {
        ctx.fillRect(cx + i, ty + HALF_H - fl((i + T) / 2) - 44, 1, 2);
    }
}

function drawWalls(
    ctx: CanvasRenderingContext2D,
    scene: StoreScene,
    scheme: RoomScheme,
    doorRows: readonly number[],
    time: TimeOfDay,
): void {
    const [doorTop, doorBottom] = [
        Math.min(...doorRows),
        Math.max(...doorRows),
    ];

    // Dinding kiri (sepanjang gy, di kiri kolom gx = 0), dengan pintu kaca.
    for (let gy = 0; gy < scene.height; gy++) {
        const { x: cx, y: ty } = tileTop(0, gy);
        const isDoor = doorRows.includes(gy);

        for (let i = 0; i < HALF_W; i++) {
            const x = cx - HALF_W + i;
            const base = ty + HALF_H - fl(i / 2);

            if (isDoor) {
                // Ambang atas kayu; tiang di kedua ujung dan kusen tengah kayu.
                // Kaca (pemandangan luar) digambar di drawDoorGlass.
                const post =
                    (gy === doorBottom && i < 3) ||
                    (gy === doorTop && i > HALF_W - 4);
                ctx.fillStyle = scheme.door.frame;
                ctx.fillRect(x, base - WALL_H, 1, 10);

                if (post || i % 16 === 0) {
                    ctx.fillRect(x, base - WALL_H + 10, 1, WALL_H - 10);
                }

                continue;
            }

            ctx.fillStyle = scheme.wallLeft;
            ctx.fillRect(x, base - WALL_H, 1, WALL_H);
            ctx.fillStyle = scheme.trim;
            ctx.fillRect(x, base - WALL_H, 1, 4);
            ctx.fillStyle = scheme.plinth;
            ctx.fillRect(x, base - 8, 1, 8);
            ctx.fillStyle = scheme.plinthLine;
            ctx.fillRect(x, base - 9, 1, 1);
        }
    }

    drawDoorGlass(ctx, scene, time, scheme);

    // Dinding kanan (sepanjang gx, di atas baris gy = 0).
    for (let gx = 0; gx < scene.width; gx++) {
        const { x: cx, y: ty } = tileTop(gx, 0);

        for (let i = 0; i < HALF_W; i++) {
            const x = cx + i;
            const base = ty + fl(i / 2);
            ctx.fillStyle = scheme.wallRight;
            ctx.fillRect(x, base - WALL_H, 1, WALL_H);
            ctx.fillStyle = scheme.trim;
            ctx.fillRect(x, base - WALL_H, 1, 4);
            ctx.fillStyle = scheme.plinth;
            ctx.fillRect(x, base - 8, 1, 8);
            ctx.fillStyle = scheme.plinthLine;
            ctx.fillRect(x, base - 9, 1, 1);
        }
    }
}

/**
 * Seluruh ruangan statis: latar, lantai, karpet, keset, dinding, pintu (kaca
 * menampilkan pemandangan luar menurut waktu). Dirender sekali per waktu.
 */
export function drawRoom(
    ctx: CanvasRenderingContext2D,
    scene: StoreScene,
    width: number,
    height: number,
    scheme: RoomScheme = ROOM_SCHEME,
    time: TimeOfDay = 'siang',
): void {
    const doorRows = doorRowsOf(scene);

    ctx.fillStyle = scheme.background;
    ctx.fillRect(0, 0, width, height);

    // Alas diorama: sisi depan lantai setebal BASE_H, ubin menutup bagian atasnya.
    isoBox(
        ctx,
        ORIGIN.x,
        ORIGIN.y + BASE_H,
        scene.width * T,
        scene.height * T,
        BASE_H,
        null,
        scheme.base.left,
        scheme.base.right,
    );

    for (let gy = 0; gy < scene.height; gy++) {
        for (let gx = 0; gx < scene.width; gx++) {
            floorTile(ctx, gx, gy, scheme);
        }
    }

    drawRug(ctx, scene);
    drawDoormat(ctx, doorRows);
    drawWalls(ctx, scene, scheme, doorRows, time);
}

/**
 * Lantai, inlay pintu masuk, dinding, dan pintu kaca.
 *
 * Tahap 5C: bentuk dasar dari rancangan 5A (dua dinding setinggi 80 px, pintu
 * kaca berbingkai kayu dengan pantulan dan gagang dorong).
 *
 * Tahap 5G, konsep v4 "cozy elegan" pilihan pemilik (palet 24 + palet bahan):
 * lantai papan walnut dengan sambungan selang-seling dan serat, inlay herringbone
 * krem dan burgundi berbingkai kuningan di depan pintu (pengganti keset), dinding
 * mawar berdebu (berpintu) dan ivory dengan wainscot putih berpanel, lis kuningan,
 * mahkota putih, dan plint walnut. Karpet di jalur kasir dihapus atas permintaan
 * pemilik. Alas balok berlis kuningan dan bata walnut.
 */
import { HALF_H, HALF_W, ORIGIN, WALL_H, tileTop } from '../engine/iso';
import type { StoreScene } from '../scenes/store-scene';
import { DOOR_GLASS_H, doorViewColor } from './decor-sprite';
import type { TimeOfDay } from './decor-sprite';
import { C, M } from './palette';

export type RoomScheme = {
    /** Latar di luar ruangan. */
    background: string;
    floor: {
        /** Tiga nada papan walnut, bergiliran per papan. */
        planks: readonly [string, string, string];
        /** Nat di antara papan dan di sambungan ujung papan. */
        seam: string;
        /** Serat kayu. */
        grain: string;
    };
    /** Inlay herringbone di depan pintu masuk: dua warna dan bingkainya. */
    inlay: { light: string; dark: string; frame: string };
    /** Dinding kiri (berpintu) dan dinding kanan (panjang, di belakang kulkas). */
    wallLeft: string;
    wallRight: string;
    /** Wainscot berpanel di bagian bawah dinding, garis panelnya, dan lisnya. */
    wainscot: string;
    panel: string;
    rail: string;
    /** Mahkota di atas dinding dan garis di bawahnya. */
    crown: string;
    crownLine: string;
    /** Plint di kaki dinding. */
    plinth: string;
    /**
     * Alas diorama di tepi depan lantai (Tahap 5F: balok tebal berpola bata):
     * lis hijau, garis bayangan di bawah lis, bata, nat, bata terang sesekali,
     * dan garis bawah. Sisi kiri lebih terang dari sisi kanan.
     */
    base: {
        left: BaseFace;
        right: BaseFace;
        edge: string;
    };
    door: {
        frame: string;
        frameLine: string;
        glass: string;
        shine: string;
        handle: string;
    };
};

export type BaseFace = {
    lip: string;
    lipShadow: string;
    brick: string;
    brickLight: string;
    mortar: string;
};

const T = 32;
const fl = Math.floor;
/**
 * Tebal alas diorama di tepi depan lantai. Tahap 5F: 6 → 23 px (lis 4, garis
 * bayangan 1, tiga lapis bata setinggi 6 dengan natnya), ditambah garis bawah.
 */
export const BASE_H = 23;
/** Baris lis hijau di atas alas, lalu baris bayangannya. */
const LIP_ROWS = 4;
/** Tinggi satu lapis bata (5 baris bata + 1 baris nat) dan panjang satu bata. */
const COURSE = 6;
const BRICK_W = 12;

/** Skema ruangan pilihan pemilik (Tahap 5G): konsep v4 "cozy elegan". */
export const ROOM_SCHEME: RoomScheme = {
    // Latar gelap hangat supaya balok toko tampak melayang.
    background: M('latar'),
    floor: {
        planks: [M('walnut-2'), M('walnut-1'), M('walnut-3')],
        seam: M('walnut-6'),
        grain: M('walnut-4'),
    },
    inlay: {
        light: M('marmer'),
        dark: M('burgundi-gelap'),
        frame: M('kuningan'),
    },
    wallLeft: M('mawar'),
    wallRight: M('ivory'),
    wainscot: M('wainscot'),
    panel: M('panel'),
    rail: M('kuningan'),
    crown: M('wainscot'),
    crownLine: M('kuningan'),
    plinth: M('walnut-6'),
    base: {
        left: {
            lip: M('kuningan'),
            lipShadow: M('kuningan-gelap'),
            brick: M('walnut-4'),
            brickLight: M('walnut-2'),
            mortar: M('walnut-6'),
        },
        right: {
            lip: M('kuningan-gelap'),
            lipShadow: M('walnut-7'),
            brick: M('walnut-5'),
            brickLight: M('walnut-4'),
            mortar: M('walnut-7'),
        },
        edge: C(1),
    },
    door: {
        frame: M('walnut-5'),
        frameLine: M('kuningan'),
        glass: C(18),
        shine: C(4),
        handle: M('kuningan'),
    },
};

/** Tinggi wainscot dari lantai (di atas plint) dan jarak garis panelnya. */
const WAINSCOT_TOP = 30;
const PANEL_EVERY = 16;

/**
 * Warna satu piksel sisi alas: u = kolom sepanjang sisi, d = baris di bawah tepi
 * lantai (0 = tepi lantai, BASE_H = garis bawah). Bata bersusun selang-seling.
 */
export function baseFaceColor(
    face: BaseFace,
    edge: string,
    u: number,
    d: number,
): string {
    if (d >= BASE_H) {
        return edge;
    }

    if (d < LIP_ROWS) {
        return face.lip;
    }

    if (d === LIP_ROWS) {
        return face.lipShadow;
    }

    const row = d - LIP_ROWS - 1;
    const course = fl(row / COURSE);

    if (row % COURSE === COURSE - 1) {
        return face.mortar;
    }

    const shifted = u + (course % 2 === 1 ? BRICK_W / 2 : 0);

    if (shifted % BRICK_W === 0) {
        return face.mortar;
    }

    // Sesekali bata lebih terang (pola tetap, bukan acak), memberi tekstur.
    const brick = fl(shifted / BRICK_W);

    return (brick * 7 + course * 3) % 5 === 0 ? face.brickLight : face.brick;
}

/**
 * Alas balok toko di bawah tepi depan lantai: sisi kiri (sepanjang gx, tepi
 * gy = height) dan sisi kanan (sepanjang gy, tepi gx = width), setebal BASE_H
 * plus garis bawah. Ubin lantai digambar sesudahnya dan menutup baris teratas.
 */
function drawBase(
    ctx: CanvasRenderingContext2D,
    scene: StoreScene,
    scheme: RoomScheme,
): void {
    const a = scene.width * T;
    const b = scene.height * T;
    const { left, right, edge } = scheme.base;

    // Satu fillRect per warna yang bersambung dalam satu kolom.
    const column = (x: number, top: number, face: BaseFace, u: number) => {
        let run = 0;

        for (let d = 1; d <= BASE_H + 1; d++) {
            const color = baseFaceColor(face, edge, u, run);

            if (d === BASE_H + 1 || baseFaceColor(face, edge, u, d) !== color) {
                ctx.fillStyle = color;
                ctx.fillRect(x, top + run, 1, d - run);
                run = d;
            }
        }
    };

    for (let i = 0; i < a; i++) {
        column(ORIGIN.x - b + i, ORIGIN.y + fl(b / 2) + fl(i / 2), left, i);
    }

    for (let j = 0; j < b; j++) {
        column(
            ORIGIN.x + a - b + j,
            ORIGIN.y + fl((a + b) / 2) - fl(j / 2),
            right,
            j,
        );
    }
}

/** Lebar satu papan (searah gy) dan panjangnya (searah gx), dalam satuan lantai. */
export const PLANK_W = 8;
const PLANK_L = 48;

/**
 * Letak inlay herringbone di depan pintu masuk, dalam satuan lantai (i searah gx,
 * j searah gy): menempel ke dinding kiri, sepanjang dua baris pintu ditambah
 * setengah tile di kedua sisinya.
 */
export function inlayRect(scene: StoreScene): {
    i0: number;
    i1: number;
    j0: number;
    j1: number;
} {
    const [doorTop, doorBottom] = doorRowsOf(scene);

    return {
        i0: 4,
        i1: 76,
        j0: (doorTop - 0.5) * T,
        j1: (doorBottom + 1.5) * T,
    };
}

/** Bingkai kuningan inlay (satuan lantai). */
const INLAY_FRAME = 3;

/**
 * Warna satu titik lantai (satuan lantai): inlay herringbone di depan pintu,
 * selain itu papan walnut searah gx dengan sambungan selang-seling dan serat.
 * Jalur kasir tidak lagi diberi karpet (Tahap 5G).
 */
export function floorColorAt(
    scheme: RoomScheme,
    inlay: ReturnType<typeof inlayRect>,
    i: number,
    j: number,
): string {
    if (i >= inlay.i0 && i < inlay.i1 && j >= inlay.j0 && j < inlay.j1) {
        const frame =
            i < inlay.i0 + INLAY_FRAME ||
            i >= inlay.i1 - INLAY_FRAME ||
            j < inlay.j0 + INLAY_FRAME ||
            j >= inlay.j1 - INLAY_FRAME;

        if (frame) {
            return scheme.inlay.frame;
        }

        // Chevron: pita selebar 8 bergantian arah, lapis setinggi 6.
        const u = i - inlay.i0 - INLAY_FRAME;
        const w = j - inlay.j0 - INLAY_FRAME;
        const slope = fl(u / 8) % 2 === 0 ? u % 8 : 7 - (u % 8);

        return fl((w + slope) / 6) % 2 === 0
            ? scheme.inlay.light
            : scheme.inlay.dark;
    }

    const f = scheme.floor;
    const plank = fl(j / PLANK_W);
    const offset = (plank * 19) % PLANK_L;

    if (j % PLANK_W === 0 || (i + offset) % PLANK_L === 0) {
        return f.seam;
    }

    if ((i * 3 + plank * 7) % 23 === 0 || (i + plank * 5) % 31 === 0) {
        return f.grain;
    }

    // Nada papan bergiliran tetap (bukan acak) per papan dan per potongan.
    const piece = fl((i + offset) / PLANK_L);

    return f.planks[(((plank * 73856093) ^ (piece * 19349663)) >>> 0) % 3];
}

/** Lantai papan dan inlay, digambar per titik lantai (sekali per waktu, bersama latar). */
function drawFloor(
    ctx: CanvasRenderingContext2D,
    scene: StoreScene,
    scheme: RoomScheme,
): void {
    const a = scene.width * T;
    const b = scene.height * T;
    const inlay = inlayRect(scene);

    for (let j = 0; j < b; j++) {
        for (let i = 0; i < a; i++) {
            ctx.fillStyle = floorColorAt(scheme, inlay, i, j);
            ctx.fillRect(ORIGIN.x + i - j, ORIGIN.y + fl((i + j) / 2), 1, 1);
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

/**
 * Satu kolom dinding di x dengan kaki di base: warna dinding, wainscot berpanel
 * dengan lis kuningan di atasnya, mahkota dengan garisnya, dan plint walnut.
 * k = urutan kolom sepanjang dinding (untuk garis panel).
 */
function wallColumn(
    ctx: CanvasRenderingContext2D,
    scheme: RoomScheme,
    x: number,
    base: number,
    color: string,
    k: number,
): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, base - WALL_H, 1, WALL_H);
    ctx.fillStyle = scheme.wainscot;
    ctx.fillRect(x, base - WAINSCOT_TOP, 1, WAINSCOT_TOP - 8);

    if (k % PANEL_EVERY < 2) {
        ctx.fillStyle = scheme.panel;
        ctx.fillRect(x, base - WAINSCOT_TOP + 3, 1, WAINSCOT_TOP - 14);
    }

    ctx.fillStyle = scheme.rail;
    ctx.fillRect(x, base - WAINSCOT_TOP - 1, 1, 1);
    ctx.fillStyle = scheme.crown;
    ctx.fillRect(x, base - WALL_H, 1, 4);
    ctx.fillStyle = scheme.crownLine;
    ctx.fillRect(x, base - WALL_H + 4, 1, 1);
    ctx.fillStyle = scheme.plinth;
    ctx.fillRect(x, base - 8, 1, 8);
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
                ctx.fillStyle = scheme.door.frameLine;
                ctx.fillRect(x, base - WALL_H + 9, 1, 1);

                if (post || i % 16 === 0) {
                    ctx.fillStyle = scheme.door.frame;
                    ctx.fillRect(x, base - WALL_H + 10, 1, WALL_H - 10);
                }

                continue;
            }

            wallColumn(ctx, scheme, x, base, scheme.wallLeft, gy * HALF_W + i);
        }
    }

    drawDoorGlass(ctx, scene, time, scheme);

    // Dinding kanan (sepanjang gx, di atas baris gy = 0).
    for (let gx = 0; gx < scene.width; gx++) {
        const { x: cx, y: ty } = tileTop(gx, 0);

        for (let i = 0; i < HALF_W; i++) {
            wallColumn(
                ctx,
                scheme,
                cx + i,
                ty + fl(i / 2),
                scheme.wallRight,
                gx * HALF_W + i,
            );
        }
    }
}

/**
 * Seluruh ruangan statis: latar, alas, lantai papan, inlay, dinding, pintu (kaca
 * menampilkan pemandangan luar menurut waktu). Dirender sekali per waktu.
 */
export function drawRoom(
    ctx: CanvasRenderingContext2D,
    scene: StoreScene,
    width: number,
    height: number,
    scheme: RoomScheme = ROOM_SCHEME,
    time: TimeOfDay = 'siang',
    /**
     * Digambar tepat setelah latar dan sebelum balok toko (Tahap 5F: bayangan
     * jatuh di bawah balok). Efek boleh memakai warna campuran; ruangan tidak.
     */
    underlay?: (ctx: CanvasRenderingContext2D) => void,
): void {
    const doorRows = doorRowsOf(scene);

    ctx.fillStyle = scheme.background;
    ctx.fillRect(0, 0, width, height);
    underlay?.(ctx);

    // Alas diorama: sisi depan lantai setebal BASE_H, papan menutup bagian atasnya.
    drawBase(ctx, scene, scheme);
    drawFloor(ctx, scene, scheme);
    drawWalls(ctx, scene, scheme, doorRows, time);
}

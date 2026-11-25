/**
 * Hiasan dinding menurut waktu dan lapisan malam (rancangan bagian 8):
 * 1. latar (dirender sekali per waktu): ruangan, hiasan dinding, lalu saat senja
 *    dan malam lapisan biru malam, kaca jendela dan pintu yang tetap terang, serta
 *    lampu dinding yang menyala dengan cahayanya;
 * 2. benda dan aktor digambar di lapisan terpisah, diredupkan lapisan biru yang
 *    sama, lalu ditempel ke atas latar (jadi tetap menutupi jendela dan pintu);
 * 3. bagian benda yang menyala (papan nama vending, layar mini) digambar ulang
 *    terang, lalu pendar hangat di lantai.
 * Semua warna dari palet 24; lapisan dan pendar memakai transparansi.
 */
import { tileCenter, tileTop } from '../engine/iso';
import {
    CLOCK_TIME,
    NIGHT_STRENGTH,
    PAINTINGS,
    WALL_DECOR,
    clockMatrix,
    hangOnWall,
    lampMatrix,
    wallDecorCenter,
    windowGlass,
    windowMatrix,
} from '../sprites/decor-sprite';
import type {
    PaintingKey,
    TimeOfDay,
    WallDecor,
} from '../sprites/decor-sprite';
import { C, M } from '../sprites/palette';
import type { PixelMatrix } from '../sprites/pixels';
import { VENDING_HEIGHT } from '../sprites/vending-sprite';
import { leftDot } from './pixel';

/** Kekuatan lapisan biru malam saat malam penuh (rancangan 5A). */
export const NIGHT_ALPHA = 0.42;

const LAMP_SIZE = { width: 7, height: 9 } as const;

/**
 * Warna latar di luar ruangan setelah lapisan malam (sama dengan piksel pojok
 * kanvas). Dipakai untuk mengisi layar di sekeliling kanvas di Beranda supaya
 * kanvas menyatu dengan layar. Tahap 5G: latar gelap hangat (palet bahan); saat
 * senja dan malam bercampur dengan biru malam seperti seluruh kanvas.
 */
export function backdropColor(
    time: TimeOfDay,
    base: string = M('latar'),
): string {
    const a = NIGHT_ALPHA * NIGHT_STRENGTH[time];
    const mix = (from: string, to: string, shift: number) => {
        const f = (parseInt(from.slice(1), 16) >> shift) & 255;
        const t = (parseInt(to.slice(1), 16) >> shift) & 255;

        return Math.round(f + (t - f) * a);
    };
    const night = C(24);
    const hex = [16, 8, 0]
        .map((s) => mix(base, night, s).toString(16).padStart(2, '0'))
        .join('');

    return `#${hex}`;
}

/**
 * Rona hangat Beranda (Tahap 5G, konsep v4 "senja keemasan"): lapisan oranye
 * lembut bercampur soft-light di atas diorama saat siang dan senja; malam tidak
 * (kehangatan malam dari kolam cahaya lampu). Efek, bukan sprite.
 */
export const WARM_TINT: Record<TimeOfDay, number> = {
    siang: 0.22,
    senja: 0.32,
    malam: 0,
};

export function warmTint(time: TimeOfDay): string | null {
    return WARM_TINT[time] > 0
        ? `rgba(240, 140, 90, ${WARM_TINT[time]})`
        : null;
}

/** Kepekatan vinyet di sudut layar Beranda menurut waktu (Tahap 5F). */
export const VIGNETTE_ALPHA: Record<TimeOfDay, number> = {
    siang: 0.5,
    senja: 0.6,
    malam: 0.72,
};

/**
 * Gradasi radial vinyet Beranda (efek, boleh warna campuran): tengah bening,
 * sudut gelap kebiruan, lebih pekat saat senja dan malam.
 */
export function vignette(time: TimeOfDay): string {
    // Gelap hangat (Tahap 5G), senada dengan latar.
    const ink = '18, 11, 13';

    return `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(${ink}, 0) 55%, rgba(${ink}, ${VIGNETTE_ALPHA[time]}) 100%)`;
}

/** Gambar hiasan dinding untuk waktu ini (null = bukan hiasan dinding). */
export function decorMatrix(key: string, time: TimeOfDay): PixelMatrix | null {
    if (key.startsWith('lukisan-')) {
        const painting = PAINTINGS[key.slice('lukisan-'.length) as PaintingKey];

        return painting ? painting() : null;
    }

    if (key === 'jendela') {
        return windowMatrix(time);
    }

    if (key === 'jam') {
        const [h, m] = CLOCK_TIME[time];

        return clockMatrix(h, m);
    }

    if (key.startsWith('lampu-')) {
        return lampMatrix(time !== 'siang');
    }

    return null;
}

/** Lukisan, jam, jendela, dan lampu di dinding untuk waktu ini (bagian latar). */
export function drawWallDecor(
    ctx: CanvasRenderingContext2D,
    time: TimeOfDay,
): void {
    for (const decor of WALL_DECOR) {
        const m = decorMatrix(decor.key, time);

        if (m) {
            hangOnWall(ctx, m, decor);
        }
    }
}

/** Lingkaran cahaya berpiksel (lonjong 2:1, tanpa anti-alias), warna palet tembus pandang. */
export function glow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    alpha: number,
): void {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;

    for (let dy = -r; dy <= r; dy++) {
        const half = Math.floor(Math.sqrt(r * r - dy * dy) * 2);
        ctx.fillRect(x - half, y + Math.floor(dy / 2), half * 2 + 1, 1);
    }

    ctx.globalAlpha = 1;
}

/**
 * Lingkaran cahaya di dinding: tegak, miring mengikuti dinding (slope 0.5 untuk
 * dinding kanan, -0.5 untuk dinding kiri, 0 untuk bidang datar).
 */
export function wallGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    slope: number,
    color: string,
    alpha: number,
): void {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;

    for (let u = -r; u <= r; u++) {
        const half = Math.floor(Math.sqrt(r * r - u * u));
        ctx.fillRect(x + u, y + Math.round(u * slope) - half, 1, half * 2 + 1);
    }

    ctx.globalAlpha = 1;
}

/**
 * Lapisan biru malam di seluruh kanvas. Tidak menggambar apa pun saat siang.
 * `atop` = hanya di atas piksel yang sudah ada (lapisan benda dan aktor yang
 * terpisah), jadi bagian kosong tetap tembus pandang.
 */
export function drawNightOverlay(
    ctx: CanvasRenderingContext2D,
    time: TimeOfDay,
    width: number,
    height: number,
    atop = false,
): void {
    const strength = NIGHT_STRENGTH[time];

    if (strength <= 0) {
        return;
    }

    ctx.globalCompositeOperation = atop ? 'source-atop' : 'source-over';
    ctx.globalAlpha = NIGHT_ALPHA * strength;
    ctx.fillStyle = C(24);
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}

const lamps = (): WallDecor[] =>
    WALL_DECOR.filter((d) => d.key.startsWith('lampu-'));

/**
 * Kaca jendela (langit di luar tetap terang) dan lampu dinding yang menyala,
 * digambar ulang di atas lapisan malam, dengan lingkaran cahaya di dinding.
 * Bagian latar: benda dan aktor di depannya tetap menutupinya.
 */
export function drawLitWall(
    ctx: CanvasRenderingContext2D,
    time: TimeOfDay,
): void {
    const strength = NIGHT_STRENGTH[time];

    if (strength <= 0) {
        return;
    }

    const pane = WALL_DECOR.find((d) => d.key === 'jendela');

    if (pane) {
        hangOnWall(ctx, windowGlass(time), pane);
    }

    for (const lamp of lamps()) {
        drawLampLight(ctx, lamp, strength);
    }
}

/** Lingkaran cahaya hangat di dinding, lampu menyala, dan kilau di bola lampunya. */
function drawLampLight(
    ctx: CanvasRenderingContext2D,
    lamp: WallDecor,
    strength: number,
): void {
    const c = wallDecorCenter(lamp, LAMP_SIZE.width, LAMP_SIZE.height);
    const slope = lamp.side === 'kanan' ? 0.5 : -0.5;
    wallGlow(ctx, c.x, c.y + 6, 15, slope, C(11), 0.1 * strength);
    wallGlow(ctx, c.x, c.y + 5, 9, slope, C(11), 0.14 * strength);
    hangOnWall(ctx, lampMatrix(true), lamp);
    wallGlow(ctx, c.x, c.y + 3, 2, slope, C(11), 0.45 * strength);
}

/** Cahaya kaca vending machine di lantai depannya (tile gx, gy + 1). */
export function drawVendingGlow(
    ctx: CanvasRenderingContext2D,
    gx: number,
    gy: number,
    time: TimeOfDay,
): void {
    const strength = NIGHT_STRENGTH[time];

    if (strength <= 0) {
        return;
    }

    const floor = tileCenter(gx, gy + 1);
    glow(ctx, floor.x, floor.y - 4, 14, C(11), 0.14 * strength);

    // Kaca berisi botol bercahaya lembut (muka depan vending: kolom 3..19, baris 16..55).
    const { x, y } = tileTop(gx, gy);
    ctx.globalAlpha = 0.16 * strength;
    leftDot(ctx, x + 1, y, 22, VENDING_HEIGHT, 3, 16, C(11), 17, 40);
    ctx.globalAlpha = 1;
}

/** Pendar layar mini kasir (hijau saat harian, kuning saat menampilkan total belanja). */
export function drawScreenGlow(
    ctx: CanvasRenderingContext2D,
    gx: number,
    gy: number,
    paying: boolean,
    time: TimeOfDay,
): void {
    const strength = NIGHT_STRENGTH[time];

    if (strength <= 0) {
        return;
    }

    // Muka layar di puncak tile kanan meja: x -26..+2, y -29..-5 dari puncak tile.
    const { x, y } = tileTop(gx, gy);
    glow(ctx, x - 12, y - 17, 13, paying ? C(11) : C(9), 0.22 * strength);
}

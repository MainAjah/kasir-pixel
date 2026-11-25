/**
 * Efek kedalaman 2.5D bergaya HD-2D (Tahap 5F). Hanya efek: boleh memakai warna
 * campuran dan transparansi (keputusan pemilik), sedangkan sprite tetap 24 warna
 * palet. Bayangan lembut dibuat dengan lapisan bertumpuk dan gradasi, tanpa
 * `ctx.filter`, supaya hasilnya sama di semua browser.
 *
 * Semua yang statis (bayangan balok, oklusi sudut, bayangan perabot) dirender
 * sekali per waktu bersama latar; bayangan karakter digambar tiap bingkai dari
 * satu gambar lembut yang dipra-render.
 *
 * Bidang lantai digambar lewat transformasi "ruang lantai": satu satuan searah gx
 * = (1, ½) px di layar, searah gy = (−1, ½) px, satu tile = 32 satuan. Gradasi di
 * ruang itu otomatis sejajar dengan dinding dan tepi lantai.
 */
import { ORIGIN, WALL_H } from '../engine/iso';
import type { Point } from '../engine/iso';
import type { Furniture, StoreScene } from '../scenes/store-scene';
import { NIGHT_STRENGTH } from '../sprites/decor-sprite';
import type { TimeOfDay } from '../sprites/decor-sprite';
import { BASE_H } from '../sprites/room-sprite';

const T = 32;

/** Warna bayangan efek: gelap hangat, lebih gelap dari latar (Tahap 5G). */
export const SHADOW_INK = '#140b0d';
const INK_RGB = '20, 11, 13';

const ink = (alpha: number) => `rgba(${INK_RGB}, ${alpha})`;

/**
 * Kekuatan oklusi dan bayangan kontak menurut waktu: tetap ada di malam hari,
 * tetapi lebih lemah karena cahaya utamanya (matahari) hilang.
 */
export function shadowStrength(time: TimeOfDay): number {
    return 1 - 0.4 * NIGHT_STRENGTH[time];
}

/** Pindah ke ruang lantai (lihat atas). Panggil di antara save() dan restore(). */
export function toFloor(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0.5, -1, 0.5, ORIGIN.x, ORIGIN.y);
}

/** Bidang dinding kanan (sepanjang gx): x = satuan gx, y = naik (negatif) dari lantai. */
function toRightWall(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0.5, 0, 1, ORIGIN.x, ORIGIN.y);
}

/** Bidang dinding kiri (sepanjang gy): x = satuan gy, y = naik (negatif) dari lantai. */
function toLeftWall(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(-1, 0.5, 0, 1, ORIGIN.x, ORIGIN.y);
}

/** Ukuran oklusi sudut (satuan lantai dan piksel dinding) dan kepekatannya. */
export const OCCLUSION = {
    floorBand: 22,
    wallBand: 14,
    cornerBand: 18,
    floorAlpha: 0.3,
    wallAlpha: 0.2,
    cornerAlpha: 0.16,
};

/**
 * Oklusi sudut: lantai lebih gelap di kaki kedua dinding dan di pojok belakang,
 * kaki dinding sedikit gelap, dan sudut tegak tempat dua dinding bertemu.
 */
export function drawAmbientOcclusion(
    ctx: CanvasRenderingContext2D,
    scene: Pick<StoreScene, 'width' | 'height'>,
    strength = 1,
): void {
    const a = scene.width * T;
    const b = scene.height * T;
    const o = OCCLUSION;

    const band = (
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        alpha: number,
    ) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, ink(alpha * strength));
        g.addColorStop(1, ink(0));

        return g;
    };

    ctx.save();

    // Lantai di kaki dinding kanan (gy = 0) dan dinding kiri (gx = 0).
    toFloor(ctx);
    ctx.fillStyle = band(0, 0, 0, o.floorBand, o.floorAlpha);
    ctx.fillRect(0, 0, a, o.floorBand);
    ctx.fillStyle = band(0, 0, o.floorBand, 0, o.floorAlpha);
    ctx.fillRect(0, 0, o.floorBand, b);

    // Pojok belakang lantai sedikit lebih gelap lagi.
    const corner = ctx.createRadialGradient(0, 0, 0, 0, 0, o.floorBand * 2);
    corner.addColorStop(0, ink(o.floorAlpha * 0.7 * strength));
    corner.addColorStop(1, ink(0));
    ctx.fillStyle = corner;
    ctx.fillRect(0, 0, o.floorBand * 2, o.floorBand * 2);

    // Kaki dinding kanan, dan sudut tegak di pojok belakang.
    toRightWall(ctx);
    ctx.fillStyle = band(0, 0, 0, -o.wallBand, o.wallAlpha);
    ctx.fillRect(0, -o.wallBand, a, o.wallBand);
    ctx.fillStyle = band(0, 0, o.cornerBand, 0, o.cornerAlpha);
    ctx.fillRect(0, -WALL_H, o.cornerBand, WALL_H);

    // Kaki dinding kiri, dan sisi lain sudut tegak.
    toLeftWall(ctx);
    ctx.fillStyle = band(0, 0, 0, -o.wallBand, o.wallAlpha);
    ctx.fillRect(0, -o.wallBand, b, o.wallBand);
    ctx.fillStyle = band(0, 0, o.cornerBand, 0, o.cornerAlpha);
    ctx.fillRect(0, -WALL_H, o.cornerBand, WALL_H);

    ctx.restore();
}

/** Bayangan kontak perabot: pelebaran, lapisan pelunak, dan kepekatan di tengah. */
export const FURNITURE_SHADOW = {
    margin: 3,
    layers: 6,
    spread: 2,
    alpha: 0.42,
};

/**
 * Pergeseran bayangan perabot menjauhi jendela (dinding kanan, ujung depan):
 * ke arah +gy dan sedikit −gx, makin tinggi benda makin jauh. Satuan lantai.
 */
export function furnitureShadowOffset(height: number): {
    di: number;
    dj: number;
} {
    const t = Math.min(height, 64);

    return { di: -Math.round(t * 0.06), dj: Math.round(t * 0.1) };
}

/**
 * Persegi jejak bayangan satu perabot di ruang lantai (sebelum dilunakkan):
 * jejaknya, sedikit dilebarkan, lalu digeser menjauhi jendela.
 */
export function furnitureShadowRect(item: Furniture): {
    x: number;
    y: number;
    w: number;
    h: number;
} {
    const m = FURNITURE_SHADOW.margin;
    const { di, dj } = furnitureShadowOffset(item.height);

    return {
        x: item.gx * T - m + di,
        y: item.gy * T - m + dj,
        w: item.w * T + 2 * m,
        h: item.h * T + 2 * m,
    };
}

/**
 * Bayangan kontak lembut di lantai di bawah tiap perabot (rak, meja, vending,
 * bangku, tanaman). Digambar di latar, jadi perabot menutup bagian tengahnya dan
 * yang terlihat hanya pinggiran lembut di sekelilingnya. Dipotong ke bidang
 * lantai supaya tidak menggelapkan dinding atau sisi balok.
 */
export function drawFurnitureShadows(
    ctx: CanvasRenderingContext2D,
    scene: Pick<StoreScene, 'width' | 'height' | 'furniture'>,
    strength = 1,
): void {
    const s = FURNITURE_SHADOW;

    ctx.save();
    toFloor(ctx);
    ctx.beginPath();
    ctx.rect(0, 0, scene.width * T, scene.height * T);
    ctx.clip();
    ctx.fillStyle = SHADOW_INK;

    for (const item of scene.furniture) {
        const r = furnitureShadowRect(item);

        for (let k = 0; k < s.layers; k++) {
            const e = k * s.spread;
            ctx.globalAlpha = (s.alpha / s.layers) * strength;
            ctx.fillRect(r.x - e, r.y - e, r.w + 2 * e, r.h + 2 * e);
        }
    }

    ctx.restore();
}

/**
 * Gambar bayangan lembut berbentuk elips (w × h px) untuk karakter: gelap di
 * tengah, pudar ke pinggir. Dipra-render sekali per ukuran oleh pemanggil.
 */
export function paintSoftShadow(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
): void {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    g.addColorStop(0, ink(0.62));
    g.addColorStop(0.55, ink(0.4));
    g.addColorStop(1, ink(0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** Ukuran bayangan lembut karakter dari lebar jejaknya (s = setengah lebar belah ketupat lama). */
export function characterShadowSize(s: number): { w: number; h: number } {
    const w = 2 * s + 8;

    return { w, h: Math.round(w / 2) };
}

/**
 * Empat sudut lantai toko di layar pada ketinggian lantai: belakang (puncak),
 * kanan, depan, dan kiri.
 */
export function floorCorners(scene: Pick<StoreScene, 'width' | 'height'>): {
    back: Point;
    right: Point;
    front: Point;
    left: Point;
} {
    const a = scene.width * T;
    const b = scene.height * T;

    return {
        back: { x: ORIGIN.x, y: ORIGIN.y },
        right: { x: ORIGIN.x + a, y: ORIGIN.y + a / 2 },
        front: { x: ORIGIN.x + a - b, y: ORIGIN.y + (a + b) / 2 },
        left: { x: ORIGIN.x - b, y: ORIGIN.y + b / 2 },
    };
}

/** Jarak bayangan jatuh di bawah dasar balok, dan berapa lapis pelunaknya. */
export const BLOCK_SHADOW = { drop: 14, layers: 10, spread: 3, alpha: 0.11 };

/**
 * Bayangan jatuh lembut di bawah balok toko, seolah balok melayang di atas latar.
 * Bentuknya belah ketupat lantai yang diturunkan ke bawah dasar balok, dilunakkan
 * dengan lapisan yang makin lebar dan makin tipis. Digambar sebelum balok, jadi
 * yang terlihat hanya pinggirannya di bawah dan di samping balok.
 */
export function drawBlockShadow(
    ctx: CanvasRenderingContext2D,
    scene: Pick<StoreScene, 'width' | 'height'>,
): void {
    const c = floorCorners(scene);
    const down = BASE_H + BLOCK_SHADOW.drop;

    ctx.save();
    ctx.fillStyle = SHADOW_INK;

    for (let k = 0; k < BLOCK_SHADOW.layers; k++) {
        const e = k * BLOCK_SHADOW.spread;
        ctx.globalAlpha = BLOCK_SHADOW.alpha;
        ctx.beginPath();
        ctx.moveTo(c.back.x, c.back.y + down - e / 2);
        ctx.lineTo(c.right.x + e, c.right.y + down);
        ctx.lineTo(c.front.x, c.front.y + down + e / 2);
        ctx.lineTo(c.left.x - e, c.left.y + down);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

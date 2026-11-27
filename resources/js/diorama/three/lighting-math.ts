/**
 * Matematika cahaya sore diorama 3D (Tahap 5H langkah a3), murni tanpa
 * three.js supaya bisa dites di Node dan dicerminkan persis di shader sprite.
 *
 * - Matahari senja rendah (±18°) datang dari belakang dinding kanan dan dari
 *   sisi kanan yang terbuka: setengah belakang lantai tertutup bayangan dinding
 *   kecuali berkas lewat kaca jendela, setengah depan bermandi cahaya jingga
 *   dengan bayangan panjang ke kiri depan.
 * - Jendela: hiasan `jendela` di dinding kanan (sama dengan Canvas).
 * - Oklusi ambien dipanggang ke warna vertex (kaki dinding, sekitar perabot).
 * - Lampu: rumus redaman yang sama dengan three.js (intensitas fisik, decay 2).
 */
import type { Furniture } from '../scenes/store-scene';
import { WALL_DECOR, windowMatrix } from '../sprites/decor-sprite';
import {
    DECOR_COLUMNS_PER_TILE,
    DECOR_OFFSET,
    furnitureBox,
} from './build-furniture';
import type { Box } from './build-furniture';
import type { Vec3 } from './camera-math';
import { DEG, TEXEL_V, WALL_H } from './space';

const normalize = (v: Vec3): Vec3 => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;

    return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * Arah dari adegan menuju matahari senja (ternormal): tiap satuan tinggi,
 * berkas bergeser 2 satuan ke −x dan 2,4 satuan ke +z.
 */
export const SUN_TOWARD: Vec3 = normalize([2.0, 1, -2.4]);

/** Sudut matahari di atas cakrawala (derajat). */
export const SUN_ELEVATION_DEG = Math.asin(SUN_TOWARD[1]) / DEG;

export type Rect = { x0: number; x1: number; y0: number; y1: number };

/** Kaca jendela (tanpa bingkai 2 piksel) di dinding kanan z = 0, satuan dunia. */
export function windowGlassRect(): Rect {
    const decor = WALL_DECOR.find((d) => d.key === 'jendela');
    const m = windowMatrix('senja');

    if (!decor) {
        return { x0: 0, x1: 0, y0: 0, y1: 0 };
    }

    const col = (c: number) => decor.tile + c / DECOR_COLUMNS_PER_TILE;

    return {
        x0: col(decor.offset + 2),
        x1: col(decor.offset + m.width - 2),
        y0: (decor.top - m.height + 2) * TEXEL_V,
        y1: (decor.top - 2) * TEXEL_V,
    };
}

/** Kusen silang jendela (penghalang sinar di dalam kaca), satuan dunia. */
export function windowMullions(): Rect[] {
    const decor = WALL_DECOR.find((d) => d.key === 'jendela');

    if (!decor) {
        return [];
    }

    const col = (c: number) => decor.tile + c / DECOR_COLUMNS_PER_TILE;
    const row = (r: number) => (decor.top - r) * TEXEL_V;
    const glass = windowGlassRect();

    return [
        // Kusen tegak kolom 12–13, kusen mendatar baris 13.
        {
            x0: col(decor.offset + 12),
            x1: col(decor.offset + 14),
            y0: glass.y0,
            y1: glass.y1,
        },
        { x0: glass.x0, x1: glass.x1, y0: row(14), y1: row(13) },
    ];
}

/** Uji sinar–kotak (slab): true bila sinar dari `p` ke arah `dir` mengenai kotak. */
export function rayHitsBox(p: Vec3, dir: Vec3, b: Box): boolean {
    let tmin = 1e-4;
    let tmax = Infinity;
    const lo = [b.x0, b.y0, b.z0];
    const hi = [b.x1, b.y1, b.z1];

    for (let i = 0; i < 3; i++) {
        if (Math.abs(dir[i]) < 1e-9) {
            if (p[i] < lo[i] || p[i] > hi[i]) {
                return false;
            }

            continue;
        }

        const t1 = (lo[i] - p[i]) / dir[i];
        const t2 = (hi[i] - p[i]) / dir[i];
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));

        if (tmin > tmax) {
            return false;
        }
    }

    return true;
}

/**
 * Apakah titik `p` terkena matahari: tidak terhalang dinding kanan (kecuali
 * lewat kaca jendela, di luar kusennya) dan tidak terhalang kotak perabot.
 * Rumus yang sama dipakai shader sprite (`SPRITE_FRAGMENT`).
 */
export function sunVisible(
    p: Vec3,
    boxes: readonly Box[],
    sceneWidth: number,
    glass: Rect = windowGlassRect(),
    mullions: readonly Rect[] = windowMullions(),
): boolean {
    const L = SUN_TOWARD;

    if (L[2] < 0 && p[2] > 0) {
        const s = p[2] / -L[2];
        const qx = p[0] + L[0] * s;
        const qy = p[1] + L[1] * s;

        if (qx >= 0 && qx <= sceneWidth && qy >= 0 && qy < WALL_H) {
            const inGlass =
                qx > glass.x0 &&
                qx < glass.x1 &&
                qy > glass.y0 &&
                qy < glass.y1;
            const onMullion = mullions.some(
                (m) => qx > m.x0 && qx < m.x1 && qy > m.y0 && qy < m.y1,
            );

            if (!inGlass || onMullion) {
                return false;
            }
        }
    }

    return !boxes.some((b) => rayHitsBox(p, L, b));
}

/**
 * Prisma berkas sinar: empat sudut kaca jendela (sedikit di depan dinding) dan
 * titik jatuhnya di lantai, searah sinar matahari.
 * Urutan sudut: kiri atas, kanan atas, kanan bawah, kiri bawah kaca.
 */
export function beamCorners(glass: Rect = windowGlassRect()): {
    window: [Vec3, Vec3, Vec3, Vec3];
    floor: [Vec3, Vec3, Vec3, Vec3];
} {
    const z = DECOR_OFFSET;
    const window: [Vec3, Vec3, Vec3, Vec3] = [
        [glass.x0, glass.y1, z],
        [glass.x1, glass.y1, z],
        [glass.x1, glass.y0, z],
        [glass.x0, glass.y0, z],
    ];
    const land = (w: Vec3): Vec3 => {
        const t = w[1] / SUN_TOWARD[1];

        return [w[0] - SUN_TOWARD[0] * t, 0, w[2] - SUN_TOWARD[2] * t];
    };

    return {
        window,
        floor: [
            land(window[0]),
            land(window[1]),
            land(window[2]),
            land(window[3]),
        ],
    };
}

/** Kotak perabot yang menghalangi sinar dan meneduhkan lantai di sekitarnya. */
export function furnitureBoxes(items: readonly Furniture[]): Box[] {
    return items.map(furnitureBox);
}

const ON_PLANE = 1e-3;

/**
 * Oklusi ambien di titik permukaan (1 = terbuka, makin kecil makin gelap):
 * lantai dekat dinding dan dekat tapak perabot, kaki dinding, dan bagian bawah
 * badan perabot. Dipanggang ke warna vertex sekali saat mulai.
 */
export function ambientOcclusion(p: Vec3, boxes: readonly Box[]): number {
    const [x, y, z] = p;
    let ao = 1;
    const near = (d: number, k: number, r: number) =>
        1 - k * Math.exp(-Math.max(0, d) / r);

    if (y < ON_PLANE) {
        // Lantai: kaki dinding kanan (z = 0) dan kiri (x = 0).
        ao *= near(z, 0.32, 0.45) * near(x, 0.32, 0.45);

        for (const b of boxes) {
            const dx = Math.max(b.x0 - x, 0, x - b.x1);
            const dz = Math.max(b.z0 - z, 0, z - b.z1);
            const tall = Math.min(1, (b.y1 - b.y0) / 1.2);
            ao *= near(Math.hypot(dx, dz), 0.38 * (0.5 + 0.5 * tall), 0.3);
        }
    } else if (Math.abs(z) < ON_PLANE || Math.abs(x) < ON_PLANE) {
        // Kaki dinding.
        ao *= near(y, 0.3, 0.35);
    } else {
        // Badan perabot: makin dekat lantai makin gelap.
        ao *= near(y, 0.28, 0.25);
    }

    return Math.max(0.45, Math.min(1, ao));
}

export type Lamp = {
    position: Vec3;
    /** Warna linear × intensitas (candela, seperti PointLight three.js). */
    color: Vec3;
    intensity: number;
    distance: number;
    decay: number;
};

/** Redaman jarak lampu titik, sama dengan `getDistanceAttenuation` three.js. */
export function lampFalloff(
    d: number,
    distance: number,
    decay: number,
): number {
    let f = 1 / Math.max(d ** decay, 0.01);

    if (distance > 0) {
        const r = Math.max(0, Math.min(1, 1 - (d / distance) ** 4));
        f *= r * r;
    }

    return f;
}

/** Irradiansi semua lampu di titik `p` (tanpa faktor arah; sprite menghadap kamera). */
export function lampIrradiance(p: Vec3, lamps: readonly Lamp[]): Vec3 {
    const out: [number, number, number] = [0, 0, 0];

    for (const lamp of lamps) {
        const d = Math.hypot(
            p[0] - lamp.position[0],
            p[1] - lamp.position[1],
            p[2] - lamp.position[2],
        );
        const f = lampFalloff(d, lamp.distance, lamp.decay) * lamp.intensity;
        out[0] += lamp.color[0] * f;
        out[1] += lamp.color[1] * f;
        out[2] += lamp.color[2] * f;
    }

    return out;
}

/** Bola lampu dinding di dunia: tengah baris bola (6–8) gambar lampu, sedikit di depan dinding. */
export function lampBulbPosition(key: string): Vec3 | null {
    const decor = WALL_DECOR.find((d) => d.key === key);

    if (!decor) {
        return null;
    }

    const along = (decor.offset + 3.5) / DECOR_COLUMNS_PER_TILE;
    const y = (decor.top - 7.5) * TEXEL_V;
    const out = 0.12;

    return decor.side === 'kanan'
        ? [decor.tile + along, y, out]
        : [out, y, decor.tile + 1 - along];
}

/**
 * Parameter debu dalam berkas: tiap butir (u, v) di kaca, t di sepanjang
 * berkas, dan fase kilau. Berbenih, jadi tetap untuk benih yang sama.
 */
export function dustParams(count: number, seed: number): Float32Array {
    const out = new Float32Array(count * 4);
    let s = seed >>> 0;
    const rand = () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let i = 0; i < count; i++) {
        out[i * 4] = rand();
        out[i * 4 + 1] = rand();
        out[i * 4 + 2] = 0.04 + rand() * 0.9;
        out[i * 4 + 3] = rand() * Math.PI * 2;
    }

    return out;
}

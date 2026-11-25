/**
 * Cahaya HD-2D (Tahap 5F langkah 3), bagian yang statis per waktu:
 * - sinar matahari dari jendela di dinding kanan: berkas cahaya di udara dan
 *   bidang cahaya hangat di lantai (siang kuning lampu, senja oranye kunyit yang
 *   lebih panjang dan redup, malam tidak ada);
 * - kolam cahaya kecil di lantai di bawah tiap lampu dinding saat senja dan malam.
 *
 * Hanya efek (boleh warna campuran, keputusan pemilik). Dicampur dengan mode
 * "screen" supaya hanya mencerahkan. Tanpa `ctx.filter`: pinggir lembut dari
 * gradasi dan lapisan bertumpuk. Dirender sekali per waktu bersama latar.
 */
import { ORIGIN } from '../engine/iso';
import type { Point } from '../engine/iso';
import type { StoreScene } from '../scenes/store-scene';
import {
    NIGHT_STRENGTH,
    WALL_DECOR,
    windowMatrix,
} from '../sprites/decor-sprite';
import type { TimeOfDay, WallDecor } from '../sprites/decor-sprite';
import { toFloor } from './depth';

const T = 32;
const fl = Math.floor;

/** Warna cahaya (RGB): kuning lampu dan oranye kunyit dari palet. */
const LAMP_RGB = '255, 233, 168';
const DUSK_RGB = '232, 155, 79';

/**
 * Arah sinar matahari per waktu: satu piksel turun di jendela = ki satuan searah
 * gx dan kj satuan searah gy di lantai. Senja: matahari lebih rendah, berkas lebih
 * panjang dan miring. Malam: tidak ada.
 */
export const SUN: Record<
    TimeOfDay,
    { ki: number; kj: number; rgb: string; patch: number; shaft: number } | null
> = {
    // Siang: jatuh di lantai kosong di samping penjaga Inventaris (tile 11,1–2),
    // tidak tertutup meja. Senja: lebih panjang ke tengah ruangan, sebagian di balik meja.
    siang: { ki: -0.15, kj: 1.3, rgb: LAMP_RGB, patch: 0.6, shaft: 0.22 },
    senja: { ki: -0.35, kj: 2.4, rgb: DUSK_RGB, patch: 0.5, shaft: 0.22 },
    malam: null,
};

const pane = (): WallDecor | undefined =>
    WALL_DECOR.find((d) => d.key === 'jendela');

/**
 * Kaca jendela di dinding kanan dalam koordinat dinding: u searah gx (satuan
 * lantai) dan z tinggi dari lantai (px). Tanpa bingkai 2 px.
 */
export function windowSpan(): {
    u0: number;
    u1: number;
    z0: number;
    z1: number;
} {
    const p = pane();
    const m = windowMatrix('siang');

    if (!p) {
        return { u0: 0, u1: 0, z0: 0, z1: 0 };
    }

    const u0 = p.tile * T + p.offset + 2;

    return {
        u0,
        u1: u0 + m.width - 4,
        z0: p.top - m.height + 2,
        z1: p.top - 2,
    };
}

/** Titik di dinding kanan (u, z) ke layar. */
function wallPoint(u: number, z: number): Point {
    return { x: ORIGIN.x + u, y: ORIGIN.y + u / 2 - z };
}

/** Titik di lantai (i searah gx, j searah gy, satuan lantai) ke layar. */
function floorPoint(i: number, j: number): Point {
    return { x: ORIGIN.x + i - j, y: ORIGIN.y + (i + j) / 2 };
}

/**
 * Bidang cahaya matahari di lantai (ruang lantai) untuk waktu ini: empat sudut
 * bayangan kaca jendela yang jatuh ke lantai. null saat malam.
 */
export function sunPatch(time: TimeOfDay): { i: number; j: number }[] | null {
    const sun = SUN[time];

    if (!sun) {
        return null;
    }

    const { u0, u1, z0, z1 } = windowSpan();
    const land = (u: number, z: number) => ({
        i: u + z * sun.ki,
        j: z * sun.kj,
    });

    return [land(u0, z0), land(u1, z0), land(u1, z1), land(u0, z1)];
}

/** Selubung cembung (urutan berlawanan jarum jam), untuk berkas cahaya di udara. */
export function convexHull(points: Point[]): Point[] {
    const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

    if (p.length < 3) {
        return p;
    }

    const cross = (o: Point, a: Point, b: Point) =>
        (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: Point[] = [];
    const upper: Point[] = [];

    for (const q of p) {
        while (
            lower.length >= 2 &&
            cross(lower.at(-2)!, lower.at(-1)!, q) <= 0
        ) {
            lower.pop();
        }

        lower.push(q);
    }

    for (const q of [...p].reverse()) {
        while (
            upper.length >= 2 &&
            cross(upper.at(-2)!, upper.at(-1)!, q) <= 0
        ) {
            upper.pop();
        }

        upper.push(q);
    }

    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const centroid = (pts: Point[]): Point => ({
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

/**
 * Sinar matahari: berkas di udara dari jendela ke lantai (pudar ke bawah) dan
 * bidang cahaya hangat berpinggir lembut di lantai. Tidak menggambar apa pun saat malam.
 */
export function drawSunlight(
    ctx: CanvasRenderingContext2D,
    scene: Pick<StoreScene, 'width' | 'height'>,
    time: TimeOfDay,
): void {
    const sun = SUN[time];
    const patch = sunPatch(time);

    if (!sun || !patch) {
        return;
    }

    const { u0, u1, z0, z1 } = windowSpan();
    const glass = [
        wallPoint(u0, z0),
        wallPoint(u1, z0),
        wallPoint(u1, z1),
        wallPoint(u0, z1),
    ];
    const floor = patch.map((q) => floorPoint(q.i, q.j));

    // Ditumpuk biasa (bukan "screen"): lantai krem dan mint sudah terang, jadi
    // cahaya hangat terlihat sebagai rona kuning atau oranye, bukan sekadar lebih putih.
    ctx.save();

    // Berkas di udara: selubung kaca + bidang lantai, terang di jendela, pudar ke lantai.
    const hull = convexHull([...glass, ...floor]);
    const from = centroid(glass);
    const to = centroid(floor);
    const beam = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    beam.addColorStop(0, `rgba(${sun.rgb}, ${sun.shaft})`);
    beam.addColorStop(1, `rgba(${sun.rgb}, 0)`);
    ctx.fillStyle = beam;
    ctx.beginPath();
    hull.forEach((q, n) =>
        n === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y),
    );
    ctx.closePath();
    ctx.fill();

    // Bidang di lantai (ruang lantai, dipotong ke lantai): empat lapis makin lebar
    // dan makin tipis memberi pinggir lembut; makin jauh dari jendela makin redup.
    toFloor(ctx);
    ctx.beginPath();
    ctx.rect(0, 0, scene.width * T, scene.height * T);
    ctx.clip();

    const near = Math.min(...patch.map((q) => q.j));
    const far = Math.max(...patch.map((q) => q.j));
    const c = {
        i: patch.reduce((s, q) => s + q.i, 0) / 4,
        j: patch.reduce((s, q) => s + q.j, 0) / 4,
    };
    const layers = 4;

    for (let k = 0; k < layers; k++) {
        const grow = 1 + k * 0.07;
        const fade = ctx.createLinearGradient(0, near, 0, far);
        const a = sun.patch / layers;
        fade.addColorStop(0, `rgba(${sun.rgb}, ${a})`);
        fade.addColorStop(1, `rgba(${sun.rgb}, ${a * 0.45})`);
        ctx.fillStyle = fade;
        ctx.beginPath();
        patch.forEach((q, n) => {
            const i = c.i + (q.i - c.i) * grow;
            const j = c.j + (q.j - c.j) * grow;

            if (n === 0) {
                ctx.moveTo(i, j);
            } else {
                ctx.lineTo(i, j);
            }
        });
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

/** Lebar gambar lampu dinding (px), untuk titik tengahnya. */
const LAMP_W = 7;
/** Jari-jari kolam cahaya lampu di lantai (satuan lantai) dan jaraknya dari dinding. */
export const LAMP_POOL = { radius: 44, fromWall: 18, alpha: 0.34 };

/** Titik tengah kolam cahaya tiap lampu dinding di lantai (ruang lantai). */
export function lampPoolCenters(): { i: number; j: number }[] {
    return WALL_DECOR.filter((d) => d.key.startsWith('lampu-')).map((d) =>
        d.side === 'kanan'
            ? { i: d.tile * T + d.offset + LAMP_W / 2, j: LAMP_POOL.fromWall }
            : {
                  i: LAMP_POOL.fromWall,
                  j: (d.tile + 1) * T - (d.offset + LAMP_W / 2),
              },
    );
}

/** Kolam cahaya hangat di lantai di bawah lampu dinding saat senja dan malam. */
export function drawLampPools(
    ctx: CanvasRenderingContext2D,
    scene: Pick<StoreScene, 'width' | 'height'>,
    time: TimeOfDay,
): void {
    const strength = NIGHT_STRENGTH[time];

    if (strength <= 0) {
        return;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    toFloor(ctx);
    ctx.beginPath();
    ctx.rect(0, 0, scene.width * T, scene.height * T);
    ctx.clip();

    for (const p of lampPoolCenters()) {
        const r = LAMP_POOL.radius;
        const g = ctx.createRadialGradient(p.i, p.j, 0, p.i, p.j, r);
        g.addColorStop(0, `rgba(${LAMP_RGB}, ${LAMP_POOL.alpha * strength})`);
        g.addColorStop(
            0.5,
            `rgba(${LAMP_RGB}, ${LAMP_POOL.alpha * 0.45 * strength})`,
        );
        g.addColorStop(1, `rgba(${LAMP_RGB}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(fl(p.i - r), fl(p.j - r), 2 * r, 2 * r);
    }

    ctx.restore();
}

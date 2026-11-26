/**
 * Matematika kamera diorama 3D (Tahap 5H), murni tanpa three.js supaya bisa
 * dites di Node: arah kamera, bingkai balok di layar, skala tampilan, geser
 * kursor berpegas, dan pembulatan ke grid piksel.
 */
import { DEG, FRAME_MARGIN, PX_PER_UNIT, YAW_DEG } from './space';

export type Vec3 = readonly [number, number, number];

/** Basis kamera: arah ke penonton (dari target), kanan layar, atas layar. */
export type CameraBasis = { back: Vec3; right: Vec3; up: Vec3 };

export function cameraBasis(pitchDeg: number, yawDeg = YAW_DEG): CameraBasis {
    const p = pitchDeg * DEG;
    const y = yawDeg * DEG;
    // Kamera berada di sisi +x +z (pojok depan toko), menghadap pojok belakang.
    const h: Vec3 = [Math.sin(y), 0, Math.cos(y)];
    const back: Vec3 = [h[0] * Math.cos(p), Math.sin(p), h[2] * Math.cos(p)];
    const right: Vec3 = [Math.cos(y), 0, -Math.sin(y)];
    // up = back × right
    const up: Vec3 = [
        back[1] * right[2] - back[2] * right[1],
        back[2] * right[0] - back[0] * right[2],
        back[0] * right[1] - back[1] * right[0],
    ];

    return { back, right, up };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Titik dunia → piksel dalam relatif terhadap proyeksi `origin` (ortografik, y ke atas). */
export function projectOrtho(
    point: Vec3,
    origin: Vec3,
    basis: CameraBasis,
    pxPerUnit = PX_PER_UNIT,
): { x: number; y: number } {
    const d: Vec3 = [
        point[0] - origin[0],
        point[1] - origin[1],
        point[2] - origin[2],
    ];

    return {
        x: dot(d, basis.right) * pxPerUnit,
        y: dot(d, basis.up) * pxPerUnit,
    };
}

export type Frame = {
    /** Lebar dan tinggi kotak pembatas di layar, termasuk margin (piksel dalam). */
    width: number;
    height: number;
    /** Titik dunia yang tampil di tengah kotak itu (target kamera). */
    center: Vec3;
};

/**
 * Kotak pembatas sekumpulan titik di layar dan target kamera yang membuatnya
 * tepat di tengah. Proyeksi ortografik (perspektif sempit cukup mendekati).
 * Target juga diletakkan di kedalaman tengah titik-titik itu, supaya bidang
 * fokus lensa perspektif melewati tengah balok (skala di sana tepat
 * PX_PER_UNIT; di depan dan belakangnya hanya sedikit berbeda).
 */
export function frameOf(
    points: readonly Vec3[],
    basis: CameraBasis,
    margin = FRAME_MARGIN,
): Frame {
    const origin: Vec3 = [0, 0, 0];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const p of points) {
        const s = projectOrtho(p, origin, basis);
        const depth = dot(p, basis.back);
        minX = Math.min(minX, s.x);
        maxX = Math.max(maxX, s.x);
        minY = Math.min(minY, s.y);
        maxY = Math.max(maxY, s.y);
        minZ = Math.min(minZ, depth);
        maxZ = Math.max(maxZ, depth);
    }

    const cx = (minX + maxX) / 2 / PX_PER_UNIT;
    const cy = (minY + maxY) / 2 / PX_PER_UNIT;
    const cz = (minZ + maxZ) / 2;

    return {
        width: maxX - minX + margin * 2,
        height: maxY - minY + margin * 2,
        center: [
            basis.right[0] * cx + basis.up[0] * cy + basis.back[0] * cz,
            basis.right[1] * cx + basis.up[1] * cy + basis.back[1] * cz,
            basis.right[2] * cx + basis.up[2] * cy + basis.back[2] * cz,
        ],
    };
}

export type Viewport = {
    /** Piksel perangkat per piksel dalam. Bulat bila memungkinkan. */
    scale: number;
    /** Ukuran gambar dalam (tanpa margin geser). */
    width: number;
    height: number;
    integer: boolean;
};

/**
 * Skala tampilan: kelipatan bulat terbesar yang memuat balok toko; bila
 * kelipatan bulat itu mengecilkan balok lebih dari 20% dibanding skala yang
 * pas (mis. layar 1366 × 768), dipakai skala pecahan seperti diorama Canvas.
 */
export function viewportFor(
    deviceW: number,
    deviceH: number,
    frame: Pick<Frame, 'width' | 'height'>,
    minRatio = 0.8,
): Viewport {
    const fit = Math.min(deviceW / frame.width, deviceH / frame.height);
    const whole = Math.floor(fit);
    const integer = whole >= 1 && whole / fit >= minRatio;
    const scale = integer ? whole : Math.max(fit, 0.25);

    return {
        scale,
        width: Math.ceil(deviceW / scale),
        height: Math.ceil(deviceH / scale),
        integer,
    };
}

/**
 * Pegas teredam kritis (tanpa memantul): satu langkah `dt` detik menuju
 * `target`. `omega` makin besar makin cepat; 8 ≈ tiba dalam ±0,6 detik.
 */
export function springStep(
    value: number,
    velocity: number,
    target: number,
    dt: number,
    omega = 8,
): { value: number; velocity: number } {
    const x = value - target;
    const e = Math.exp(-omega * dt);
    const temp = (velocity + omega * x) * dt;

    return {
        value: target + (x + temp) * e,
        velocity: (velocity - omega * temp) * e,
    };
}

/**
 * Geser kamera (satuan dunia) dibulatkan ke grid piksel dalam, supaya seluruh
 * gambar bergeser utuh per piksel (tidak berkilau). Sisa pecahannya (−0,5…0,5
 * piksel) diterapkan sebagai geser halus saat gambar diperbesar.
 */
export function snapToPixel(
    units: number,
    pxPerUnit = PX_PER_UNIT,
): { snapped: number; fraction: number } {
    const px = units * pxPerUnit;
    const whole = Math.round(px);

    return { snapped: whole / pxPerUnit, fraction: px - whole };
}

/** Geser maksimum mengikuti kursor (satuan dunia), ±0,15 ubin. */
export const DRIFT_MAX = 0.15;

/**
 * Target geser dari posisi kursor ternormal (−1…1, y ke bawah): kamera sedikit
 * mendekat ke arah kursor, jadi diorama bergeser halus berlawanan arah.
 */
export function driftTarget(
    nx: number,
    ny: number,
    max = DRIFT_MAX,
): { x: number; y: number } {
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    return { x: clamp(nx) * max, y: -clamp(ny) * max };
}

/** Jarak kamera perspektif agar bidang fokus tetap `PX_PER_UNIT` piksel per satuan. */
export function focusDistance(fovDeg: number, refHeightPx = 480): number {
    return refHeightPx / PX_PER_UNIT / 2 / Math.tan((fovDeg * DEG) / 2);
}

/** Sudut pandang vertikal perspektif untuk tinggi gambar `heightPx` di jarak `distance`. */
export function fovFor(heightPx: number, distance: number): number {
    return (2 * Math.atan(heightPx / PX_PER_UNIT / 2 / distance)) / DEG;
}

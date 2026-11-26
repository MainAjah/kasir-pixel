/**
 * Geometri balok toko 3D (Tahap 5H langkah a1), murni tanpa three.js: lantai
 * papan, dua dinding belakang (muka dalam, ujung, tutup), dan alas bata.
 * Semua muka memakai satu atlas, jadi seluruh balok cukup satu draw call.
 *
 * Belum ada cahaya: tiap muka hanya diberi kecerahan tetap (sisi +z terang,
 * sisi +x sedikit gelap, seperti alas Canvas) dan lantai variasi kecil per ubin.
 */
import type { AtlasFrame, AtlasLayout } from '../assets/atlas';
import { frameUv } from '../assets/atlas';
import { hash2 } from '../assets/procedural/noise';
import { STORE_KEYS } from '../assets/procedural-source';
import type { StoreScene } from '../scenes/store-scene';
import type { Vec3 } from './camera-math';
import { BASE_H, TEXELS_PER_TILE, WALL_H, WALL_T } from './space';

export type MeshArrays = {
    positions: number[];
    uvs: number[];
    colors: number[];
    indices: number[];
    /** Normal tiap quad (untuk tes arah muka). */
    normals: Vec3[];
};

/** Kecerahan tetap per arah muka (bukan cahaya; hanya agar bentuk terbaca). */
export const FACE_SHADE = { atas: 1, depanKiri: 1, depanKanan: 0.84 } as const;
/** Variasi kecerahan lantai per ubin (±). */
export const TILE_SHADE = 0.03;

type FrameLookup = (key: string) => AtlasFrame;

function sub(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

function normalize(v: Vec3): Vec3 {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;

    return [v[0] / l, v[1] / l, v[2] / l];
}

/**
 * Tambah satu quad. Sudut diberikan menurut gambar tekstur: kiri atas, kanan
 * atas, kanan bawah, kiri bawah. `region` (texel, opsional) memilih sebagian
 * bingkai. Urutan segitiga dibalik otomatis bila normalnya tidak searah `facing`.
 */
function quad(
    out: MeshArrays,
    corners: readonly [Vec3, Vec3, Vec3, Vec3],
    frame: AtlasFrame,
    layout: Pick<AtlasLayout, 'width' | 'height'>,
    facing: Vec3,
    shade: number,
    region?: { x: number; y: number; w: number; h: number },
): void {
    const r = region ?? { x: 0, y: 0, w: frame.w, h: frame.h };
    const uv = frameUv(
        { ...frame, x: frame.x + r.x, y: frame.y + r.y, w: r.w, h: r.h },
        layout,
    );
    const base = out.positions.length / 3;
    const [tl, tr, br, bl] = corners;
    const texture: readonly [number, number][] = [
        [uv.u0, uv.v0],
        [uv.u1, uv.v0],
        [uv.u1, uv.v1],
        [uv.u0, uv.v1],
    ];

    for (const [i, c] of [tl, tr, br, bl].entries()) {
        out.positions.push(c[0], c[1], c[2]);
        out.uvs.push(texture[i][0], texture[i][1]);
        out.colors.push(shade, shade, shade);
    }

    const n = normalize(cross(sub(bl, tl), sub(br, tl)));
    const aligned = n[0] * facing[0] + n[1] * facing[1] + n[2] * facing[2] > 0;

    if (aligned) {
        out.indices.push(base, base + 3, base + 2, base, base + 2, base + 1);
        out.normals.push(n);
    } else {
        out.indices.push(base, base + 2, base + 3, base, base + 1, base + 2);
        out.normals.push([-n[0], -n[1], -n[2]]);
    }
}

/** Kecerahan lantai ubin (gx, gy): 1 ± TILE_SHADE, tetap untuk benih yang sama. */
export function tileShade(gx: number, gy: number, seed = 17): number {
    return 1 + (hash2(seed, gx, gy) - 0.5) * 2 * TILE_SHADE;
}

/** Semua muka balok toko untuk denah `scene`. */
export function buildStore(
    scene: Pick<StoreScene, 'width' | 'height'>,
    layout: Pick<AtlasLayout, 'width' | 'height'>,
    frameOf: FrameLookup,
): MeshArrays {
    const out: MeshArrays = {
        positions: [],
        uvs: [],
        colors: [],
        indices: [],
        normals: [],
    };
    const X = scene.width;
    const Z = scene.height;
    const H = WALL_H;
    const B = BASE_H;
    const t = WALL_T;
    const T = TEXELS_PER_TILE;
    const up: Vec3 = [0, 1, 0];
    const plusX: Vec3 = [1, 0, 0];
    const plusZ: Vec3 = [0, 0, 1];

    // Lantai: satu quad per ubin (variasi kecerahan per ubin), satu tekstur utuh
    // sehingga papan menyambung lintas ubin.
    const floor = frameOf(STORE_KEYS.lantai);

    for (let gx = 0; gx < X; gx++) {
        for (let gz = 0; gz < Z; gz++) {
            quad(
                out,
                [
                    [gx, 0, gz],
                    [gx + 1, 0, gz],
                    [gx + 1, 0, gz + 1],
                    [gx, 0, gz + 1],
                ],
                floor,
                layout,
                up,
                tileShade(gx, gz),
                { x: gx * T, y: gz * T, w: T, h: T },
            );
        }
    }

    // Dinding kiri (bidang x = 0), muka dalam menghadap +x; kiri gambar = depan (z besar).
    quad(
        out,
        [
            [0, H, Z],
            [0, H, 0],
            [0, 0, 0],
            [0, 0, Z],
        ],
        frameOf(STORE_KEYS.dindingKiri),
        layout,
        plusX,
        FACE_SHADE.depanKanan,
    );
    // Dinding kanan (bidang z = 0), muka dalam menghadap +z; kiri gambar = pojok belakang.
    quad(
        out,
        [
            [0, H, 0],
            [X, H, 0],
            [X, 0, 0],
            [0, 0, 0],
        ],
        frameOf(STORE_KEYS.dindingKanan),
        layout,
        plusZ,
        FACE_SHADE.depanKiri,
    );
    // Ujung dinding kiri di depan (z = Z) dan ujung dinding kanan di kanan (x = X).
    quad(
        out,
        [
            [-t, H, Z],
            [0, H, Z],
            [0, 0, Z],
            [-t, 0, Z],
        ],
        frameOf(STORE_KEYS.ujungKiri),
        layout,
        plusZ,
        FACE_SHADE.depanKiri,
    );
    quad(
        out,
        [
            [X, H, 0],
            [X, H, -t],
            [X, 0, -t],
            [X, 0, 0],
        ],
        frameOf(STORE_KEYS.ujungKanan),
        layout,
        plusX,
        FACE_SHADE.depanKanan,
    );
    // Tutup dinding: baris terakhir gambar (lis kuningan) di tepi dalam.
    quad(
        out,
        [
            [-t, H, -t],
            [-t, H, Z],
            [0, H, Z],
            [0, H, -t],
        ],
        frameOf(STORE_KEYS.tutupKiri),
        layout,
        up,
        FACE_SHADE.atas,
    );
    quad(
        out,
        [
            [0, H, -t],
            [X, H, -t],
            [X, H, 0],
            [0, H, 0],
        ],
        frameOf(STORE_KEYS.tutupKanan),
        layout,
        up,
        FACE_SHADE.atas,
    );
    // Alas bata: muka depan-kiri (+z) dan depan-kanan (+x), menyambung di pojok depan.
    quad(
        out,
        [
            [-t, 0, Z],
            [X, 0, Z],
            [X, -B, Z],
            [-t, -B, Z],
        ],
        frameOf(STORE_KEYS.alasDepanKiri),
        layout,
        plusZ,
        FACE_SHADE.depanKiri,
    );
    quad(
        out,
        [
            [X, 0, Z],
            [X, 0, -t],
            [X, -B, -t],
            [X, -B, Z],
        ],
        frameOf(STORE_KEYS.alasDepanKanan),
        layout,
        plusX,
        FACE_SHADE.depanKanan,
    );

    return out;
}

/** Titik sudut balok (untuk membingkai kamera). */
export function storeCorners(
    scene: Pick<StoreScene, 'width' | 'height'>,
): Vec3[] {
    const X = scene.width;
    const Z = scene.height;
    const t = WALL_T;

    return [
        // Puncak dinding belakang.
        [-t, WALL_H, -t],
        [X, WALL_H, -t],
        [X, WALL_H, 0],
        [-t, WALL_H, Z],
        [0, WALL_H, Z],
        // Dasar alas.
        [-t, -BASE_H, Z],
        [X, -BASE_H, Z],
        [X, -BASE_H, -t],
    ];
}

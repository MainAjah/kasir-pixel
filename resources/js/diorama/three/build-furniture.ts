/**
 * Geometri perabot dan hiasan dinding 3D (Tahap 5H langkah a2), murni tanpa
 * three.js. Perabot = kotak bertekstur pixel (muka depan +z, kanan +x, atas),
 * posisi dan ukuran dari denah `STORE_SCENE` yang tidak berubah. Masuk ke
 * geometri yang sama dengan balok toko, jadi tetap satu draw call.
 *
 * Hiasan dinding (lampu) ditempel 1 piksel gambar = 1 piksel layar ke samping,
 * sama dengan cara Canvas menempelkannya (32 kolom per ubin sepanjang dinding).
 */
import type { AtlasFrame, AtlasLayout } from '../assets/atlas';
import { POT_SIZE, POT_TEXELS } from '../assets/procedural/furniture';
import { decorKey, furnitureKey } from '../assets/procedural-source';
import type { Furniture, StoreScene } from '../scenes/store-scene';
import { WALL_DECOR } from '../sprites/decor-sprite';
import { FACE_SHADE, quad } from './build-store';
import type { MeshArrays } from './build-store';
import type { Vec3 } from './camera-math';
import { TEXEL, TEXEL_V } from './space';

export type Box = {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    z0: number;
    z1: number;
};

/** Kolom gambar hiasan per ubin sepanjang dinding (1 kolom = 1 piksel layar). */
export const DECOR_COLUMNS_PER_TILE = 32;
/** Jarak hiasan dari muka dinding supaya tidak berkedip (z-fighting). */
export const DECOR_OFFSET = 0.01;

/** Kotak perabot di ruang dunia. Pot tanaman lebih kecil dari ubinnya. */
export function furnitureBox(item: Furniture): Box {
    if (item.kind === 'tanaman') {
        const s = POT_SIZE * TEXEL;
        const cx = item.gx + item.w / 2;
        const cz = item.gy + item.h / 2;

        return {
            x0: cx - s / 2,
            x1: cx + s / 2,
            y0: 0,
            y1: POT_TEXELS * TEXEL_V,
            z0: cz - s / 2,
            z1: cz + s / 2,
        };
    }

    return {
        x0: item.gx,
        x1: item.gx + item.w,
        y0: 0,
        y1: item.height * TEXEL_V,
        z0: item.gy,
        z1: item.gy + item.h,
    };
}

/** Titik di tengah atas pot (pijakan sprite daun). */
export function plantTop(item: Furniture): Vec3 {
    const b = furnitureBox(item);

    return [(b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2];
}

/** Tambah muka depan, kanan, dan atas sebuah kotak. */
export function addBox(
    out: MeshArrays,
    b: Box,
    layout: Pick<AtlasLayout, 'width' | 'height'>,
    frames: { depan: AtlasFrame; kanan: AtlasFrame; atas: AtlasFrame },
): void {
    quad(
        out,
        [
            [b.x0, b.y1, b.z1],
            [b.x1, b.y1, b.z1],
            [b.x1, b.y0, b.z1],
            [b.x0, b.y0, b.z1],
        ],
        frames.depan,
        layout,
        [0, 0, 1],
        FACE_SHADE.depanKiri,
    );
    quad(
        out,
        [
            [b.x1, b.y1, b.z1],
            [b.x1, b.y1, b.z0],
            [b.x1, b.y0, b.z0],
            [b.x1, b.y0, b.z1],
        ],
        frames.kanan,
        layout,
        [1, 0, 0],
        FACE_SHADE.depanKanan,
    );
    quad(
        out,
        [
            [b.x0, b.y1, b.z0],
            [b.x1, b.y1, b.z0],
            [b.x1, b.y1, b.z1],
            [b.x0, b.y1, b.z1],
        ],
        frames.atas,
        layout,
        [0, 1, 0],
        FACE_SHADE.atas,
    );
}

export function buildFurniture(
    out: MeshArrays,
    scene: StoreScene,
    ids: readonly string[],
    layout: Pick<AtlasLayout, 'width' | 'height'>,
    frameOf: (key: string) => AtlasFrame,
): void {
    for (const item of scene.furniture.filter((f) => ids.includes(f.id))) {
        addBox(out, furnitureBox(item), layout, {
            depan: frameOf(furnitureKey(item.id, 'depan')),
            kanan: frameOf(furnitureKey(item.id, 'kanan')),
            atas: frameOf(furnitureKey(item.id, 'atas')),
        });
    }
}

/** Sudut hiasan dinding di dunia (kiri atas, kanan atas, kanan bawah, kiri bawah gambar). */
export function decorCorners(
    key: string,
    w: number,
    h: number,
): [Vec3, Vec3, Vec3, Vec3] | null {
    const decor = WALL_DECOR.find((d) => d.key === key);

    if (!decor) {
        return null;
    }

    const yTop = decor.top * TEXEL_V;
    const yBottom = (decor.top - h) * TEXEL_V;
    const a = decor.offset / DECOR_COLUMNS_PER_TILE;
    const b = (decor.offset + w) / DECOR_COLUMNS_PER_TILE;

    if (decor.side === 'kanan') {
        // Dinding kanan (z = 0): ke kanan gambar = gx bertambah.
        const z = DECOR_OFFSET;

        return [
            [decor.tile + a, yTop, z],
            [decor.tile + b, yTop, z],
            [decor.tile + b, yBottom, z],
            [decor.tile + a, yBottom, z],
        ];
    }

    // Dinding kiri (x = 0): ke kanan gambar = gy berkurang (menuju pojok belakang).
    const x = DECOR_OFFSET;
    const z0 = decor.tile + 1 - a;
    const z1 = decor.tile + 1 - b;

    return [
        [x, yTop, z0],
        [x, yTop, z1],
        [x, yBottom, z1],
        [x, yBottom, z0],
    ];
}

export function buildDecor(
    out: MeshArrays,
    keys: readonly string[],
    layout: Pick<AtlasLayout, 'width' | 'height'>,
    frameOf: (key: string) => AtlasFrame,
): void {
    for (const key of keys) {
        const frame = frameOf(decorKey(key));
        const corners = decorCorners(key, frame.w, frame.h);
        const decor = WALL_DECOR.find((d) => d.key === key);

        if (!corners || !decor) {
            continue;
        }

        quad(
            out,
            corners,
            frame,
            layout,
            decor.side === 'kanan' ? [0, 0, 1] : [1, 0, 0],
            decor.side === 'kanan'
                ? FACE_SHADE.depanKiri
                : FACE_SHADE.depanKanan,
        );
    }
}

/**
 * Sumber aset procedural (Tahap 5H): semua tekstur balok toko dibuat dari kode
 * dengan benih tetap, dikemas ke satu atlas. Bagian `storeEntries` murni (bisa
 * dites di Node); `ProceduralSource.load` melukisnya ke kanvas di browser.
 */
import type { StoreScene } from '../scenes/store-scene';
import { BASE_TEXELS, brickTexture } from './procedural/brick';
import { leafTexture } from './procedural/leaf';
import { marbleTexture } from './procedural/marble';
import {
    WALL_TEXELS,
    wallCapTexture,
    wallEndTexture,
    wallTexture,
} from './procedural/wall';
import { plankTexture } from './procedural/wood';
import { packAtlas, rasterizeAtlas } from './atlas';
import type { AssetSource, AtlasEntry, AtlasPack } from './atlas';

/** Kunci tekstur balok toko. Renderer hanya memakai kunci ini, bukan generatornya. */
export const STORE_KEYS = {
    lantai: 'tex/lantai/walnut',
    dindingKiri: 'tex/dinding/kiri',
    dindingKanan: 'tex/dinding/kanan',
    ujungKiri: 'tex/dinding/kiri-ujung',
    ujungKanan: 'tex/dinding/kanan-ujung',
    tutupKiri: 'tex/dinding/kiri-tutup',
    tutupKanan: 'tex/dinding/kanan-tutup',
    alasDepanKiri: 'tex/alas/depan-kiri',
    alasDepanKanan: 'tex/alas/depan-kanan',
} as const;

/** Contoh untuk lembar tekstur di lab (dipakai perabot di langkah a2). */
export const SAMPLE_KEYS = {
    marmer: 'contoh/marmer',
    daun: 'contoh/daun',
} as const;

export const REQUIRED_KEYS: readonly string[] = [
    ...Object.values(STORE_KEYS),
    ...Object.values(SAMPLE_KEYS),
];

/** Texel per ubin (lantai, sepanjang dinding); sama dengan three/space.ts. */
const T = 16;
/** Tebal dinding dalam texel; sama dengan three/space.ts. */
const WT = 4;

export const SEED = 5205;

/** Semua bingkai balok toko untuk denah `scene`. Murni. */
export function storeEntries(
    scene: Pick<StoreScene, 'width' | 'height'>,
    seed = SEED,
): AtlasEntry[] {
    const w = scene.width * T;
    const d = scene.height * T;

    return [
        {
            key: STORE_KEYS.lantai,
            matrix: plankTexture({ width: w, height: d, seed }),
        },
        // Dinding kiri (x = 0) sepanjang gy, dinding kanan (z = 0) sepanjang gx.
        {
            key: STORE_KEYS.dindingKiri,
            matrix: wallTexture(d, 'mawar', seed + 1),
        },
        {
            key: STORE_KEYS.dindingKanan,
            matrix: wallTexture(w, 'ivory', seed + 2),
        },
        {
            key: STORE_KEYS.ujungKiri,
            matrix: wallEndTexture(WT, 'mawar', seed + 1),
        },
        {
            key: STORE_KEYS.ujungKanan,
            matrix: wallEndTexture(WT, 'ivory', seed + 2),
        },
        // Tutup dinding kiri menutup pojok belakang (dari z = −tebal).
        { key: STORE_KEYS.tutupKiri, matrix: wallCapTexture(d + WT, WT) },
        { key: STORE_KEYS.tutupKanan, matrix: wallCapTexture(w, WT) },
        // Alas: muka depan-kiri (+z) dan depan-kanan (+x), termasuk di bawah dinding.
        {
            key: STORE_KEYS.alasDepanKiri,
            matrix: brickTexture(w + WT, seed + 3),
        },
        {
            key: STORE_KEYS.alasDepanKanan,
            matrix: brickTexture(d + WT, seed + 4),
        },
        { key: SAMPLE_KEYS.marmer, matrix: marbleTexture(48, 32, seed + 5) },
        { key: SAMPLE_KEYS.daun, matrix: leafTexture(32, 24, seed + 6) },
    ];
}

/** Tinggi tekstur tegak, dipakai pengecekan ukuran. */
export const VERTICAL_TEXELS = { dinding: WALL_TEXELS, alas: BASE_TEXELS };

export class ProceduralSource implements AssetSource {
    readonly id = 'procedural';

    constructor(
        private readonly scene: Pick<StoreScene, 'width' | 'height'>,
        private readonly seed = SEED,
    ) {}

    async load(): Promise<AtlasPack> {
        const entries = storeEntries(this.scene, this.seed);
        const layout = packAtlas(
            entries.map((e) => ({
                key: e.key,
                w: e.matrix.width,
                h: e.matrix.height,
                pivot: e.pivot,
            })),
        );
        const canvas = document.createElement('canvas');
        canvas.width = layout.width;
        canvas.height = layout.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            const image = ctx.createImageData(layout.width, layout.height);
            image.data.set(rasterizeAtlas(layout, entries));
            ctx.putImageData(image, 0, 0);
        }

        return { source: this.id, image: canvas, layout };
    }
}

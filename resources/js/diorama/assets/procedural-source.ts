/**
 * Sumber aset procedural (Tahap 5H): semua tekstur balok toko dibuat dari kode
 * dengan benih tetap, dikemas ke satu atlas. Bagian `storeEntries` murni (bisa
 * dites di Node); `ProceduralSource.load` melukisnya ke kanvas di browser.
 */
import { fillKey } from '../engine/shelves';
import type { ShelfFills } from '../engine/shelves';
import type { Furniture, StoreScene } from '../scenes/store-scene';
import { lampMatrix, windowGlass, windowMatrix } from '../sprites/decor-sprite';
import { C } from '../sprites/palette';
import type { PixelMatrix } from '../sprites/pixels';
import { BASE_TEXELS, brickTexture } from './procedural/brick';
import {
    counterBodyTexture,
    counterTopTexture,
    fridgeFrontTexture,
    fridgeSideTexture,
    fridgeTopTexture,
    potSideTexture,
    potTopTexture,
    rackEndTexture,
    rackFrontTexture,
    rackTopTexture,
} from './procedural/furniture';
import { leafTexture } from './procedural/leaf';
import { marbleTexture } from './procedural/marble';
import {
    WALL_TEXELS,
    wallCapTexture,
    wallEndTexture,
    wallTexture,
} from './procedural/wall';
import { plankTexture } from './procedural/wood';
import { glowEntries, packAtlas, rasterizeAtlas } from './atlas';
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

// ---- Perabot dan hiasan (Tahap 5H langkah a2) --------------------------------

export type FurnitureFace = 'depan' | 'kanan' | 'atas';

/** Kunci tekstur satu muka perabot: depan (+z), kanan (+x), atas (+y). */
export function furnitureKey(id: string, face: FurnitureFace): string {
    return `tex/perabot/${id}/${face}`;
}

/** Kunci tekstur hiasan dinding (mis. `lampu-kanan`). */
export function decorKey(key: string): string {
    return `tex/hiasan/${key}`;
}

/** Perabot yang digambar di langkah a2 (sisanya di langkah b). */
export const A2_FURNITURE: readonly string[] = [
    'rak-a',
    'kasir-1',
    'vending-merah',
    'tanaman-1',
];

/** Hiasan dinding yang digambar di langkah a2. */
export const A2_DECOR: readonly string[] = ['lampu-kanan'];

function furnitureSeed(seed: number, id: string): number {
    let h = seed;

    for (let i = 0; i < id.length; i++) {
        h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
    }

    return h >>> 0;
}

function pickFurniture(scene: StoreScene, ids: readonly string[]): Furniture[] {
    return scene.furniture.filter((f) => ids.includes(f.id));
}

/**
 * Bingkai perabot yang isinya mengikuti stok: muka depan rak (isi tiap
 * potongan) dan muka depan kulkas. Dilukis ulang saat isi berubah. Murni.
 */
export function fillEntries(
    scene: StoreScene,
    ids: readonly string[],
    fills: ShelfFills,
    seed = SEED,
): AtlasEntry[] {
    const entries: AtlasEntry[] = [];

    for (const item of pickFurniture(scene, ids)) {
        const s = furnitureSeed(seed, item.id);

        if (item.kind === 'rak') {
            const slices = Array.from(
                { length: item.w },
                (_, i) => fills[fillKey(item.id, i)] ?? 'kosong',
            );
            entries.push({
                key: furnitureKey(item.id, 'depan'),
                matrix: rackFrontTexture(slices, s),
            });
        } else if (item.kind === 'vending') {
            entries.push({
                key: furnitureKey(item.id, 'depan'),
                matrix: fridgeFrontTexture(
                    fills[fillKey(item.id, 0)] ?? 'kosong',
                    s,
                ),
            });
        }
    }

    return entries;
}

/** Semua bingkai perabot `ids` dan hiasan `decor`, isi rak menurut `fills`. Murni. */
export function furnitureEntries(
    scene: StoreScene,
    ids: readonly string[],
    decor: readonly string[],
    fills: ShelfFills = {},
    seed = SEED,
    lampsOn = false,
): AtlasEntry[] {
    const entries = fillEntries(scene, ids, fills, seed);

    for (const item of pickFurniture(scene, ids)) {
        const s = furnitureSeed(seed, item.id);
        const w = item.w * T;
        const d = item.h * T;
        const add = (face: FurnitureFace, matrix: AtlasEntry['matrix']) =>
            entries.push({ key: furnitureKey(item.id, face), matrix });

        switch (item.kind) {
            case 'rak':
                add('kanan', rackEndTexture(d));
                add('atas', rackTopTexture(w, d, s + 1));
                break;
            case 'meja_kasir':
                add('depan', counterBodyTexture(w));
                add('kanan', counterBodyTexture(d));
                add('atas', counterTopTexture(w, d, s + 1));
                break;
            case 'vending':
                add('kanan', fridgeSideTexture(d));
                add('atas', fridgeTopTexture(s + 1));
                break;
            case 'tanaman':
                add('depan', potSideTexture());
                add('kanan', potSideTexture());
                add('atas', potTopTexture());
                break;
            default:
                break;
        }
    }

    for (const key of decor) {
        if (key.startsWith('lampu-')) {
            // Lampu dinding yang sudah disetujui (5C): mati di a2, menyala di a3
            // (bola lampu masuk atlas cahaya untuk bloom).
            const matrix = lampMatrix(lampsOn);
            entries.push({
                key: decorKey(key),
                matrix,
                glow: lampsOn ? onlyColor(matrix, C(11)) : undefined,
            });
        } else if (key === 'jendela') {
            // Jendela 5C dengan langit senja; kacanya menyala (atlas cahaya).
            entries.push({
                key: decorKey(key),
                matrix: windowMatrix('senja'),
                glow: windowGlass('senja'),
            });
        }
    }

    return entries;
}

/** Hiasan dinding langkah a3: kedua lampu dan jendela sumber berkas sinar. */
export const A3_DECOR: readonly string[] = [
    'lampu-kanan',
    'lampu-kiri',
    'jendela',
];

/** Hanya piksel berwarna `color` dari matriks (untuk atlas cahaya). */
function onlyColor(m: PixelMatrix, color: string): PixelMatrix {
    return { ...m, pixels: m.pixels.map((p) => (p === color ? p : null)) };
}

export type ProceduralOptions = {
    furniture?: readonly string[];
    decor?: readonly string[];
    fills?: ShelfFills;
    seed?: number;
    /** Lampu dinding menyala (a3). */
    lampsOn?: boolean;
};

export class ProceduralSource implements AssetSource {
    readonly id = 'procedural';
    private readonly seed: number;

    constructor(
        private readonly scene: StoreScene,
        private readonly options: ProceduralOptions = {},
    ) {
        this.seed = options.seed ?? SEED;
    }

    async load(): Promise<AtlasPack> {
        const entries = [
            ...storeEntries(this.scene, this.seed),
            ...furnitureEntries(
                this.scene,
                this.options.furniture ?? [],
                this.options.decor ?? [],
                this.options.fills ?? {},
                this.seed,
                this.options.lampsOn ?? false,
            ),
        ];
        const layout = packAtlas(
            entries.map((e) => ({
                key: e.key,
                w: e.matrix.width,
                h: e.matrix.height,
                pivot: e.pivot,
            })),
        );
        const paint = (list: readonly AtlasEntry[]): HTMLCanvasElement => {
            const canvas = document.createElement('canvas');
            canvas.width = layout.width;
            canvas.height = layout.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                const image = ctx.createImageData(layout.width, layout.height);
                image.data.set(rasterizeAtlas(layout, list));
                ctx.putImageData(image, 0, 0);
            }

            return canvas;
        };
        const glow = glowEntries(entries);

        return {
            source: this.id,
            image: paint(entries),
            layout,
            glowImage: glow.length > 0 ? paint(glow) : undefined,
        };
    }
}

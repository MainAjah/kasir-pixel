/**
 * Lapisan atlas aset diorama 3D (Tahap 5H, docs/rencana-tahap-5h.md bagian 1).
 *
 * Renderer hanya meminta kunci semantik yang tetap (mis. `tex/lantai/walnut`);
 * dari mana gambarnya berasal diurus `AssetSource`. Sekarang satu sumber:
 * procedural (dibuat kode). Nanti paket aset berlisensi bisa ditambah sebagai
 * sumber lain (PNG + JSON atlas + pemetaan nama) tanpa menulis ulang mesin.
 *
 * Bagian di berkas ini murni (tanpa DOM) supaya bisa dites di Node.
 */
import type { PixelMatrix } from '../sprites/pixels';

export type AtlasFrame = {
    x: number;
    y: number;
    w: number;
    h: number;
    /** Titik tumpu dalam texel bingkai (mis. kaki karakter); bawaan pojok kiri atas. */
    pivot: { x: number; y: number };
};

export type AtlasLayout = {
    width: number;
    height: number;
    padding: number;
    frames: Record<string, AtlasFrame>;
};

/** Gambar atlas yang sudah jadi dari satu sumber. */
export type AtlasPack = {
    source: string;
    image: TexImageSource;
    layout: AtlasLayout;
    /**
     * Atlas cahaya (Tahap 5H a3), tata letak sama: hanya piksel yang menyala
     * (kaca jendela, bola lampu); sisanya hitam. Dipakai sebagai emissive.
     */
    glowImage?: TexImageSource;
};

export interface AssetSource {
    id: string;
    load(): Promise<AtlasPack>;
}

export type AtlasEntry = {
    key: string;
    matrix: PixelMatrix;
    pivot?: { x: number; y: number };
    /** Piksel yang menyala (ukuran sama dengan `matrix`), untuk atlas cahaya. */
    glow?: PixelMatrix;
};

/** Bingkai cahaya saja: matriks `glow` di tempat bingkainya. Murni. */
export function glowEntries(entries: readonly AtlasEntry[]): AtlasEntry[] {
    return entries
        .filter((e) => e.glow)
        .map((e) => ({ key: e.key, matrix: e.glow as PixelMatrix }));
}

export type PackOptions = {
    /** Lebar atlas (texel); bawaan 1024. */
    width?: number;
    /** Ruang di sekeliling tiap bingkai, diisi ulangan tepi supaya tidak rembes. */
    padding?: number;
};

/**
 * Susun bingkai ke atlas dengan rak (shelf packing): urut dari yang tertinggi,
 * isi baris kiri ke kanan, pindah baris bila penuh. Tinggi atlas dibulatkan ke
 * pangkat dua. Murni.
 */
export function packAtlas(
    entries: readonly {
        key: string;
        w: number;
        h: number;
        pivot?: { x: number; y: number };
    }[],
    { width = 1024, padding = 2 }: PackOptions = {},
): AtlasLayout {
    const seen = new Set<string>();

    for (const e of entries) {
        if (seen.has(e.key)) {
            throw new Error(`Kunci atlas ganda: ${e.key}`);
        }

        seen.add(e.key);

        if (e.w + padding * 2 > width) {
            throw new Error(
                `Bingkai ${e.key} (${e.w} texel) lebih lebar dari atlas.`,
            );
        }
    }

    const order = [...entries].sort((a, b) => b.h - a.h || b.w - a.w);
    const frames: Record<string, AtlasFrame> = {};
    let x = 0;
    let y = 0;
    let rowH = 0;

    for (const e of order) {
        const w = e.w + padding * 2;
        const h = e.h + padding * 2;

        if (x + w > width) {
            x = 0;
            y += rowH;
            rowH = 0;
        }

        frames[e.key] = {
            x: x + padding,
            y: y + padding,
            w: e.w,
            h: e.h,
            pivot: e.pivot ?? { x: 0, y: 0 },
        };
        x += w;
        rowH = Math.max(rowH, h);
    }

    const used = y + rowH;
    let height = 1;

    while (height < used) {
        height *= 2;
    }

    return { width, height, padding, frames };
}

/**
 * Koordinat UV bingkai, dengan v dihitung dari atas gambar (tekstur dipasang
 * dengan `flipY = false`). Murni.
 */
export function frameUv(
    frame: AtlasFrame,
    layout: Pick<AtlasLayout, 'width' | 'height'>,
): { u0: number; v0: number; u1: number; v1: number } {
    return {
        u0: frame.x / layout.width,
        v0: frame.y / layout.height,
        u1: (frame.x + frame.w) / layout.width,
        v1: (frame.y + frame.h) / layout.height,
    };
}

/** "#rrggbb" → [r, g, b]. */
function rgb(hex: string): [number, number, number] {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}

/**
 * Lukis semua bingkai ke larik RGBA seukuran atlas. Ruang padding diisi
 * ulangan piksel tepi (extrude), sehingga sampel nearest di tepi tidak pernah
 * mengambil bingkai tetangga. Murni.
 */
export function rasterizeAtlas(
    layout: AtlasLayout,
    entries: readonly AtlasEntry[],
): Uint8ClampedArray {
    const out = new Uint8ClampedArray(layout.width * layout.height * 4);
    const pad = layout.padding;

    for (const e of entries) {
        const f = layout.frames[e.key];

        if (!f) {
            continue;
        }

        for (let y = -pad; y < f.h + pad; y++) {
            for (let x = -pad; x < f.w + pad; x++) {
                const sx = Math.max(0, Math.min(f.w - 1, x));
                const sy = Math.max(0, Math.min(f.h - 1, y));
                const color = e.matrix.pixels[sy * e.matrix.width + sx];

                if (!color) {
                    continue;
                }

                const i = ((f.y + y) * layout.width + (f.x + x)) * 4;
                const [r, g, b] = rgb(color);
                out[i] = r;
                out[i + 1] = g;
                out[i + 2] = b;
                out[i + 3] = 255;
            }
        }
    }

    return out;
}

/**
 * Satu bingkai beserta padding-nya sebagai larik RGBA sendiri (untuk melukis
 * ulang sebagian atlas, mis. rak saat isinya berubah). Piksel kosong transparan.
 * Murni.
 */
export function rasterizeFrame(
    entry: AtlasEntry,
    padding: number,
): { width: number; height: number; data: Uint8ClampedArray<ArrayBuffer> } {
    const { width: w, height: h, pixels } = entry.matrix;
    const width = w + padding * 2;
    const height = h + padding * 2;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sx = Math.max(0, Math.min(w - 1, x - padding));
            const sy = Math.max(0, Math.min(h - 1, y - padding));
            const color = pixels[sy * w + sx];

            if (!color) {
                continue;
            }

            const i = (y * width + x) * 4;
            const [r, g, b] = rgb(color);
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = 255;
        }
    }

    return { width, height, data };
}

/**
 * Gabungan beberapa sumber aset dengan urutan prioritas: kunci dicari di sumber
 * pertama dulu (mis. paket berlisensi), lalu jatuh ke berikutnya (procedural).
 */
export class AtlasRegistry {
    private packs: AtlasPack[] = [];

    constructor(private readonly sources: readonly AssetSource[]) {}

    async load(): Promise<void> {
        this.packs = await Promise.all(this.sources.map((s) => s.load()));
    }

    /** Pack yang sudah dimuat, urut prioritas. */
    get loaded(): readonly AtlasPack[] {
        return this.packs;
    }

    find(key: string): { pack: AtlasPack; frame: AtlasFrame } | null {
        for (const pack of this.packs) {
            const frame = pack.layout.frames[key];

            if (frame) {
                return { pack, frame };
            }
        }

        return null;
    }

    /** Kunci yang tidak ada di sumber mana pun (untuk tes kelengkapan). */
    missing(keys: readonly string[]): string[] {
        return keys.filter((k) => this.find(k) === null);
    }
}

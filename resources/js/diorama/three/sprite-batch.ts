/**
 * Atlas karakter dan kumpulan billboard (Tahap 5H a2).
 *
 * - `SpriteAtlas`: kanvas 1024² yang diisi bingkai karakter saat pertama
 *   dibutuhkan (gerak "cara 1" menghasilkan banyak bingkai), lalu diunggah ke
 *   GPU sekali per bingkai bila ada yang baru. Penuh → dikosongkan dan diisi
 *   ulang sesuai kebutuhan.
 * - `BillboardBatch`: semua sprite dalam satu geometri dan satu draw call.
 *   Sudutnya sudah dalam NDC gambar dalam (lihat sprite-quad.ts), kedalaman
 *   per sprite = kedalaman titik pijaknya. Piksel transparan dibuang
 *   (alpha test); memudar di pintu memakai dither Bayer, bukan transparansi.
 */
import {
    BufferAttribute,
    BufferGeometry,
    Mesh,
    NearestFilter,
    SRGBColorSpace,
    ShaderMaterial,
    Texture,
} from 'three';
import { rasterizeFrame } from '../assets/atlas';
import { ShelfAllocator } from '../assets/shelf-allocator';
import type { BuiltSprite } from './actors';
import type { PixelRect } from './sprite-quad';

export type SpriteEntry = {
    x: number;
    y: number;
    w: number;
    h: number;
    footX: number;
    footY: number;
};

const ATLAS_SIZE = 1024;
const PADDING = 1;

export class SpriteAtlas {
    readonly texture: Texture;
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D | null;
    private readonly allocator = new ShelfAllocator(
        ATLAS_SIZE,
        ATLAS_SIZE,
        PADDING,
    );
    private readonly entries = new Map<string, SpriteEntry>();
    private dirty = false;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = ATLAS_SIZE;
        this.canvas.height = ATLAS_SIZE;
        this.ctx = this.canvas.getContext('2d');
        this.texture = new Texture(this.canvas);
        this.texture.magFilter = NearestFilter;
        this.texture.minFilter = NearestFilter;
        this.texture.generateMipmaps = false;
        this.texture.flipY = false;
        this.texture.colorSpace = SRGBColorSpace;
    }

    get size(): number {
        return ATLAS_SIZE;
    }

    get count(): number {
        return this.entries.size;
    }

    /** Bingkai untuk `key`; dibuat dengan `build` dan dilukis bila belum ada. */
    get(key: string, build: () => BuiltSprite): SpriteEntry | null {
        const found = this.entries.get(key);

        if (found) {
            return found;
        }

        const sprite = build();
        let spot = this.allocator.allocate(
            sprite.matrix.width,
            sprite.matrix.height,
        );

        if (!spot) {
            // Atlas penuh: kosongkan, bingkai lain dibuat ulang saat dibutuhkan.
            this.entries.clear();
            this.allocator.reset();
            this.ctx?.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
            spot = this.allocator.allocate(
                sprite.matrix.width,
                sprite.matrix.height,
            );

            if (!spot) {
                return null;
            }
        }

        if (this.ctx) {
            const raster = rasterizeFrame(
                { key, matrix: sprite.matrix },
                PADDING,
            );
            this.ctx.putImageData(
                new ImageData(raster.data, raster.width, raster.height),
                spot.x - PADDING,
                spot.y - PADDING,
            );
        }

        const entry: SpriteEntry = {
            x: spot.x,
            y: spot.y,
            w: sprite.matrix.width,
            h: sprite.matrix.height,
            footX: sprite.footX,
            footY: sprite.footY,
        };
        this.entries.set(key, entry);
        this.dirty = true;

        return entry;
    }

    /** Unggah ke GPU bila ada bingkai baru (sekali per bingkai render). */
    flush(): void {
        if (this.dirty) {
            this.texture.needsUpdate = true;
            this.dirty = false;
        }
    }

    dispose(): void {
        this.texture.dispose();
    }
}

const VERTEX = /* glsl */ `
attribute float alpha;
varying vec2 vUv;
varying float vAlpha;

void main() {
    vUv = uv;
    vAlpha = alpha;
    gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
varying float vAlpha;

const float BAYER[16] = float[16](
    0.0, 8.0, 2.0, 10.0,
    12.0, 4.0, 14.0, 6.0,
    3.0, 11.0, 1.0, 9.0,
    15.0, 7.0, 13.0, 5.0
);

void main() {
    vec4 color = texture2D(map, vUv);

    if (color.a < 0.5) {
        discard;
    }

    if (vAlpha < 1.0) {
        ivec2 p = ivec2(mod(floor(gl_FragCoord.xy), 4.0));
        float threshold = (BAYER[p.y * 4 + p.x] + 0.5) / 16.0;

        if (threshold >= vAlpha) {
            discard;
        }
    }

    gl_FragColor = vec4(color.rgb, 1.0);
    #include <colorspace_fragment>
}
`;

export type BillboardDraw = {
    /** Kotak dalam NDC gambar dalam. */
    rect: PixelRect;
    /** Kedalaman NDC titik pijak (−1…1). */
    z: number;
    entry: SpriteEntry;
    alpha: number;
};

export class BillboardBatch {
    readonly mesh: Mesh;
    private readonly geometry = new BufferGeometry();
    private readonly material: ShaderMaterial;
    private readonly positions: Float32Array;
    private readonly uvs: Float32Array;
    private readonly alphas: Float32Array;

    constructor(
        private readonly atlas: SpriteAtlas,
        private readonly capacity = 32,
    ) {
        this.positions = new Float32Array(capacity * 4 * 3);
        this.uvs = new Float32Array(capacity * 4 * 2);
        this.alphas = new Float32Array(capacity * 4);
        const indices: number[] = [];

        for (let i = 0; i < capacity; i++) {
            const b = i * 4;
            indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
        }

        this.geometry.setAttribute(
            'position',
            new BufferAttribute(this.positions, 3),
        );
        this.geometry.setAttribute('uv', new BufferAttribute(this.uvs, 2));
        this.geometry.setAttribute(
            'alpha',
            new BufferAttribute(this.alphas, 1),
        );
        this.geometry.setIndex(indices);
        this.geometry.setDrawRange(0, 0);
        this.material = new ShaderMaterial({
            uniforms: { map: { value: atlas.texture } },
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
        });
        this.mesh = new Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
    }

    /** Isi ulang semua sprite untuk bingkai ini. */
    update(draws: readonly BillboardDraw[]): void {
        const n = Math.min(draws.length, this.capacity);
        const size = this.atlas.size;

        for (let i = 0; i < n; i++) {
            const { rect, z, entry, alpha } = draws[i];
            const u0 = entry.x / size;
            const u1 = (entry.x + entry.w) / size;
            const v0 = entry.y / size;
            const v1 = (entry.y + entry.h) / size;
            // Kiri bawah, kanan bawah, kanan atas, kiri atas (v dihitung dari atas gambar).
            const corners = [
                [rect.left, rect.bottom, u0, v1],
                [rect.right, rect.bottom, u1, v1],
                [rect.right, rect.top, u1, v0],
                [rect.left, rect.top, u0, v0],
            ];

            corners.forEach(([x, y, u, v], k) => {
                const p = (i * 4 + k) * 3;
                this.positions[p] = x;
                this.positions[p + 1] = y;
                this.positions[p + 2] = z;
                const t = (i * 4 + k) * 2;
                this.uvs[t] = u;
                this.uvs[t + 1] = v;
                this.alphas[i * 4 + k] = alpha;
            });
        }

        this.geometry.setDrawRange(0, n * 6);
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.uv.needsUpdate = true;
        this.geometry.attributes.alpha.needsUpdate = true;
    }

    dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
    }
}

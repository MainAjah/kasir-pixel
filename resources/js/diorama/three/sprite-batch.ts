/**
 * Atlas karakter, billboard berlampu, bayangan kontak, dan penghasil bayangan
 * panjang karakter (Tahap 5H a2–a3).
 *
 * - `SpriteAtlas`: kanvas 1024² yang diisi bingkai karakter saat pertama
 *   dibutuhkan, diunggah ke GPU sekali per bingkai bila ada yang baru.
 * - `BillboardBatch`: semua sprite dalam satu draw call. Sudut dalam NDC gambar
 *   dalam (1 piksel gambar = 1 piksel dalam, kaki dibulatkan), kedalaman titik
 *   pijak. Shader `SPRITE_FRAGMENT` menerangi tiap texel dengan cahaya adegan
 *   tanpa mengubah gambar sumber.
 * - `ContactShadows`: elips gelap bertingkat di lantai di bawah kaki.
 * - `ShadowCasters`: quad tak terlihat menghadap matahari, berbentuk siluet
 *   sprite, hanya ditulis ke peta bayangan → bayangan panjang karakter.
 */
import {
    BufferAttribute,
    BufferGeometry,
    DataTexture,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    MeshDepthMaterial,
    NearestFilter,
    RGBADepthPacking,
    RGBAFormat,
    SRGBColorSpace,
    ShaderMaterial,
    Texture,
    Vector2,
    Vector3,
    Vector4,
} from 'three';
import { rasterizeFrame } from '../assets/atlas';
import { ShelfAllocator } from '../assets/shelf-allocator';
import type { BuiltSprite } from './actors';
import type { Vec3 } from './camera-math';
import { MAX_SPRITE_BOXES, SPRITE_FRAGMENT, SPRITE_VERTEX } from './shaders';
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

export type BillboardDraw = {
    /** Kotak dalam NDC gambar dalam. */
    rect: PixelRect;
    /** Kedalaman NDC titik pijak (−1…1). */
    z: number;
    entry: SpriteEntry;
    alpha: number;
    foot: Vec3;
    hover: number;
    /** Irradiansi lampu di sprite (linear). */
    lamp: Vec3;
};

/** Pengaturan cahaya sprite (uniform), diperbarui tiap bingkai. */
export type SpriteLighting = {
    lit: boolean;
    ambient: Vector3;
    sun: Vector3;
    toSun: Vec3;
    glass: Vector4;
    mullionV: Vector4;
    mullionH: Vector4;
    wallH: number;
    sceneW: number;
    boxes: { min: Vec3; max: Vec3 }[];
    texelV: number;
    px: number;
    camRight: Vec3;
    rim: boolean;
    rimDir: [number, number];
    rimColor: Vector3;
    outline: boolean;
    outlineColor: Vector3;
};

export class BillboardBatch {
    readonly mesh: Mesh;
    private readonly geometry = new BufferGeometry();
    private readonly material: ShaderMaterial;
    private readonly positions: Float32Array;
    private readonly uvs: Float32Array;
    private readonly alphas: Float32Array;
    private readonly feet: Float32Array;
    private readonly lamps: Float32Array;
    private readonly frames: Float32Array;

    constructor(
        private readonly atlas: SpriteAtlas,
        private readonly capacity = 32,
    ) {
        const v = capacity * 4;
        this.positions = new Float32Array(v * 3);
        this.uvs = new Float32Array(v * 2);
        this.alphas = new Float32Array(v);
        this.feet = new Float32Array(v * 3);
        this.lamps = new Float32Array(v * 3);
        this.frames = new Float32Array(v * 4);
        const indices: number[] = [];

        for (let i = 0; i < capacity; i++) {
            const b = i * 4;
            indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
        }

        const attr = (name: string, array: Float32Array, size: number) =>
            this.geometry.setAttribute(name, new BufferAttribute(array, size));
        attr('position', this.positions, 3);
        attr('uv', this.uvs, 2);
        attr('alpha', this.alphas, 1);
        attr('foot', this.feet, 3);
        attr('lamp', this.lamps, 3);
        attr('frame', this.frames, 4);
        this.geometry.setIndex(indices);
        this.geometry.setDrawRange(0, 0);

        const empty = Array.from(
            { length: MAX_SPRITE_BOXES },
            () => new Vector3(),
        );
        this.material = new ShaderMaterial({
            uniforms: {
                map: { value: atlas.texture },
                uAtlas: { value: new Vector2(atlas.size, atlas.size) },
                uLit: { value: 0 },
                uAmbient: { value: new Vector3(Math.PI, Math.PI, Math.PI) },
                uSun: { value: new Vector3() },
                uToSun: { value: new Vector3(0, 1, 0) },
                uGlass: { value: new Vector4() },
                uMullionV: { value: new Vector4() },
                uMullionH: { value: new Vector4() },
                uWallH: { value: 0 },
                uSceneW: { value: 0 },
                uBoxMin: { value: empty },
                uBoxMax: { value: empty.map((x) => x.clone()) },
                uBoxCount: { value: 0 },
                uTexelV: { value: 0 },
                uPx: { value: 1 },
                uCamRight: { value: new Vector3(1, 0, 0) },
                uRim: { value: 0 },
                uRimDir: { value: new Vector2(1, 1) },
                uRimColor: { value: new Vector3() },
                uOutline: { value: 0 },
                uOutlineColor: { value: new Vector3() },
            },
            vertexShader: SPRITE_VERTEX,
            fragmentShader: SPRITE_FRAGMENT,
        });
        this.mesh = new Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 2;
    }

    setLighting(l: SpriteLighting): void {
        const u = this.material.uniforms;
        u.uLit.value = l.lit ? 1 : 0;
        (u.uAmbient.value as Vector3).copy(l.ambient);
        (u.uSun.value as Vector3).copy(l.sun);
        (u.uToSun.value as Vector3).set(...l.toSun);
        (u.uGlass.value as Vector4).copy(l.glass);
        (u.uMullionV.value as Vector4).copy(l.mullionV);
        (u.uMullionH.value as Vector4).copy(l.mullionH);
        u.uWallH.value = l.wallH;
        u.uSceneW.value = l.sceneW;
        const n = Math.min(l.boxes.length, MAX_SPRITE_BOXES);
        (u.uBoxMin.value as Vector3[]).forEach((v, i) =>
            i < n ? v.set(...l.boxes[i].min) : v.set(0, 0, 0),
        );
        (u.uBoxMax.value as Vector3[]).forEach((v, i) =>
            i < n ? v.set(...l.boxes[i].max) : v.set(0, 0, 0),
        );
        u.uBoxCount.value = n;
        u.uTexelV.value = l.texelV;
        u.uPx.value = l.px;
        (u.uCamRight.value as Vector3).set(...l.camRight);
        u.uRim.value = l.rim ? 1 : 0;
        (u.uRimDir.value as Vector2).set(...l.rimDir);
        (u.uRimColor.value as Vector3).copy(l.rimColor);
        u.uOutline.value = l.outline ? 1 : 0;
        (u.uOutlineColor.value as Vector3).copy(l.outlineColor);
    }

    /** Isi ulang semua sprite untuk bingkai ini. */
    update(draws: readonly BillboardDraw[]): void {
        const n = Math.min(draws.length, this.capacity);
        const size = this.atlas.size;

        for (let i = 0; i < n; i++) {
            const { rect, z, entry, alpha, foot, hover, lamp } = draws[i];
            const u0 = entry.x / size;
            const u1 = (entry.x + entry.w) / size;
            const v0 = entry.y / size;
            const v1 = (entry.y + entry.h) / size;
            // u titik pijak, v tepi bawah baris kaki, baris melayang.
            const footU = (entry.x + entry.footX) / size;
            const footV = (entry.y + entry.footY + 1) / size;
            // Kiri bawah, kanan bawah, kanan atas, kiri atas (v dihitung dari atas gambar).
            const corners = [
                [rect.left, rect.bottom, u0, v1],
                [rect.right, rect.bottom, u1, v1],
                [rect.right, rect.top, u1, v0],
                [rect.left, rect.top, u0, v0],
            ];

            corners.forEach(([x, y, u, v], k) => {
                const vi = i * 4 + k;
                this.positions.set([x, y, z], vi * 3);
                this.uvs.set([u, v], vi * 2);
                this.alphas[vi] = alpha;
                this.feet.set(foot, vi * 3);
                this.lamps.set(lamp, vi * 3);
                this.frames.set([footU, footV, hover, 0], vi * 4);
            });
        }

        this.geometry.setDrawRange(0, n * 6);

        for (const name of [
            'position',
            'uv',
            'alpha',
            'foot',
            'lamp',
            'frame',
        ]) {
            this.geometry.attributes[name].needsUpdate = true;
        }
    }

    dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
    }
}

// ---- Bayangan kontak ------------------------------------------------------------

/** Elips 16 × 8 bertingkat tiga (tetap terasa pixel), alfa saja. */
function contactTexture(): DataTexture {
    const w = 16;
    const h = 8;
    const data = new Uint8Array(w * h * 4);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (x + 0.5 - w / 2) / (w / 2);
            const dy = (y + 0.5 - h / 2) / (h / 2);
            const d = Math.hypot(dx, dy);
            const a = d < 0.55 ? 255 : d < 0.8 ? 150 : d < 1 ? 70 : 0;
            data.set([255, 255, 255, a], (y * w + x) * 4);
        }
    }

    const t = new DataTexture(data, w, h, RGBAFormat);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.needsUpdate = true;

    return t;
}

export type ContactDraw = { foot: Vec3; radius: number; alpha: number };

/** Ketinggian elips di atas lantai supaya tidak berkedip (z-fighting). */
const CONTACT_LIFT = 0.004;

export class ContactShadows {
    readonly mesh: Mesh;
    private readonly geometry = new BufferGeometry();
    private readonly material: MeshBasicMaterial;
    private readonly texture = contactTexture();
    private readonly positions: Float32Array;
    private readonly colors: Float32Array;

    constructor(
        color: string,
        opacity: number,
        private readonly capacity = 32,
    ) {
        this.positions = new Float32Array(capacity * 4 * 3);
        this.colors = new Float32Array(capacity * 4 * 4);
        const uvs = new Float32Array(capacity * 4 * 2);
        const indices: number[] = [];

        for (let i = 0; i < capacity; i++) {
            uvs.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
            const b = i * 4;
            indices.push(b, b + 3, b + 2, b, b + 2, b + 1);
        }

        this.geometry.setAttribute(
            'position',
            new BufferAttribute(this.positions, 3),
        );
        this.geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
        this.geometry.setAttribute(
            'color',
            new BufferAttribute(this.colors, 4),
        );
        this.geometry.setIndex(indices);
        this.geometry.setDrawRange(0, 0);
        this.material = new MeshBasicMaterial({
            color,
            map: this.texture,
            transparent: true,
            opacity,
            vertexColors: true,
            depthWrite: false,
        });
        this.mesh = new Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 1;
    }

    update(draws: readonly ContactDraw[]): void {
        const n = Math.min(draws.length, this.capacity);

        for (let i = 0; i < n; i++) {
            const { foot, radius: r, alpha } = draws[i];
            const [x, , z] = foot;
            const y = CONTACT_LIFT;
            // Elips di lantai: sumbu panjang sejajar layar (−x+z dan +x−z), rasio 2:1 di layar.
            const ax: Vec3 = [r * Math.SQRT1_2, 0, -r * Math.SQRT1_2];
            const az: Vec3 = [r * Math.SQRT1_2, 0, r * Math.SQRT1_2];
            const pts = [
                [x - ax[0] - az[0], y, z - ax[2] - az[2]],
                [x + ax[0] - az[0], y, z + ax[2] - az[2]],
                [x + ax[0] + az[0], y, z + ax[2] + az[2]],
                [x - ax[0] + az[0], y, z - ax[2] + az[2]],
            ];
            pts.forEach((p, k) => {
                this.positions.set(p, (i * 4 + k) * 3);
                this.colors.set([1, 1, 1, alpha], (i * 4 + k) * 4);
            });
        }

        this.geometry.setDrawRange(0, n * 6);
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }

    dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
        this.texture.dispose();
    }
}

// ---- Penghasil bayangan panjang karakter ---------------------------------------

export type CasterDraw = {
    foot: Vec3;
    hover: number;
    entry: SpriteEntry;
};

export class ShadowCasters {
    readonly mesh: Mesh;
    private readonly geometry = new BufferGeometry();
    private readonly material: MeshBasicMaterial;
    private readonly depth: MeshDepthMaterial;
    private readonly positions: Float32Array;
    private readonly uvs: Float32Array;

    constructor(
        private readonly atlas: SpriteAtlas,
        private readonly capacity = 32,
    ) {
        this.positions = new Float32Array(capacity * 4 * 3);
        this.uvs = new Float32Array(capacity * 4 * 2);
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
        this.geometry.setIndex(indices);
        this.geometry.setDrawRange(0, 0);
        // Tidak terlihat di gambar; hanya peta bayangan yang membacanya.
        this.material = new MeshBasicMaterial({
            colorWrite: false,
            depthWrite: false,
            side: DoubleSide,
        });
        this.depth = new MeshDepthMaterial({
            depthPacking: RGBADepthPacking,
            map: atlas.texture,
            alphaTest: 0.5,
            side: DoubleSide,
        });
        this.mesh = new Mesh(this.geometry, this.material);
        this.mesh.customDepthMaterial = this.depth;
        this.mesh.castShadow = true;
        this.mesh.frustumCulled = false;
    }

    /**
     * Quad tegak di titik pijak, menghadap matahari (tegak lurus arah datar
     * sinar), selebar dan setinggi sprite: 1 piksel = 1/PX satuan mendatar,
     * TEXEL_V satuan tegak.
     */
    update(
        draws: readonly CasterDraw[],
        toSun: Vec3,
        px: number,
        texelV: number,
    ): void {
        const n = Math.min(draws.length, this.capacity);
        const h = Math.hypot(toSun[0], toSun[2]) || 1;
        const side: Vec3 = [-toSun[2] / h, 0, toSun[0] / h];
        const size = this.atlas.size;

        for (let i = 0; i < n; i++) {
            const { foot, hover, entry } = draws[i];
            const left = -entry.footX / px;
            const right = (entry.w - entry.footX) / px;
            const top = (entry.footY + 1 + hover) * texelV;
            const bottom = (entry.footY + 1 - entry.h + hover) * texelV;
            const at = (a: number, y: number): number[] => [
                foot[0] + side[0] * a,
                foot[1] + y,
                foot[2] + side[2] * a,
            ];
            const u0 = entry.x / size;
            const u1 = (entry.x + entry.w) / size;
            const v0 = entry.y / size;
            const v1 = (entry.y + entry.h) / size;
            const corners = [
                [at(left, bottom), [u0, v1]],
                [at(right, bottom), [u1, v1]],
                [at(right, top), [u1, v0]],
                [at(left, top), [u0, v0]],
            ];
            corners.forEach(([p, uv], k) => {
                this.positions.set(p, (i * 4 + k) * 3);
                this.uvs.set(uv, (i * 4 + k) * 2);
            });
        }

        this.geometry.setDrawRange(0, n * 6);
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.uv.needsUpdate = true;
    }

    dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
        this.depth.dispose();
    }
}

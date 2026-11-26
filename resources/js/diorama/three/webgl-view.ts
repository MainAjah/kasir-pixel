/**
 * Tampilan WebGL diorama (Tahap 5H) dengan three.js.
 *
 * Pipa: adegan dirender ke target kecil (resolusi dalam, 1 texel ≈ 1 piksel),
 * lalu diperbesar ke layar. Skala bulat bila memungkinkan (lihat
 * `viewportFor`); untuk skala pecahan ada dua cara perbesaran: nearest murni,
 * atau "sharp bilinear" (nearest sampai kelipatan bulat di atasnya, lalu
 * linear turun ke skala sebenarnya). Kamera hanya bergeser sejajar layar
 * mengikuti kursor; geserannya dibulatkan ke grid piksel dalam dan sisa
 * pecahannya diterapkan saat memperbesar, jadi gambar tidak berkilau.
 *
 * Langkah a1: balok toko. Langkah a2: perabot (rak berisi barang menurut
 * isi stok, meja kasir bermarmer, kulkas, tanaman pot), lampu dinding (mati),
 * zombie penjaga diam, dan pelanggan dari logika `DioramaWorld` yang ada,
 * sebagai billboard 1 piksel gambar = 1 piksel dalam. Belum ada efek cahaya.
 */
import {
    BufferAttribute,
    BufferGeometry,
    Color,
    LinearFilter,
    Mesh,
    MeshBasicMaterial,
    NearestFilter,
    OrthographicCamera,
    PerspectiveCamera,
    SRGBColorSpace,
    Scene,
    ShaderMaterial,
    Texture,
    Vector2,
    Vector3,
    WebGLRenderTarget,
    WebGLRenderer,
} from 'three';
import { AtlasRegistry, rasterizeFrame } from '../assets/atlas';
import type { AtlasFrame, AtlasPack } from '../assets/atlas';
import {
    A2_DECOR,
    A2_FURNITURE,
    ProceduralSource,
    SEED,
    fillEntries,
} from '../assets/procedural-source';
import type { Customer } from '../actors/customer';
import type { Point } from '../engine/iso';
import type { ShelfFills } from '../engine/shelves';
import type { DioramaWorld } from '../engine/world';
import type { Heading, RenderOptions } from '../render/placeholder-renderer';
import { STORE_SCENE } from '../scenes/store-scene';
import type { StoreScene } from '../scenes/store-scene';
import { loadReferences, referenceMatrix } from '../sprites/reference-loader';
import type { DioramaView, WorldAnchor } from '../view/types';
import { actorSprites, plantSprite } from './actors';
import type { ActorSprite } from './actors';
import { buildDecor, buildFurniture } from './build-furniture';
import { buildStore, storeCorners } from './build-store';
import type { MeshArrays } from './build-store';
import {
    cameraBasis,
    driftTarget,
    focusDistance,
    fovFor,
    frameOf,
    snapToPixel,
    springStep,
    viewportFor,
} from './camera-math';
import type { CameraBasis, Frame, Viewport } from './camera-math';
import { BACKDROP } from './palette-world';
import { PITCH_DEG, PX_PER_UNIT } from './space';
import { BillboardBatch, SpriteAtlas } from './sprite-batch';
import type { BillboardDraw } from './sprite-batch';
import { rectToNdc, spriteRect } from './sprite-quad';

export type Lens = 'perspektif' | 'ortografik';
/** Cara memperbesar gambar dalam ke layar saat skalanya pecahan. */
export type Upscale = 'nearest' | 'sharp';

export type WebGLViewOptions = {
    scene?: StoreScene;
    pitchDeg?: number;
    lens?: Lens;
    /** Sudut pandang vertikal lensa perspektif (derajat). */
    fovDeg?: number;
    /** Geser halus mengikuti kursor. */
    drift?: boolean;
    upscale?: Upscale;
    /** Perabot yang digambar (id denah); bawaan: perabot langkah a2. */
    furniture?: readonly string[];
    /** Hiasan dinding yang digambar; bawaan: lampu langkah a2. */
    decor?: readonly string[];
};

export type WebGLStats = {
    lens: Lens;
    pitchDeg: number;
    fovDeg: number | null;
    scale: number;
    integer: boolean;
    upscale: Upscale;
    prescale: number;
    internal: [number, number];
    device: [number, number];
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
    sprites: number;
    spriteFrames: number;
    driftActive: boolean;
};

/** Sudut pandang lensa perspektif bawaan (lensa panjang). */
export const DEFAULT_FOV = 10;

/** Kedalaman sprite digeser sedikit ke arah kamera supaya kakinya menang dari lantai. */
const FOOT_DEPTH_BIAS = 0.05;

const BLIT_VERTEX = /* glsl */ `
void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Piksel layar → texel gambar dalam. +1 melewati margin satu texel untuk geser
// halus; uFrac = sisa geser kamera (piksel dalam).
// uMode 0: nearest murni. uMode 1: sharp bilinear: seolah gambar diperbesar
// nearest ×uPrescale (kelipatan bulat di atas skala), lalu diperkecil linear ke
// skala sebenarnya; hanya batas antartexel yang dicampur, paling lebar 1 piksel.
const BLIT_FRAGMENT = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uSize;
uniform float uScale;
uniform vec2 uFrac;
uniform float uMode;
uniform float uPrescale;

float sharpAxis(float p, float k) {
    float q = p * k;
    float j0 = floor(q - 0.5);
    float w = q - 0.5 - j0;
    float t0 = floor((j0 + 0.5) / k);
    float t1 = floor((j0 + 1.5) / k);

    return t0 == t1 ? t0 + 0.5 : t0 + 0.5 + w;
}

void main() {
    vec2 p = gl_FragCoord.xy / uScale + 1.0 + uFrac;
    vec2 t = uMode > 0.5
        ? vec2(sharpAxis(p.x, uPrescale), sharpAxis(p.y, uPrescale))
        : floor(p) + 0.5;
    gl_FragColor = texture2D(tScene, t / uSize);
    #include <colorspace_fragment>
}
`;

function atlasTexture(pack: AtlasPack): Texture {
    const texture = new Texture(pack.image as HTMLCanvasElement);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;

    return texture;
}

export class WebGLView implements DioramaView {
    readonly kind = 'webgl' as const;

    private readonly renderer: WebGLRenderer;
    private readonly canvas: HTMLCanvasElement;
    private readonly scene = new Scene();
    private readonly blitScene = new Scene();
    private readonly blitCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    private readonly blitMaterial: ShaderMaterial;
    private readonly blitGeometry = new BufferGeometry();
    private readonly storeGeometry = new BufferGeometry();
    private readonly storeMaterial: MeshBasicMaterial;
    private readonly atlasPack: AtlasPack;
    private readonly atlasTexture: Texture;
    private readonly registry: AtlasRegistry;
    private readonly spriteAtlas: SpriteAtlas;
    private readonly billboards: BillboardBatch;
    private readonly headings = new Map<number, Heading>();
    private readonly staticSprites: ActorSprite[];
    private target: WebGLRenderTarget;
    private camera: PerspectiveCamera | OrthographicCamera;
    private readonly storeScene: StoreScene;
    private readonly furnitureIds: readonly string[];

    private pitchDeg: number;
    private lens: Lens;
    private fovDeg: number;
    private driftEnabled: boolean;
    private upscale: Upscale;
    private basis: CameraBasis;
    private frame: Frame;
    private viewport: Viewport = {
        scale: 1,
        width: 1,
        height: 1,
        integer: true,
    };
    private dpr = 1;
    private deviceSize: [number, number] = [1, 1];
    private fillsKey = '';
    private spriteCount = 0;

    private pointer: { x: number; y: number } | null = null;
    private drift = { x: 0, vx: 0, y: 0, vy: 0 };
    private fraction = new Vector2();
    private reducedMotion = false;
    private finePointer = true;
    private readonly lostCallbacks: (() => void)[] = [];
    private readonly mediaQueries: {
        query: MediaQueryList;
        listener: () => void;
    }[] = [];

    /** Buat tampilan setelah atlas dan gambar karakter pemilik siap. */
    static async create(options: WebGLViewOptions = {}): Promise<WebGLView> {
        const scene = options.scene ?? STORE_SCENE;
        const registry = new AtlasRegistry([
            new ProceduralSource(scene, {
                furniture: options.furniture ?? A2_FURNITURE,
                decor: options.decor ?? A2_DECOR,
            }),
        ]);
        await Promise.all([registry.load(), loadReferences()]);

        return new WebGLView(registry, options);
    }

    private constructor(registry: AtlasRegistry, options: WebGLViewOptions) {
        this.registry = registry;
        this.storeScene = options.scene ?? STORE_SCENE;
        this.furnitureIds = options.furniture ?? A2_FURNITURE;
        this.pitchDeg = options.pitchDeg ?? PITCH_DEG;
        this.lens = options.lens ?? 'perspektif';
        this.fovDeg = options.fovDeg ?? DEFAULT_FOV;
        this.driftEnabled = options.drift ?? true;
        this.upscale = options.upscale ?? 'nearest';
        this.basis = cameraBasis(this.pitchDeg);
        this.frame = frameOf(storeCorners(this.storeScene), this.basis);

        this.renderer = new WebGLRenderer({
            antialias: false,
            alpha: false,
            powerPreference: 'default',
        });
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = SRGBColorSpace;
        // Statistik dihitung per bingkai (adegan + perbesaran), bukan per render().
        this.renderer.info.autoReset = false;
        this.canvas = this.renderer.domElement;
        this.canvas.style.display = 'block';
        this.canvas.style.imageRendering = 'pixelated';
        this.canvas.addEventListener('webglcontextlost', this.onContextLost);

        this.scene.background = new Color(BACKDROP);

        // Balok toko, perabot, dan hiasan: satu geometri, satu bahan, satu atlas.
        this.atlasPack = registry.loaded[0];
        this.atlasTexture = atlasTexture(this.atlasPack);
        const frameLookup = (key: string): AtlasFrame => {
            const found = registry.find(key);

            if (!found) {
                throw new Error(`Tekstur ${key} tidak ada di atlas.`);
            }

            return found.frame;
        };
        const layout = this.atlasPack.layout;
        const arrays: MeshArrays = buildStore(
            this.storeScene,
            layout,
            frameLookup,
        );
        buildFurniture(
            arrays,
            this.storeScene,
            this.furnitureIds,
            layout,
            frameLookup,
        );
        buildDecor(arrays, options.decor ?? A2_DECOR, layout, frameLookup);
        this.storeGeometry.setAttribute(
            'position',
            new BufferAttribute(new Float32Array(arrays.positions), 3),
        );
        this.storeGeometry.setAttribute(
            'uv',
            new BufferAttribute(new Float32Array(arrays.uvs), 2),
        );
        this.storeGeometry.setAttribute(
            'color',
            new BufferAttribute(new Float32Array(arrays.colors), 3),
        );
        this.storeGeometry.setIndex(arrays.indices);
        // alphaTest: piksel kosong hiasan (lampu) dibuang, tidak menjadi hitam.
        this.storeMaterial = new MeshBasicMaterial({
            map: this.atlasTexture,
            vertexColors: true,
            alphaTest: 0.5,
        });
        this.scene.add(new Mesh(this.storeGeometry, this.storeMaterial));

        // Aktor dan sprite tetap (daun tanaman): satu kumpulan billboard.
        this.spriteAtlas = new SpriteAtlas();
        this.billboards = new BillboardBatch(this.spriteAtlas);
        this.scene.add(this.billboards.mesh);
        this.staticSprites = this.storeScene.furniture
            .filter(
                (f) => f.kind === 'tanaman' && this.furnitureIds.includes(f.id),
            )
            .map((f, i) => plantSprite(f, SEED + 40 + i));

        // Target resolusi dalam, disimpan sRGB 8-bit supaya warna palet tidak
        // bergeser. Penyaring linear hanya terpakai oleh sharp bilinear; mode
        // nearest selalu mengambil tengah texel.
        this.target = this.createTarget(2, 2);

        this.blitGeometry.setAttribute(
            'position',
            new BufferAttribute(
                new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
                3,
            ),
        );
        this.blitMaterial = new ShaderMaterial({
            uniforms: {
                tScene: { value: this.target.texture },
                uSize: { value: new Vector2(2, 2) },
                uScale: { value: 1 },
                uFrac: { value: this.fraction },
                uMode: { value: this.upscale === 'sharp' ? 1 : 0 },
                uPrescale: { value: 1 },
            },
            vertexShader: BLIT_VERTEX,
            fragmentShader: BLIT_FRAGMENT,
            depthTest: false,
            depthWrite: false,
        });
        const blit = new Mesh(this.blitGeometry, this.blitMaterial);
        blit.frustumCulled = false;
        this.blitScene.add(blit);

        this.camera = this.createCamera();
    }

    attach(host: HTMLElement): void {
        host.appendChild(this.canvas);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerleave', this.onPointerLeave);

        if (typeof window.matchMedia === 'function') {
            this.watchMedia('(prefers-reduced-motion: reduce)', (m) => {
                this.reducedMotion = m;
            });
            this.watchMedia('(pointer: fine)', (m) => {
                this.finePointer = m;
            });
        }
    }

    resize(cssWidth: number, cssHeight: number, dpr: number): void {
        this.dpr = dpr;
        const dw = Math.max(1, Math.round(cssWidth * dpr));
        const dh = Math.max(1, Math.round(cssHeight * dpr));
        this.deviceSize = [dw, dh];
        this.renderer.setSize(dw, dh, false);
        this.canvas.style.width = `${cssWidth}px`;
        this.canvas.style.height = `${cssHeight}px`;
        this.applyViewport();
    }

    render(world: DioramaWorld, options: RenderOptions, dt: number): void {
        this.updateDrift(dt);
        this.applyFills(options.fills ?? {});
        this.updateSprites(world);
        this.renderer.info.reset();
        this.renderer.setRenderTarget(this.target);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.blitScene, this.blitCamera);
    }

    toScreen(anchor: WorldAnchor): Point | null {
        const v = new Vector3(anchor.gx, anchor.z, anchor.gy).project(
            this.camera,
        );

        if (v.z < -1 || v.z > 1) {
            return null;
        }

        const tw = this.viewport.width + 2;
        const th = this.viewport.height + 2;
        const scale = this.viewport.scale;
        // NDC → texel target (y ke atas) → piksel perangkat (kebalikan rumus
        // perbesaran di BLIT_FRAGMENT) → piksel CSS dari atas.
        const tx = ((v.x + 1) / 2) * tw;
        const ty = ((v.y + 1) / 2) * th;
        const dx = (tx - 1 - this.fraction.x) * scale;
        const dyUp = (ty - 1 - this.fraction.y) * scale;

        return {
            x: dx / this.dpr,
            y: (this.deviceSize[1] - dyUp) / this.dpr,
        };
    }

    pick(_point: Point): Customer | null {
        // Klik pelanggan dipasang di langkah c (proyeksi kotak sprite).
        return null;
    }

    onLost(callback: () => void): void {
        this.lostCallbacks.push(callback);
    }

    // ---- Pengaturan lab -----------------------------------------------------

    setPitch(pitchDeg: number): void {
        this.pitchDeg = pitchDeg;
        this.basis = cameraBasis(pitchDeg);
        this.frame = frameOf(storeCorners(this.storeScene), this.basis);
        this.camera = this.createCamera();
        this.applyViewport();
    }

    setLens(lens: Lens): void {
        this.lens = lens;
        this.camera = this.createCamera();
        this.applyViewport();
    }

    setDrift(enabled: boolean): void {
        this.driftEnabled = enabled;
    }

    setUpscale(mode: Upscale): void {
        this.upscale = mode;
        this.blitMaterial.uniforms.uMode.value = mode === 'sharp' ? 1 : 0;
    }

    stats(): WebGLStats {
        const info = this.renderer.info;

        return {
            lens: this.lens,
            pitchDeg: this.pitchDeg,
            fovDeg:
                this.camera instanceof PerspectiveCamera
                    ? this.camera.fov
                    : null,
            scale: this.viewport.scale,
            integer: this.viewport.integer,
            upscale: this.upscale,
            prescale: this.blitMaterial.uniforms.uPrescale.value as number,
            internal: [this.viewport.width, this.viewport.height],
            device: this.deviceSize,
            calls: info.render.calls,
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            sprites: this.spriteCount,
            spriteFrames: this.spriteAtlas.count,
            driftActive: this.driftAllowed(),
        };
    }

    dispose(): void {
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
        this.canvas.removeEventListener('webglcontextlost', this.onContextLost);

        for (const { query, listener } of this.mediaQueries) {
            query.removeEventListener('change', listener);
        }

        this.storeGeometry.dispose();
        this.storeMaterial.dispose();
        this.atlasTexture.dispose();
        this.billboards.dispose();
        this.spriteAtlas.dispose();
        this.blitGeometry.dispose();
        this.blitMaterial.dispose();
        this.target.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.canvas.remove();
    }

    // ---- Bagian dalam -------------------------------------------------------

    /** Lukis ulang muka depan rak dan kulkas bila isi stoknya berubah. */
    private applyFills(fills: ShelfFills): void {
        const key = JSON.stringify(fills);

        if (key === this.fillsKey) {
            return;
        }

        this.fillsKey = key;
        const ctx = (this.atlasPack.image as HTMLCanvasElement).getContext(
            '2d',
        );

        if (!ctx) {
            return;
        }

        const pad = this.atlasPack.layout.padding;

        for (const entry of fillEntries(
            this.storeScene,
            this.furnitureIds,
            fills,
        )) {
            const found = this.registry.find(entry.key);

            if (!found) {
                continue;
            }

            const raster = rasterizeFrame(entry, pad);
            ctx.putImageData(
                new ImageData(raster.data, raster.width, raster.height),
                found.frame.x - pad,
                found.frame.y - pad,
            );
        }

        this.atlasTexture.needsUpdate = true;
    }

    /** Susun ulang billboard: tiap sprite diletakkan di titik pijaknya (dibulatkan). */
    private updateSprites(world: DioramaWorld): void {
        const sprites = [
            ...this.staticSprites,
            ...actorSprites(world, referenceMatrix, this.headings),
        ];
        const tw = this.viewport.width + 2;
        const th = this.viewport.height + 2;
        const back = this.basis.back;
        const draws: BillboardDraw[] = [];
        const v = new Vector3();

        for (const sprite of sprites) {
            const entry = this.spriteAtlas.get(sprite.key, sprite.build);

            if (!entry) {
                continue;
            }

            const [fx, fy, fz] = sprite.foot;
            v.set(fx, fy, fz).project(this.camera);
            const foot = { x: ((v.x + 1) / 2) * tw, y: ((v.y + 1) / 2) * th };
            v.set(
                fx + back[0] * FOOT_DEPTH_BIAS,
                fy + back[1] * FOOT_DEPTH_BIAS,
                fz + back[2] * FOOT_DEPTH_BIAS,
            ).project(this.camera);
            const rect = spriteRect(foot, entry, sprite.hover);

            draws.push({
                rect: rectToNdc(rect, { width: tw, height: th }),
                z: v.z,
                entry,
                alpha: sprite.alpha,
            });
        }

        this.billboards.update(draws);
        this.spriteAtlas.flush();
        this.spriteCount = draws.length;
    }

    private createTarget(width: number, height: number): WebGLRenderTarget {
        return new WebGLRenderTarget(width, height, {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            generateMipmaps: false,
            depthBuffer: true,
            colorSpace: SRGBColorSpace,
        });
    }

    private createCamera(): PerspectiveCamera | OrthographicCamera {
        if (this.lens === 'ortografik') {
            return new OrthographicCamera(-1, 1, 1, -1, 1, 400);
        }

        return new PerspectiveCamera(this.fovDeg, 1, 1, 400);
    }

    private applyViewport(): void {
        const [dw, dh] = this.deviceSize;
        this.viewport = viewportFor(dw, dh, this.frame);
        const tw = this.viewport.width + 2;
        const th = this.viewport.height + 2;

        if (this.target.width !== tw || this.target.height !== th) {
            this.target.setSize(tw, th);
        }

        this.blitMaterial.uniforms.uSize.value.set(tw, th);
        this.blitMaterial.uniforms.uScale.value = this.viewport.scale;
        this.blitMaterial.uniforms.uPrescale.value = Math.max(
            1,
            Math.ceil(this.viewport.scale - 1e-6),
        );
        this.placeCamera();
    }

    /** Letakkan kamera: target bingkai + geser (sudah dibulatkan ke piksel). */
    private placeCamera(): void {
        const tw = this.viewport.width + 2;
        const th = this.viewport.height + 2;
        const sx = snapToPixel(this.drift.x);
        const sy = snapToPixel(this.drift.y);
        this.fraction.set(sx.fraction, sy.fraction);
        const { right, up, back } = this.basis;
        const target = new Vector3(
            this.frame.center[0] + right[0] * sx.snapped + up[0] * sy.snapped,
            this.frame.center[1] + right[1] * sx.snapped + up[1] * sy.snapped,
            this.frame.center[2] + right[2] * sx.snapped + up[2] * sy.snapped,
        );

        if (this.camera instanceof OrthographicCamera) {
            const hw = tw / PX_PER_UNIT / 2;
            const hh = th / PX_PER_UNIT / 2;
            this.camera.left = -hw;
            this.camera.right = hw;
            this.camera.top = hh;
            this.camera.bottom = -hh;
            this.camera.position.set(
                target.x + back[0] * 100,
                target.y + back[1] * 100,
                target.z + back[2] * 100,
            );
        } else {
            const distance = focusDistance(this.fovDeg);
            this.camera.fov = fovFor(th, distance);
            this.camera.aspect = tw / th;
            this.camera.near = Math.max(1, distance - 40);
            this.camera.far = distance + 40;
            this.camera.position.set(
                target.x + back[0] * distance,
                target.y + back[1] * distance,
                target.z + back[2] * distance,
            );
        }

        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(target);
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
    }

    private driftAllowed(): boolean {
        return this.driftEnabled && !this.reducedMotion && this.finePointer;
    }

    private updateDrift(dt: number): void {
        const goal =
            this.driftAllowed() && this.pointer
                ? driftTarget(this.pointer.x, this.pointer.y)
                : { x: 0, y: 0 };
        const x = springStep(this.drift.x, this.drift.vx, goal.x, dt);
        const y = springStep(this.drift.y, this.drift.vy, goal.y, dt);
        this.drift = { x: x.value, vx: x.velocity, y: y.value, vy: y.velocity };
        this.placeCamera();
    }

    private watchMedia(query: string, apply: (matches: boolean) => void): void {
        const list = window.matchMedia(query);
        const listener = () => apply(list.matches);
        apply(list.matches);
        list.addEventListener('change', listener);
        this.mediaQueries.push({ query: list, listener });
    }

    private readonly onPointerMove = (event: PointerEvent): void => {
        if (event.pointerType !== 'mouse') {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        this.pointer = {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
        };
    };

    private readonly onPointerLeave = (): void => {
        this.pointer = null;
    };

    private readonly onContextLost = (event: Event): void => {
        event.preventDefault();

        for (const callback of this.lostCallbacks) {
            callback();
        }
    };
}

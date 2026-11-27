/**
 * Tampilan WebGL diorama (Tahap 5H) dengan three.js.
 *
 * Langkah a1: balok toko, resolusi dalam + skala bulat, kamera bergeser.
 * Langkah a2: perabot, lampu dinding, zombie, pelanggan sebagai billboard
 * 1 piksel gambar = 1 piksel dalam.
 * Langkah a3: rantai cahaya sore (rencana bagian 3):
 * - matahari jingga rendah + peta bayangan, cahaya langit + oklusi di warna
 *   vertex, lampu hangat + halo, berkas sinar jendela, debu berkilau;
 * - karakter ikut gelap-terang, rim keemasan, bayangan kontak dan panjang;
 * - pipa: adegan → target resolusi dalam (+ kedalaman) → bloom dan blur kecil
 *   → satu komposit di resolusi layar (tajam nearest/sharp bilinear, kabur
 *   linear), kabut, olah warna, vinyet;
 * - statistik per bingkai (CPU, GPU bila didukung) dan penjaga performa 0–3.
 */
import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Mesh,
    MeshLambertMaterial,
    NearestFilter,
    OrthographicCamera,
    PCFShadowMap,
    PerspectiveCamera,
    SRGBColorSpace,
    Scene,
    Texture,
    Vector2,
    Vector3,
    Vector4,
    WebGLRenderer,
} from 'three';
import { AtlasRegistry, rasterizeFrame } from '../assets/atlas';
import type { AtlasFrame, AtlasPack } from '../assets/atlas';
import {
    A2_FURNITURE,
    A3_DECOR,
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
import type { Box } from './build-furniture';
import { withAmbientOcclusion } from './build-lighting';
import { buildStore, emptyMesh, storeCorners } from './build-store';
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
import { ALL_EFFECTS, resolveEffects } from './effects';
import type { Effects, Tier } from './effects';
import {
    furnitureBoxes,
    lampIrradiance,
    windowGlassRect,
    windowMullions,
} from './lighting-math';
import { BACKDROP } from './palette-world';
import { FrameStats, PerfGovernor } from './perf';
import { PostPipeline } from './post';
import type { PostSettings } from './post';
import { LIGHT, SceneLights } from './scene-lights';
import { PITCH_DEG, PX_PER_UNIT, TEXEL_V, WALL_H } from './space';
import {
    BillboardBatch,
    ContactShadows,
    ShadowCasters,
    SpriteAtlas,
} from './sprite-batch';
import type { BillboardDraw, CasterDraw, ContactDraw } from './sprite-batch';
import { rectToNdc, spriteRect } from './sprite-quad';

export type Lens = 'perspektif' | 'ortografik';
/** Cara memperbesar gambar dalam ke layar saat skalanya pecahan. */
export type Upscale = 'nearest' | 'sharp';
/** Tingkat kualitas tetap, atau dipilih penjaga performa. */
export type TierMode = Tier | 'otomatis';

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
    /** Hiasan dinding; bawaan: kedua lampu dan jendela (a3). */
    decor?: readonly string[];
    effects?: Effects;
    tier?: TierMode;
};

export type WebGLStats = {
    backend: 'WebGL2';
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
    tier: Tier;
    tierMode: 'otomatis' | 'manual';
    shadowMap: number;
    fps: number;
    cpu50: number;
    cpu90: number;
    gpu50: number | null;
    gpu90: number | null;
    /** Tingkat 3 tetap berat: sebaiknya pindah ke diorama Canvas. */
    fallback: boolean;
};

/** Sudut pandang lensa perspektif bawaan (lensa panjang). */
export const DEFAULT_FOV = 10;

/** Kedalaman sprite digeser sedikit ke arah kamera supaya kakinya menang dari lantai. */
const FOOT_DEPTH_BIAS = 0.05;
/** Arah rim di layar (texel): kanan-atas, sisi jendela. */
const RIM_DIR: [number, number] = [1, 1];

function atlasTexture(image: TexImageSource): Texture {
    const texture = new Texture(image as HTMLCanvasElement);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;

    return texture;
}

/** Pengukur waktu GPU (EXT_disjoint_timer_query_webgl2) bila browser mendukung. */
class GpuTimer {
    private readonly ext: {
        TIME_ELAPSED_EXT: number;
        GPU_DISJOINT_EXT: number;
    } | null;
    private pending: WebGLQuery[] = [];
    private active: WebGLQuery | null = null;
    last: number | undefined;

    constructor(private readonly gl: WebGL2RenderingContext) {
        this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    }

    get supported(): boolean {
        return this.ext !== null;
    }

    begin(): void {
        if (!this.ext || this.active || this.pending.length > 4) {
            return;
        }

        const q = this.gl.createQuery();

        if (q) {
            this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
            this.active = q;
        }
    }

    end(): void {
        if (!this.ext || !this.active) {
            return;
        }

        this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
        this.pending.push(this.active);
        this.active = null;
        this.poll();
    }

    dispose(): void {
        for (const q of this.pending) {
            this.gl.deleteQuery(q);
        }

        this.pending = [];
    }

    private poll(): void {
        if (!this.ext) {
            return;
        }

        const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);

        while (this.pending.length > 0) {
            const q = this.pending[0];

            if (!this.gl.getQueryParameter(q, this.gl.QUERY_RESULT_AVAILABLE)) {
                break;
            }

            if (!disjoint) {
                this.last =
                    this.gl.getQueryParameter(q, this.gl.QUERY_RESULT) / 1e6;
            }

            this.gl.deleteQuery(q);
            this.pending.shift();
        }
    }
}

type LitMesh = {
    geometry: BufferGeometry;
    mesh: Mesh;
    base: Float32Array;
    occluded: Float32Array;
};

export class WebGLView implements DioramaView {
    readonly kind = 'webgl' as const;

    private readonly renderer: WebGLRenderer;
    private readonly canvas: HTMLCanvasElement;
    private readonly scene = new Scene();
    private readonly material: MeshLambertMaterial;
    private readonly room: LitMesh;
    private readonly furnitureMesh: LitMesh;
    private readonly atlasPack: AtlasPack;
    private readonly atlasTexture: Texture;
    private readonly glowTexture: Texture | null;
    private readonly registry: AtlasRegistry;
    private readonly spriteAtlas: SpriteAtlas;
    private readonly billboards: BillboardBatch;
    private readonly contact: ContactShadows;
    private readonly casters: ShadowCasters;
    private readonly lights: SceneLights;
    private readonly post: PostPipeline;
    private readonly boxes: Box[];
    private readonly headings = new Map<number, Heading>();
    private readonly staticSprites: ActorSprite[];
    private camera: PerspectiveCamera | OrthographicCamera;
    private readonly storeScene: StoreScene;
    private readonly furnitureIds: readonly string[];

    private pitchDeg: number;
    private lens: Lens;
    private fovDeg: number;
    private driftEnabled: boolean;
    private upscale: Upscale;
    private chosen: Effects;
    private tierMode: TierMode;
    private tier: Tier = 0;
    private applied: ReturnType<typeof resolveEffects> | null = null;
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
    private time = 0;

    private readonly frameStats = new FrameStats();
    private readonly governor = new PerfGovernor(0);
    private readonly gpu: GpuTimer;
    private lastFrame: number | null = null;
    private lastGovern = 0;
    private fallback = false;

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
                decor: options.decor ?? A3_DECOR,
                lampsOn: true,
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
        this.chosen = { ...(options.effects ?? ALL_EFFECTS) };
        this.tierMode = options.tier ?? 'otomatis';
        this.tier = this.tierMode === 'otomatis' ? 0 : this.tierMode;
        this.basis = cameraBasis(this.pitchDeg);
        this.frame = frameOf(storeCorners(this.storeScene), this.basis);
        const decor = options.decor ?? A3_DECOR;

        this.renderer = new WebGLRenderer({
            antialias: false,
            alpha: false,
            powerPreference: 'default',
        });
        this.renderer.setPixelRatio(1);
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFShadowMap;
        // Statistik dihitung per bingkai (semua pass), bukan per render().
        this.renderer.info.autoReset = false;
        this.canvas = this.renderer.domElement;
        this.canvas.style.display = 'block';
        this.canvas.style.imageRendering = 'pixelated';
        this.canvas.addEventListener('webglcontextlost', this.onContextLost);
        this.gpu = new GpuTimer(
            this.renderer.getContext() as WebGL2RenderingContext,
        );

        this.scene.background = new Color(BACKDROP);

        // Atlas warna dan atlas cahaya (kaca jendela, bola lampu → emissive).
        this.atlasPack = registry.loaded[0];
        this.atlasTexture = atlasTexture(this.atlasPack.image);
        this.glowTexture = this.atlasPack.glowImage
            ? atlasTexture(this.atlasPack.glowImage)
            : null;
        this.material = new MeshLambertMaterial({
            map: this.atlasTexture,
            vertexColors: true,
            // Piksel kosong hiasan (lampu, jendela) dibuang, tidak menjadi hitam.
            alphaTest: 0.5,
            emissive: new Color(this.glowTexture ? '#ffffff' : '#000000'),
            emissiveMap: this.glowTexture,
            emissiveIntensity: LIGHT.emissive,
        });

        const frameLookup = (key: string): AtlasFrame => {
            const found = registry.find(key);

            if (!found) {
                throw new Error(`Tekstur ${key} tidak ada di atlas.`);
            }

            return found.frame;
        };
        const layout = this.atlasPack.layout;
        const selected = this.storeScene.furniture.filter((f) =>
            this.furnitureIds.includes(f.id),
        );
        this.boxes = furnitureBoxes(selected);

        // Ruangan (lantai, dinding, alas, hiasan): menerima bayangan.
        const roomArrays = buildStore(this.storeScene, layout, frameLookup);
        buildDecor(roomArrays, decor, layout, frameLookup);
        this.room = this.litMesh(roomArrays);
        this.room.mesh.receiveShadow = true;
        // Perabot: menerima dan melempar bayangan.
        const furnitureArrays = emptyMesh();
        buildFurniture(
            furnitureArrays,
            this.storeScene,
            this.furnitureIds,
            layout,
            frameLookup,
        );
        this.furnitureMesh = this.litMesh(furnitureArrays);
        this.furnitureMesh.mesh.receiveShadow = true;
        this.furnitureMesh.mesh.castShadow = true;

        // Cahaya, sprite, bayangan karakter.
        this.lights = new SceneLights(
            this.scene,
            this.frame.center,
            this.storeScene.width,
            decor.filter((k) => k.startsWith('lampu-')),
        );
        this.spriteAtlas = new SpriteAtlas();
        this.billboards = new BillboardBatch(this.spriteAtlas);
        this.contact = new ContactShadows('#140b0d', 0.42);
        this.casters = new ShadowCasters(this.spriteAtlas);
        this.scene.add(
            this.billboards.mesh,
            this.contact.mesh,
            this.casters.mesh,
        );
        this.staticSprites = selected
            .filter((f) => f.kind === 'tanaman')
            .map((f, i) => plantSprite(f, SEED + 40 + i));

        this.post = new PostPipeline(this.renderer);
        this.camera = this.createCamera();
        this.applyEffects();
    }

    attach(host: HTMLElement): void {
        host.appendChild(this.canvas);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerleave', this.onPointerLeave);

        if (typeof window.matchMedia === 'function') {
            this.watchMedia('(prefers-reduced-motion: reduce)', (m) => {
                this.reducedMotion = m;
                this.applyEffects();
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
        const start = performance.now();
        this.time += dt;
        this.updateDrift(dt);
        this.applyFills(options.fills ?? {});
        this.lights.update(this.time);
        this.updateSprites(world);
        this.renderer.info.reset();
        this.gpu.begin();
        this.post.render(
            this.renderer,
            this.scene,
            this.camera,
            this.postSettings(),
        );
        this.gpu.end();
        this.measure(start);
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
        // perbesaran di komposit) → piksel CSS dari atas.
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
    }

    setEffects(effects: Effects): void {
        this.chosen = { ...effects };
        this.applyEffects();
    }

    setTier(mode: TierMode): void {
        this.tierMode = mode;

        if (mode !== 'otomatis') {
            this.tier = mode;
            this.fallback = false;
        }

        this.frameStats.reset();
        this.applyEffects();
    }

    stats(): WebGLStats {
        const info = this.renderer.info;
        const gpu50 = this.frameStats.gpu(50);

        return {
            backend: 'WebGL2',
            lens: this.lens,
            pitchDeg: this.pitchDeg,
            fovDeg:
                this.camera instanceof PerspectiveCamera
                    ? this.camera.fov
                    : null,
            scale: this.viewport.scale,
            integer: this.viewport.integer,
            upscale: this.upscale,
            prescale: this.prescale(),
            internal: [this.viewport.width, this.viewport.height],
            device: this.deviceSize,
            calls: info.render.calls,
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            sprites: this.spriteCount,
            spriteFrames: this.spriteAtlas.count,
            driftActive: this.driftAllowed(),
            tier: this.tier,
            tierMode: this.tierMode === 'otomatis' ? 'otomatis' : 'manual',
            shadowMap: this.applied?.shadowMap ?? 0,
            fps: this.frameStats.fps(),
            cpu50: this.frameStats.cpu(50),
            cpu90: this.frameStats.cpu(90),
            gpu50,
            gpu90: gpu50 === null ? null : this.frameStats.gpu(90),
            fallback: this.fallback,
        };
    }

    /**
     * Lepas semua sumber daya. Mengembalikan sisa geometri dan tekstur di GPU
     * sesaat sebelum renderer dilepas (harus 0; dipakai uji bocor di lab).
     */
    dispose(): { geometries: number; textures: number } {
        this.canvas.removeEventListener('pointermove', this.onPointerMove);
        this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
        this.canvas.removeEventListener('webglcontextlost', this.onContextLost);

        for (const { query, listener } of this.mediaQueries) {
            query.removeEventListener('change', listener);
        }

        this.room.geometry.dispose();
        this.furnitureMesh.geometry.dispose();
        this.material.dispose();
        this.atlasTexture.dispose();
        this.glowTexture?.dispose();
        this.billboards.dispose();
        this.contact.dispose();
        this.casters.dispose();
        this.spriteAtlas.dispose();
        this.lights.dispose();
        this.post.dispose();
        this.gpu.dispose();
        const left = {
            geometries: this.renderer.info.memory.geometries,
            textures: this.renderer.info.memory.textures,
        };
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.canvas.remove();

        return left;
    }

    // ---- Bagian dalam -------------------------------------------------------

    private litMesh(arrays: MeshArrays): LitMesh {
        const geometry = new BufferGeometry();
        const base = new Float32Array(arrays.colors);
        const occluded = new Float32Array(
            withAmbientOcclusion(arrays, this.boxes),
        );
        geometry.setAttribute(
            'position',
            new BufferAttribute(new Float32Array(arrays.positions), 3),
        );
        geometry.setAttribute(
            'normal',
            new BufferAttribute(new Float32Array(arrays.vertexNormals), 3),
        );
        geometry.setAttribute(
            'uv',
            new BufferAttribute(new Float32Array(arrays.uvs), 2),
        );
        geometry.setAttribute(
            'color',
            new BufferAttribute(new Float32Array(base), 3),
        );
        geometry.setIndex(arrays.indices);
        const mesh = new Mesh(geometry, this.material);
        this.scene.add(mesh);

        return { geometry, mesh, base, occluded };
    }

    /** Terapkan efek terpilih yang dipotong tingkat kualitas dan gerak dikurangi. */
    private applyEffects(): void {
        const e = resolveEffects(this.chosen, this.tier, this.reducedMotion);
        this.applied = e;
        this.lights.setFlags({
            ambient: e.ambien,
            sun: e.matahari,
            shadowMap: e.shadowMap,
            beam: e.berkas,
            dust: e.debu,
            lamps: e.lampu,
        });

        for (const lit of [this.room, this.furnitureMesh]) {
            const attr = lit.geometry.getAttribute('color') as BufferAttribute;
            (attr.array as Float32Array).set(
                e.ambien ? lit.occluded : lit.base,
            );
            attr.needsUpdate = true;
        }

        this.material.emissiveIntensity =
            e.lampu || e.matahari ? LIGHT.emissive : 0;
        this.contact.mesh.visible = e.kontak;
        this.casters.mesh.visible = e.bayanganKarakter;
        const glass = windowGlassRect();
        const [mv, mh] = windowMullions();
        const rim = new Color(LIGHT.rimColor);
        const outline = new Color('#2b2a33');
        this.billboards.setLighting({
            lit: e.cahayaSprite,
            ambient: this.lights.ambientIrradiance(),
            sun: this.lights.sunIrradiance(),
            toSun: this.lights.toSun,
            glass: new Vector4(glass.x0, glass.x1, glass.y0, glass.y1),
            mullionV: mv
                ? new Vector4(mv.x0, mv.x1, mv.y0, mv.y1)
                : new Vector4(),
            mullionH: mh
                ? new Vector4(mh.x0, mh.x1, mh.y0, mh.y1)
                : new Vector4(),
            wallH: WALL_H,
            sceneW: this.storeScene.width,
            boxes: this.boxes.map((b) => ({
                min: [b.x0, b.y0, b.z0],
                max: [b.x1, b.y1, b.z1],
            })),
            texelV: TEXEL_V,
            px: PX_PER_UNIT,
            camRight: this.basis.right,
            rim: e.rim,
            rimDir: RIM_DIR,
            rimColor: new Vector3(
                rim.r * LIGHT.rimStrength,
                rim.g * LIGHT.rimStrength,
                rim.b * LIGHT.rimStrength,
            ),
            outline: e.garisLuar,
            outlineColor: new Vector3(outline.r, outline.g, outline.b),
        });
    }

    private postSettings(): PostSettings {
        const e = this.applied ?? resolveEffects(this.chosen, this.tier, false);
        const ortho = this.camera instanceof OrthographicCamera;

        return {
            scale: this.viewport.scale,
            upscale: this.upscale,
            prescale: this.prescale(),
            fraction: this.fraction,
            near: this.camera.near,
            far: this.camera.far,
            ortho,
            focus: ortho ? 100 : focusDistance(this.fovDeg),
            bloomLevels: e.bloom ? e.bloomLevels : 0,
            blur: e.dof ? e.blur : 'mati',
            fog: e.kabut,
            grade: e.warna,
            vignette: e.vinyet,
        };
    }

    private prescale(): number {
        return Math.max(1, Math.ceil(this.viewport.scale - 1e-6));
    }

    /** Catat beban bingkai; penjaga performa menilai tiap 0,5 detik. */
    private measure(start: number): void {
        const now = performance.now();
        const interval = this.lastFrame === null ? 33 : now - this.lastFrame;
        this.lastFrame = now;
        this.frameStats.push({
            interval,
            cpu: now - start,
            gpu: this.gpu.last,
        });

        if (this.tierMode !== 'otomatis' || now - this.lastGovern < 500) {
            return;
        }

        this.lastGovern = now;
        const state = this.governor.update(now / 1000, this.frameStats);
        this.fallback = state.fallback;

        if (state.tier !== this.tier) {
            this.tier = state.tier;
            this.applyEffects();
        }
    }

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

    /**
     * Susun ulang sprite untuk bingkai ini: billboard (kaki dibulatkan ke
     * piksel), bayangan kontak, dan penghasil bayangan panjang.
     */
    private updateSprites(world: DioramaWorld): void {
        const sprites = [
            ...this.staticSprites,
            ...actorSprites(world, referenceMatrix, this.headings),
        ];
        const tw = this.viewport.width + 2;
        const th = this.viewport.height + 2;
        const back = this.basis.back;
        const lampsOn = this.lights.lampsOn;
        const draws: BillboardDraw[] = [];
        const contacts: ContactDraw[] = [];
        const casters: CasterDraw[] = [];
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
            const isActor = !sprite.key.startsWith('daun|');

            draws.push({
                rect: rectToNdc(rect, { width: tw, height: th }),
                z: v.z,
                entry,
                alpha: sprite.alpha,
                foot: sprite.foot,
                hover: sprite.hover,
                lamp: lampsOn
                    ? lampIrradiance([fx, fy + 0.6, fz], this.lights.lampModels)
                    : [0, 0, 0],
            });

            if (isActor) {
                // Ukuran elips sama dengan Canvas: lebar 2s + 8 piksel, s dari lebar gambar.
                const s = Math.max(
                    8,
                    Math.min(24, Math.round((entry.w - 12) * 0.45)),
                );
                contacts.push({
                    foot: sprite.foot,
                    radius: (s + 4) / PX_PER_UNIT,
                    alpha: sprite.alpha,
                });
            }

            if (sprite.alpha > 0.5) {
                casters.push({ foot: sprite.foot, hover: sprite.hover, entry });
            }
        }

        this.billboards.update(draws);
        this.contact.update(contacts);
        this.casters.update(casters, this.lights.toSun, PX_PER_UNIT, TEXEL_V);
        this.spriteAtlas.flush();
        this.spriteCount = draws.length;
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
        this.post.setSize(
            this.viewport.width + 2,
            this.viewport.height + 2,
            dw,
            dh,
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

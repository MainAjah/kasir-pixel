/**
 * Pipa render pasca diorama 3D (Tahap 5H langkah a3, rencana bagian 3):
 * 1. adegan → target resolusi dalam (+ tekstur kedalaman);
 * 2. pass kecil: bloom bertingkat (terang → ½ → ¼ → ⅛ → naik lagi) dan blur
 *    untuk tepi kabur (½ dan ¼), filter dual Kawase;
 * 3. satu komposit di resolusi layar (lihat COMPOSITE_FRAGMENT).
 *
 * Bila browser tidak bisa merender ke tekstur half-float, target pasca memakai
 * 8 bit (sedikit lebih belang, tetap jalan).
 */
import {
    BufferAttribute,
    BufferGeometry,
    Color,
    DepthTexture,
    HalfFloatType,
    LinearFilter,
    LinearSRGBColorSpace,
    Mesh,
    NearestFilter,
    OrthographicCamera,
    SRGBColorSpace,
    Scene,
    ShaderMaterial,
    UnsignedByteType,
    Vector2,
    Vector3,
    WebGLRenderTarget,
} from 'three';
import type { Camera, TextureDataType, WebGLRenderer } from 'three';
import {
    COMPOSITE_FRAGMENT,
    DOWNSAMPLE_FRAGMENT,
    FULLSCREEN_VERTEX,
    UPSAMPLE_FRAGMENT,
} from './shaders';

export type PostSettings = {
    /** Piksel perangkat per piksel dalam. */
    scale: number;
    upscale: 'nearest' | 'sharp';
    prescale: number;
    /** Sisa geser kamera (piksel dalam). */
    fraction: Vector2;
    near: number;
    far: number;
    ortho: boolean;
    /** Jarak bidang fokus dari kamera (satuan dunia). */
    focus: number;
    bloomLevels: number;
    blur: 'dof' | 'tilt' | 'mati';
    fog: boolean;
    grade: boolean;
    vignette: boolean;
};

/** Angka rasa (dipilih di lab): bloom, DOF, kabut, olah warna. */
export const LOOK = {
    bloomThreshold: 0.62,
    bloomStrength: 0.85,
    dofRange: [3.5, 6] as [number, number],
    tilt: [0.18, 0.14] as [number, number],
    fogRange: [4, 14] as [number, number],
    fogAmount: 0.18,
    fogColor: '#c99a7a',
    lift: '#17213a',
    liftAmount: 0.06,
    vignette: 0.45,
    vignetteColor: '#0f1626',
} as const;

type Target = WebGLRenderTarget;

export class PostPipeline {
    readonly scene: Target;
    private readonly bloomDown: Target[];
    private readonly bloomUp: Target[];
    private readonly blur: Target[];
    private readonly quad: Mesh;
    private readonly quadScene = new Scene();
    private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    private readonly geometry = new BufferGeometry();
    private readonly down: ShaderMaterial;
    private readonly up: ShaderMaterial;
    private readonly composite: ShaderMaterial;
    private readonly screen = new Vector2(1, 1);

    constructor(renderer: WebGLRenderer) {
        const type: TextureDataType = renderer.extensions.has(
            'EXT_color_buffer_float',
        )
            ? HalfFloatType
            : UnsignedByteType;
        const linear = () =>
            new WebGLRenderTarget(2, 2, {
                minFilter: LinearFilter,
                magFilter: LinearFilter,
                generateMipmaps: false,
                depthBuffer: false,
                type,
                colorSpace: LinearSRGBColorSpace,
            });

        // Adegan: sRGB 8 bit (warna palet tetap), penyaring linear untuk sharp
        // bilinear dan blur; kedalaman sebagai tekstur (nearest) untuk DOF dan kabut.
        const depth = new DepthTexture(2, 2);
        depth.minFilter = NearestFilter;
        depth.magFilter = NearestFilter;
        this.scene = new WebGLRenderTarget(2, 2, {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            generateMipmaps: false,
            depthBuffer: true,
            depthTexture: depth,
            colorSpace: SRGBColorSpace,
        });
        this.bloomDown = [linear(), linear(), linear()];
        this.bloomUp = [linear(), linear()];
        this.blur = [linear(), linear()];

        this.geometry.setAttribute(
            'position',
            new BufferAttribute(
                new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
                3,
            ),
        );
        const material = (
            fragmentShader: string,
            uniforms: ShaderMaterial['uniforms'],
        ) =>
            new ShaderMaterial({
                uniforms,
                vertexShader: FULLSCREEN_VERTEX,
                fragmentShader,
                depthTest: false,
                depthWrite: false,
            });
        this.down = material(DOWNSAMPLE_FRAGMENT, {
            tInput: { value: null },
            uTexel: { value: new Vector2() },
            uBright: { value: 0 },
            uThreshold: { value: LOOK.bloomThreshold },
        });
        this.up = material(UPSAMPLE_FRAGMENT, {
            tInput: { value: null },
            tBase: { value: null },
            uTexel: { value: new Vector2() },
            uAddBase: { value: 0 },
        });
        this.composite = material(COMPOSITE_FRAGMENT, {
            tScene: { value: this.scene.texture },
            tDepth: { value: depth },
            tBloom: { value: this.bloomUp[1].texture },
            tBlur1: { value: this.blur[0].texture },
            tBlur2: { value: this.blur[1].texture },
            uSize: { value: new Vector2() },
            uScreen: { value: this.screen },
            uScale: { value: 1 },
            uFrac: { value: new Vector2() },
            uMode: { value: 0 },
            uPrescale: { value: 1 },
            uNear: { value: 1 },
            uFar: { value: 100 },
            uOrtho: { value: 0 },
            uBloom: { value: 0 },
            uBlurMode: { value: 0 },
            uFocus: { value: 60 },
            uDofRange: { value: new Vector2(...LOOK.dofRange) },
            uTilt: { value: new Vector2(...LOOK.tilt) },
            uFog: { value: 0 },
            uFogColor: { value: linearColor(LOOK.fogColor) },
            uFogRange: { value: new Vector2(...LOOK.fogRange) },
            uGrade: { value: 0 },
            uLift: { value: srgbVector(LOOK.lift, LOOK.liftAmount) },
            uVignette: { value: 0 },
            uVignetteColor: { value: linearColor(LOOK.vignetteColor) },
        });
        this.quad = new Mesh(this.geometry, this.down);
        this.quad.frustumCulled = false;
        this.quadScene.add(this.quad);
    }

    /** Ukuran target adegan (gambar dalam + margin) dan layar perangkat. */
    setSize(
        width: number,
        height: number,
        deviceW: number,
        deviceH: number,
    ): void {
        if (this.scene.width !== width || this.scene.height !== height) {
            this.scene.setSize(width, height);
            const half = (k: number) => [
                Math.max(1, Math.ceil(width / k)),
                Math.max(1, Math.ceil(height / k)),
            ];
            this.bloomDown.forEach((t, i) =>
                t.setSize(...(half(2 ** (i + 1)) as [number, number])),
            );
            this.bloomUp[0].setSize(...(half(4) as [number, number]));
            this.bloomUp[1].setSize(...(half(2) as [number, number]));
            this.blur[0].setSize(...(half(2) as [number, number]));
            this.blur[1].setSize(...(half(4) as [number, number]));
        }

        this.screen.set(deviceW, deviceH);
        (this.composite.uniforms.uSize.value as Vector2).set(width, height);
    }

    /** Gambar adegan lalu seluruh rantai pasca ke layar. */
    render(
        renderer: WebGLRenderer,
        scene: Scene,
        camera: Camera,
        s: PostSettings,
    ): void {
        renderer.setRenderTarget(this.scene);
        renderer.render(scene, camera);

        if (s.bloomLevels > 0) {
            // Terang → ½ → ¼ (→ ⅛), lalu naik sambil menambah tingkat di atasnya.
            this.pass(renderer, this.down, this.bloomDown[0], this.scene, {
                uBright: 1,
            });
            this.pass(
                renderer,
                this.down,
                this.bloomDown[1],
                this.bloomDown[0],
                { uBright: 0 },
            );

            if (s.bloomLevels >= 3) {
                this.pass(
                    renderer,
                    this.down,
                    this.bloomDown[2],
                    this.bloomDown[1],
                    { uBright: 0 },
                );
                this.pass(
                    renderer,
                    this.up,
                    this.bloomUp[0],
                    this.bloomDown[2],
                    {
                        tBase: this.bloomDown[1].texture,
                        uAddBase: 1,
                    },
                );
            } else {
                this.pass(
                    renderer,
                    this.up,
                    this.bloomUp[0],
                    this.bloomDown[1],
                    {
                        tBase: null,
                        uAddBase: 0,
                    },
                );
            }

            this.pass(renderer, this.up, this.bloomUp[1], this.bloomUp[0], {
                tBase: this.bloomDown[0].texture,
                uAddBase: 1,
            });
        }

        if (s.blur !== 'mati') {
            this.pass(renderer, this.down, this.blur[0], this.scene, {
                uBright: 0,
            });
            this.pass(renderer, this.down, this.blur[1], this.blur[0], {
                uBright: 0,
            });
        }

        const u = this.composite.uniforms;
        u.uScale.value = s.scale;
        u.uMode.value = s.upscale === 'sharp' ? 1 : 0;
        u.uPrescale.value = s.prescale;
        (u.uFrac.value as Vector2).copy(s.fraction);
        u.uNear.value = s.near;
        u.uFar.value = s.far;
        u.uOrtho.value = s.ortho ? 1 : 0;
        u.uFocus.value = s.focus;
        u.uBloom.value = s.bloomLevels > 0 ? LOOK.bloomStrength : 0;
        u.uBlurMode.value = s.blur === 'dof' ? 1 : s.blur === 'tilt' ? 2 : 0;
        u.uFog.value = s.fog ? LOOK.fogAmount : 0;
        u.uGrade.value = s.grade ? 1 : 0;
        u.uVignette.value = s.vignette ? LOOK.vignette : 0;
        this.quad.material = this.composite;
        renderer.setRenderTarget(null);
        renderer.render(this.quadScene, this.quadCamera);
    }

    dispose(): void {
        this.scene.depthTexture?.dispose();
        this.scene.dispose();
        [...this.bloomDown, ...this.bloomUp, ...this.blur].forEach((t) =>
            t.dispose(),
        );
        this.geometry.dispose();
        this.down.dispose();
        this.up.dispose();
        this.composite.dispose();
    }

    private pass(
        renderer: WebGLRenderer,
        material: ShaderMaterial,
        target: Target,
        input: Target,
        uniforms: Record<string, unknown>,
    ): void {
        material.uniforms.tInput.value = input.texture;
        (material.uniforms.uTexel.value as Vector2).set(
            1 / input.width,
            1 / input.height,
        );

        for (const [k, v] of Object.entries(uniforms)) {
            material.uniforms[k].value = v;
        }

        this.quad.material = material;
        renderer.setRenderTarget(target);
        renderer.render(this.quadScene, this.quadCamera);
    }
}

function linearColor(hex: string): Vector3 {
    const c = new Color(hex);

    return new Vector3(c.r, c.g, c.b);
}

/** Warna sRGB (bukan linear) dikali `k`, untuk angkat hitam di ruang sRGB. */
function srgbVector(hex: string, k: number): Vector3 {
    const c = new Color(hex);
    const srgb = c.clone().convertLinearToSRGB();

    return new Vector3(srgb.r * k, srgb.g * k, srgb.b * k);
}

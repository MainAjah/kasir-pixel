/**
 * Cahaya sore diorama 3D (Tahap 5H langkah a3): matahari jingga rendah dengan
 * peta bayangan, cahaya langit (hemisfer), lampu dinding hangat dengan halo,
 * berkas sinar jendela, debu berkilau, dan penghalang sinar dinding kanan.
 * Semua bagian bisa dinyalakan dan dimatikan sendiri (lab).
 */
import {
    AdditiveBlending,
    AmbientLight,
    BufferAttribute,
    BufferGeometry,
    Color,
    DirectionalLight,
    DoubleSide,
    HemisphereLight,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PointLight,
    Points,
    ShaderMaterial,
    Vector3,
} from 'three';
import type { Scene } from 'three';
import { beamMesh, wallCaster } from './build-lighting';
import type { Vec3 } from './camera-math';
import {
    SUN_TOWARD,
    beamCorners,
    dustParams,
    lampBulbPosition,
} from './lighting-math';
import type { Lamp } from './lighting-math';
import {
    BEAM_FRAGMENT,
    BEAM_VERTEX,
    DUST_FRAGMENT,
    DUST_VERTEX,
    HALO_FRAGMENT,
    HALO_VERTEX,
} from './shaders';

/** Warna dan kekuatan cahaya (satuan fisik three.js). Dipilih di lab. */
export const LIGHT = {
    sunColor: '#ffb070',
    sunIntensity: 7.5,
    skyColor: '#8ea2c9',
    groundColor: '#c98f62',
    hemiIntensity: 2.6,
    flatAmbient: Math.PI,
    lampColor: '#ffc98a',
    lampIntensity: 2.6,
    lampDistance: 4.5,
    lampDecay: 2,
    haloSize: 22,
    beamColor: '#ffbf7a',
    beamIntensity: 0.32,
    dustColor: '#ffe2a6',
    dustCount: 220,
    rimColor: '#ffcf7a',
    rimStrength: 0.55,
    emissive: 1.4,
} as const;

export type LightFlags = {
    ambient: boolean;
    sun: boolean;
    shadowMap: number;
    beam: boolean;
    dust: boolean;
    lamps: boolean;
};

const linear = (hex: string, k = 1): Vector3 => {
    const c = new Color(hex);

    return new Vector3(c.r * k, c.g * k, c.b * k);
};

export class SceneLights {
    readonly sun: DirectionalLight;
    private readonly sunTarget = new Object3D();
    private readonly hemi: HemisphereLight;
    private readonly flat: AmbientLight;
    private readonly lamps: PointLight[] = [];
    readonly lampModels: Lamp[] = [];
    private readonly halo: Points;
    private readonly haloGeometry = new BufferGeometry();
    private readonly haloMaterial: ShaderMaterial;
    private readonly beam: Mesh;
    private readonly beamGeometry = new BufferGeometry();
    private readonly beamMaterial: ShaderMaterial;
    private readonly dust: Points;
    private readonly dustGeometry = new BufferGeometry();
    private readonly dustMaterial: ShaderMaterial;
    private readonly caster: Mesh;
    private readonly casterGeometry = new BufferGeometry();
    private readonly casterMaterial: MeshBasicMaterial;
    private flags: LightFlags = {
        ambient: false,
        sun: false,
        shadowMap: 0,
        beam: false,
        dust: false,
        lamps: false,
    };

    constructor(
        scene: Scene,
        private readonly center: Vec3,
        sceneWidth: number,
        lampKeys: readonly string[],
    ) {
        // Matahari: arah tetap, peta bayangan ortografik menutup seluruh balok.
        this.sun = new DirectionalLight(LIGHT.sunColor, LIGHT.sunIntensity);
        this.sun.position.set(
            center[0] + SUN_TOWARD[0] * 30,
            center[1] + SUN_TOWARD[1] * 30,
            center[2] + SUN_TOWARD[2] * 30,
        );
        this.sunTarget.position.set(...center);
        this.sun.target = this.sunTarget;
        const cam = this.sun.shadow.camera;
        cam.left = -11;
        cam.right = 11;
        cam.top = 11;
        cam.bottom = -11;
        cam.near = 5;
        cam.far = 60;
        this.sun.shadow.bias = -0.0006;
        this.sun.shadow.normalBias = 0.02;
        scene.add(this.sun, this.sunTarget);

        // Cahaya langit: atas sejuk kebiruan, pantulan lantai hangat.
        this.hemi = new HemisphereLight(
            LIGHT.skyColor,
            LIGHT.groundColor,
            LIGHT.hemiIntensity,
        );
        // Tanpa efek ambien: cahaya rata putih = tampilan tanpa cahaya (a2).
        this.flat = new AmbientLight('#ffffff', LIGHT.flatAmbient);
        scene.add(this.hemi, this.flat);

        // Lampu dinding: cahaya titik hangat + halo.
        const halos: number[] = [];

        for (const key of lampKeys) {
            const p = lampBulbPosition(key);

            if (!p) {
                continue;
            }

            const light = new PointLight(
                LIGHT.lampColor,
                LIGHT.lampIntensity,
                LIGHT.lampDistance,
                LIGHT.lampDecay,
            );
            light.position.set(...p);
            scene.add(light);
            this.lamps.push(light);
            const c = new Color(LIGHT.lampColor);
            this.lampModels.push({
                position: p,
                color: [c.r, c.g, c.b],
                intensity: LIGHT.lampIntensity,
                distance: LIGHT.lampDistance,
                decay: LIGHT.lampDecay,
            });
            halos.push(...p);
        }

        this.haloGeometry.setAttribute(
            'position',
            new BufferAttribute(new Float32Array(halos), 3),
        );
        this.haloMaterial = new ShaderMaterial({
            uniforms: {
                uSize: { value: LIGHT.haloSize },
                uColor: { value: linear(LIGHT.lampColor, 0.55) },
            },
            vertexShader: HALO_VERTEX,
            fragmentShader: HALO_FRAGMENT,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
        });
        this.halo = new Points(this.haloGeometry, this.haloMaterial);
        this.halo.frustumCulled = false;
        this.halo.renderOrder = 4;
        scene.add(this.halo);

        // Berkas sinar dari kaca jendela ke lantai.
        const beam = beamMesh();
        this.beamGeometry.setAttribute(
            'position',
            new BufferAttribute(new Float32Array(beam.positions), 3),
        );
        this.beamGeometry.setAttribute(
            'along',
            new BufferAttribute(new Float32Array(beam.along), 1),
        );
        this.beamGeometry.setAttribute(
            'across',
            new BufferAttribute(new Float32Array(beam.across), 1),
        );
        this.beamGeometry.setIndex(beam.indices);
        this.beamMaterial = new ShaderMaterial({
            uniforms: {
                uColor: { value: linear(LIGHT.beamColor) },
                uIntensity: { value: LIGHT.beamIntensity },
                uTime: { value: 0 },
            },
            vertexShader: BEAM_VERTEX,
            fragmentShader: BEAM_FRAGMENT,
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
            blending: AdditiveBlending,
        });
        this.beam = new Mesh(this.beamGeometry, this.beamMaterial);
        this.beam.renderOrder = 3;
        scene.add(this.beam);

        // Debu di dalam berkas.
        const { window } = beamCorners();
        this.dustGeometry.setAttribute(
            'position',
            new BufferAttribute(new Float32Array(LIGHT.dustCount * 3), 3),
        );
        this.dustGeometry.setAttribute(
            'params',
            new BufferAttribute(dustParams(LIGHT.dustCount, 77), 4),
        );
        this.dustMaterial = new ShaderMaterial({
            uniforms: {
                uTopLeft: { value: new Vector3(...window[0]) },
                uTopRight: { value: new Vector3(...window[1]) },
                uBottomLeft: { value: new Vector3(...window[3]) },
                uToSun: { value: new Vector3(...SUN_TOWARD) },
                uTime: { value: 0 },
                uSize: { value: 1 },
                uColor: { value: linear(LIGHT.dustColor, 0.9) },
            },
            vertexShader: DUST_VERTEX,
            fragmentShader: DUST_FRAGMENT,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
        });
        this.dust = new Points(this.dustGeometry, this.dustMaterial);
        this.dust.frustumCulled = false;
        this.dust.renderOrder = 3;
        scene.add(this.dust);

        // Penghalang sinar dinding kanan (berlubang jendela), hanya di peta bayangan.
        const caster = wallCaster(sceneWidth);
        this.casterGeometry.setAttribute(
            'position',
            new BufferAttribute(new Float32Array(caster.positions), 3),
        );
        this.casterGeometry.setIndex(caster.indices);
        this.casterMaterial = new MeshBasicMaterial({
            colorWrite: false,
            depthWrite: false,
            side: DoubleSide,
        });
        this.caster = new Mesh(this.casterGeometry, this.casterMaterial);
        this.caster.castShadow = true;
        scene.add(this.caster);

        this.apply();
    }

    get toSun(): Vec3 {
        return SUN_TOWARD;
    }

    setFlags(flags: LightFlags): void {
        const resize = flags.shadowMap !== this.flags.shadowMap;
        this.flags = flags;

        if (resize && flags.shadowMap > 0) {
            this.sun.shadow.mapSize.set(flags.shadowMap, flags.shadowMap);
            // Peta lama dilepas; three membuat ulang dengan ukuran baru.
            this.sun.shadow.map?.dispose();
            this.sun.shadow.map = null;
        }

        this.apply();
    }

    /** Irradiansi ambien untuk sprite (normal tegak, sama dengan HemisphereLight). */
    ambientIrradiance(): Vector3 {
        if (!this.flags.ambient) {
            return new Vector3(
                LIGHT.flatAmbient,
                LIGHT.flatAmbient,
                LIGHT.flatAmbient,
            );
        }

        const sky = new Color(LIGHT.skyColor);
        const ground = new Color(LIGHT.groundColor);

        return new Vector3(
            (sky.r + ground.r) * 0.5 * LIGHT.hemiIntensity,
            (sky.g + ground.g) * 0.5 * LIGHT.hemiIntensity,
            (sky.b + ground.b) * 0.5 * LIGHT.hemiIntensity,
        );
    }

    /** Irradiansi matahari (warna × intensitas), nol bila mati. */
    sunIrradiance(): Vector3 {
        return this.flags.sun
            ? linear(LIGHT.sunColor, LIGHT.sunIntensity)
            : new Vector3();
    }

    get lampsOn(): boolean {
        return this.flags.lamps;
    }

    update(time: number): void {
        this.beamMaterial.uniforms.uTime.value = time;
        this.dustMaterial.uniforms.uTime.value = time;
    }

    dispose(): void {
        this.sun.shadow.dispose();
        this.haloGeometry.dispose();
        this.haloMaterial.dispose();
        this.beamGeometry.dispose();
        this.beamMaterial.dispose();
        this.dustGeometry.dispose();
        this.dustMaterial.dispose();
        this.casterGeometry.dispose();
        this.casterMaterial.dispose();
    }

    /**
     * Cahaya dimatikan lewat intensitas 0, bukan `visible`, supaya jumlah cahaya
     * tetap dan shader tidak dikompilasi ulang setiap sakelar diganti.
     */
    private apply(): void {
        const f = this.flags;
        const shadows = f.sun && f.shadowMap > 0;
        this.sun.intensity = f.sun ? LIGHT.sunIntensity : 0;
        this.sun.castShadow = shadows;
        this.caster.visible = shadows;
        this.hemi.intensity = f.ambient ? LIGHT.hemiIntensity : 0;
        this.flat.intensity = f.ambient ? 0 : LIGHT.flatAmbient;
        this.lamps.forEach(
            (l) => (l.intensity = f.lamps ? LIGHT.lampIntensity : 0),
        );
        this.halo.visible = f.lamps;
        this.beam.visible = f.beam;
        this.dust.visible = f.dust;
    }
}

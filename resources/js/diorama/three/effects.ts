/**
 * Sakelar efek dan tingkat kualitas diorama 3D (Tahap 5H langkah a3), murni.
 *
 * Efek bisa dinyalakan satu per satu di lab; tingkat kualitas 0–3 dari
 * penjaga performa mematikan efek mahal secara berurutan (rencana bagian 5).
 */

export type EffectKey =
    | 'ambien'
    | 'matahari'
    | 'berkas'
    | 'debu'
    | 'lampu'
    | 'cahayaSprite'
    | 'rim'
    | 'kontak'
    | 'bayanganKarakter'
    | 'bloom'
    | 'dof'
    | 'kabut'
    | 'warna'
    | 'vinyet'
    | 'garisLuar';

export type Effects = Record<EffectKey, boolean>;

/** Urutan tampil di lab dan urutan tangkapan "satu per satu". */
export const EFFECT_ORDER: readonly { key: EffectKey; label: string }[] = [
    { key: 'ambien', label: 'Cahaya ambien + oklusi' },
    { key: 'matahari', label: 'Matahari + bayangan panjang' },
    { key: 'berkas', label: 'Berkas sinar jendela' },
    { key: 'debu', label: 'Debu berkilau' },
    { key: 'lampu', label: 'Lampu hangat + halo' },
    { key: 'cahayaSprite', label: 'Karakter ikut gelap-terang' },
    { key: 'rim', label: 'Rim keemasan 1 texel' },
    { key: 'kontak', label: 'Bayangan kontak karakter' },
    { key: 'bayanganKarakter', label: 'Bayangan panjang karakter' },
    { key: 'bloom', label: 'Bloom bertingkat' },
    { key: 'dof', label: 'Tepi kabur (DOF)' },
    { key: 'kabut', label: 'Kabut tipis' },
    { key: 'warna', label: 'Olah warna' },
    { key: 'vinyet', label: 'Vinyet' },
    { key: 'garisLuar', label: 'Garis luar gelap karakter (opsi)' },
];

/** Semua efek sore menyala, garis luar mati (opsi). */
export const ALL_EFFECTS: Effects = {
    ambien: true,
    matahari: true,
    berkas: true,
    debu: true,
    lampu: true,
    cahayaSprite: true,
    rim: true,
    kontak: true,
    bayanganKarakter: true,
    bloom: true,
    dof: true,
    kabut: true,
    warna: true,
    vinyet: true,
    garisLuar: false,
};

/** Semua mati: tampilan langkah a2 (tanpa cahaya). */
export const NO_EFFECTS: Effects = Object.fromEntries(
    Object.keys(ALL_EFFECTS).map((k) => [k, false]),
) as Effects;

export type Tier = 0 | 1 | 2 | 3;

export type TierSettings = {
    /** Sisi peta bayangan matahari (0 = tanpa bayangan). */
    shadowMap: number;
    dust: boolean;
    /** Tepi kabur: DOF dari kedalaman, tilt-shift dari posisi layar, atau mati. */
    blur: 'dof' | 'tilt' | 'mati';
    /** Jumlah tingkat bloom (0 = mati). */
    bloomLevels: 0 | 2 | 3;
    shaft: boolean;
    characterShadows: boolean;
};

/**
 * Tingkat kualitas, diturunkan berurutan bila lambat:
 * 0 penuh; 1 bayangan 512 dan debu mati; 2 tilt-shift dan bloom 2 tingkat;
 * 3 hanya yang murah (tanpa peta bayangan, berkas, bloom, dan tepi kabur).
 */
export const TIERS: Record<Tier, TierSettings> = {
    0: {
        shadowMap: 1024,
        dust: true,
        blur: 'dof',
        bloomLevels: 3,
        shaft: true,
        characterShadows: true,
    },
    1: {
        shadowMap: 512,
        dust: false,
        blur: 'dof',
        bloomLevels: 3,
        shaft: true,
        characterShadows: true,
    },
    2: {
        shadowMap: 512,
        dust: false,
        blur: 'tilt',
        bloomLevels: 2,
        shaft: true,
        characterShadows: true,
    },
    3: {
        shadowMap: 0,
        dust: false,
        blur: 'mati',
        bloomLevels: 0,
        shaft: false,
        characterShadows: false,
    },
};

/** Efek yang benar-benar dipakai: pilihan pengguna dipotong oleh tingkat dan gerak dikurangi. */
export function resolveEffects(
    chosen: Effects,
    tier: Tier,
    reducedMotion: boolean,
): Effects & {
    blur: 'dof' | 'tilt' | 'mati';
    bloomLevels: number;
    shadowMap: number;
} {
    const t = TIERS[tier];
    const sun = chosen.matahari;

    return {
        ...chosen,
        debu: chosen.debu && t.dust && !reducedMotion && sun,
        berkas: chosen.berkas && t.shaft && sun,
        bayanganKarakter:
            chosen.bayanganKarakter &&
            t.characterShadows &&
            sun &&
            t.shadowMap > 0,
        bloom: chosen.bloom && t.bloomLevels > 0,
        dof: chosen.dof && t.blur !== 'mati',
        blur: chosen.dof ? t.blur : 'mati',
        bloomLevels: chosen.bloom ? t.bloomLevels : 0,
        shadowMap: sun ? t.shadowMap : 0,
    };
}

/** Efek dari query alamat lab: `?efek=semua`, `?efek=dasar`, atau daftar kunci dipisah koma. */
export function effectsFromQuery(value: string | null): Effects {
    if (!value || value === 'semua') {
        return { ...ALL_EFFECTS };
    }

    if (value === 'dasar') {
        return { ...NO_EFFECTS };
    }

    const keys = new Set(value.split(','));

    return Object.fromEntries(
        Object.keys(ALL_EFFECTS).map((k) => [k, keys.has(k)]),
    ) as Effects;
}

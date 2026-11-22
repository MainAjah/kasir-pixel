/**
 * Karakter dari gambar pemilik (keputusan D6), dipakai apa adanya dan diberi gerak.
 *
 * Cara 1, animasi transformasi saja: naik-turun, memipih dan memanjang, miring
 * (per baris, tetap tajam), cermin, plus bayangan di lantai. Gambar aslinya tidak
 * diubah; tiap bingkai dihitung dari gambar itu dan disimpan di kanvas cadangan.
 * Karakter yang terlihat kaku bisa dinaikkan ke cara 2 (kaki dan lengan dari kode)
 * atau cara 3 (gambar ulang penuh) setelah disetujui pemilik.
 *
 * Murni (tanpa DOM): matriks piksel gambar dimuat oleh reference-loader.ts.
 */
import { createMatrix, setPixel } from './pixels';
import type { PixelMatrix } from './pixels';
import type { CustomerAction } from './customer-sprite';
import { PALETTE } from './palette';

/** Bagaimana tokoh bergerak saat cara 1. */
export type MotionProfile =
    | 'langkah' // berjalan biasa: memipih saat menapak, sedikit bergoyang
    | 'hentak' // berat dan menghentak (monster)
    | 'seret' // menyeret badan, condong ke depan (zombie)
    | 'memantul' // berjalan memantul pelan, sedikit condong ke depan (bintang laut)
    | 'lompat' // melompat-lompat kecil (ikan)
    | 'melayang'; // terbang rendah (pahlawan berzirah)

export type ApproachLevel = 1 | 2 | 3;

export type ReferenceCharacter = {
    key: string;
    file: string;
    title: string;
    role: 'pelanggan' | 'penjaga';
    motion: MotionProfile;
    /**
     * Arah hadap di gambar asli. Gambar yang menghadap depan tidak pernah dicermin;
     * hanya condongnya yang mengikuti arah jalan.
     */
    natural: 'kiri' | 'kanan' | 'depan';
    /** Melayang di atas lantai (px). */
    hover: number;
    /** Lebar dan tinggi gambar asli (px kanvas dasar). */
    size: readonly [number, number];
    /** Cara animasi yang dipakai sekarang. */
    approach: ApproachLevel;
};

export const REFERENCE_CHARACTERS: readonly ReferenceCharacter[] = [
    {
        key: 'ninja',
        file: '1-ninja-jubah-awan.png',
        title: 'Ninja berjubah awan merah',
        role: 'pelanggan',
        motion: 'langkah',
        natural: 'kanan',
        hover: 0,
        size: [20, 46],
        approach: 1,
    },
    {
        key: 'bertopeng',
        file: '2-pahlawan-bertopeng.png',
        title: 'Pahlawan bertopeng putih-merah',
        role: 'pelanggan',
        motion: 'langkah',
        natural: 'kanan',
        hover: 0,
        size: [42, 56],
        approach: 1,
    },
    {
        key: 'bajak_laut',
        file: '3-bajak-laut.png',
        title: 'Bajak laut berompi merah',
        role: 'pelanggan',
        motion: 'langkah',
        natural: 'kanan',
        hover: 0,
        size: [35, 48],
        approach: 1,
    },
    {
        key: 'monster',
        file: '4-monster-kadal.png',
        title: 'Monster kadal raksasa',
        role: 'pelanggan',
        motion: 'hentak',
        natural: 'kiri',
        hover: 0,
        size: [46, 52],
        approach: 1,
    },
    {
        key: 'zirah',
        file: '5-pahlawan-zirah.png',
        title: 'Pahlawan berzirah merah-emas',
        role: 'pelanggan',
        motion: 'melayang',
        natural: 'kanan',
        hover: 10,
        size: [37, 46],
        approach: 1,
    },
    {
        key: 'bintang_laut',
        file: '6-bintang-laut.png',
        title: 'Bintang laut merah muda',
        role: 'pelanggan',
        motion: 'memantul',
        natural: 'kiri',
        hover: 0,
        size: [34, 45],
        approach: 1,
    },
    {
        key: 'ikan',
        file: '7-ikan-oranye.png',
        title: 'Ikan oranye bersepatu',
        role: 'pelanggan',
        motion: 'lompat',
        natural: 'kiri',
        hover: 0,
        size: [28, 26],
        approach: 1,
    },
    {
        key: 'zombie',
        file: '8-zombie.png',
        title: 'Zombie (penjaga kasir)',
        role: 'penjaga',
        motion: 'seret',
        natural: 'kiri',
        hover: 0,
        size: [27, 41],
        approach: 1,
    },
    {
        // Tahap 5D-2: penjaga pos Inventaris, gambar dari pemilik.
        key: 'inventaris',
        file: '9-penjaga-inventaris.png',
        title: 'Gurita biru (penjaga inventaris)',
        role: 'penjaga',
        motion: 'langkah',
        natural: 'depan',
        hover: 0,
        size: [19, 46],
        approach: 1,
    },
];

export function referenceByKey(key: string): ReferenceCharacter | undefined {
    return REFERENCE_CHARACTERS.find((c) => c.key === key);
}

// ---- Transformasi per piksel -------------------------------------------------

export type Transform = {
    /** Geser naik (negatif) atau turun. */
    dy: number;
    /** Tambah (memanjang) atau kurangi (memipih) tinggi, dalam piksel. */
    stretch: number;
    /** Tambah atau kurangi lebar, dalam piksel. */
    widen: number;
    /** Geser kepala ke kiri (negatif) atau kanan, kaki tetap: miring. */
    lean: number;
};

/** Ruang kosong di sekitar gambar agar transformasi tidak terpotong. */
export const PAD_X = 6;
export const PAD_TOP = 8;

/** Titik tengah kaki di gambar asli: rata-rata x piksel di tiga baris terbawah. */
export function footCenter(src: PixelMatrix): number {
    let sum = 0;
    let count = 0;

    for (let y = Math.max(0, src.height - 3); y < src.height; y++) {
        for (let x = 0; x < src.width; x++) {
            if (src.pixels[y * src.width + x]) {
                sum += x;
                count += 1;
            }
        }
    }

    return count > 0 ? Math.round(sum / count) : Math.floor(src.width / 2);
}

/**
 * Ukuran bingkai dan titik pijaknya. Titik pijak mengikuti letak kaki di gambar
 * (bukan tengah gambar), jadi tokoh yang membungkuk tetap menapak di tengah tile.
 */
export function referenceFrameSize(src: PixelMatrix) {
    const width = src.width + PAD_X * 2;
    const height = src.height + PAD_TOP;

    return { width, height, footX: PAD_X + footCenter(src), footY: height - 1 };
}

/**
 * Satu bingkai dari gambar asli: diskalakan tetangga-terdekat (tetap tajam),
 * berjangkar di tengah bawah (kaki), lalu dimiringkan per baris dan digeser.
 */
export function transformFrame(src: PixelMatrix, t: Transform): PixelMatrix {
    const { width, height, footY } = referenceFrameSize(src);
    const out = createMatrix(width, height);
    const nh = Math.max(1, src.height + t.stretch);
    const nw = Math.max(1, src.width + t.widen);
    const x0 = Math.floor((width - nw) / 2);
    const bottom = footY + t.dy;

    for (let y = 0; y < nh; y++) {
        const sy = Math.min(src.height - 1, Math.floor((y * src.height) / nh));
        const shift =
            nh > 1 ? Math.round((t.lean * (nh - 1 - y)) / (nh - 1)) : 0;
        const oy = bottom - (nh - 1 - y);

        for (let x = 0; x < nw; x++) {
            const sx = Math.min(
                src.width - 1,
                Math.floor((x * src.width) / nw),
            );
            const color = src.pixels[sy * src.width + sx];

            if (color) {
                setPixel(out, x0 + x + shift, oy, color);
            }
        }
    }

    return out;
}

// ---- Profil gerak (cara 1) --------------------------------------------------

const T = (dy = 0, stretch = 0, widen = 0, lean = 0): Transform => ({
    dy,
    stretch,
    widen,
    lean,
});

/**
 * Bingkai tiap gerakan, ditulis untuk tokoh yang menghadap kiri: condong ke
 * depan = lean negatif. Untuk tokoh yang aslinya menghadap kanan, arah lean dibalik.
 * Jumlah bingkai sama dengan pelanggan buatan kode (diam 2, jalan 4, lari 4, ambil 2).
 */
export const MOTIONS: Record<
    MotionProfile,
    Record<CustomerAction, readonly Transform[]>
> = {
    langkah: {
        diam: [T(), T(0, 1, 0)],
        jalan: [
            T(0, -1, 1, 1),
            T(-1, 1, 0, 0),
            T(0, -1, 1, -1),
            T(-1, 1, 0, 0),
        ],
        lari: [
            T(-1, -1, 1, -3),
            T(-3, 1, -1, -3),
            T(-1, -1, 1, -3),
            T(-3, 1, -1, -3),
        ],
        ambil: [T(0, 2, -1, 1), T(-1, 3, -1, 1)],
    },
    hentak: {
        diam: [T(), T(0, 1, -1)],
        jalan: [
            T(0, -2, 2, 1),
            T(-1, 0, 0, 0),
            T(0, -2, 2, -1),
            T(-1, 0, 0, 0),
        ],
        lari: [
            T(0, -3, 3, -2),
            T(-3, 1, -1, -2),
            T(0, -3, 3, -2),
            T(-3, 1, -1, -2),
        ],
        ambil: [T(0, 2, -1, 1), T(-1, 3, -1, 1)],
    },
    seret: {
        diam: [T(0, 0, 0, -1), T(0, 1, 0, -1)],
        jalan: [
            T(0, -1, 1, -2),
            T(-1, 0, 0, -1),
            T(0, -1, 1, 0),
            T(-1, 0, 0, -1),
        ],
        lari: [
            T(-1, -2, 2, -4),
            T(-3, 1, -1, -4),
            T(-1, -2, 2, -4),
            T(-3, 1, -1, -4),
        ],
        ambil: [T(0, 1, 0, -2), T(-1, 2, -1, -2)],
    },
    memantul: {
        diam: [T(), T(0, 1, 0)],
        jalan: [
            T(0, -1, 1, -1),
            T(-1, 1, 0, -1),
            T(0, -1, 1, -1),
            T(-1, 1, 0, -1),
        ],
        lari: [
            T(-1, -1, 1, -2),
            T(-3, 1, -1, -2),
            T(-1, -1, 1, -2),
            T(-3, 1, -1, -2),
        ],
        ambil: [T(0, 1, 0, 1), T(-1, 2, -1, 1)],
    },
    lompat: {
        diam: [T(), T(0, -1, 1)],
        jalan: [
            T(0, -2, 2, 0),
            T(-3, 2, -1, -1),
            T(-4, 1, 0, -1),
            T(-1, 0, 0, 0),
        ],
        lari: [
            T(0, -3, 3, -1),
            T(-5, 2, -2, -2),
            T(-6, 1, -1, -2),
            T(-2, 0, 0, -1),
        ],
        ambil: [T(0, 1, 0, 0), T(-2, 2, -1, 0)],
    },
    melayang: {
        diam: [T(0), T(-1)],
        jalan: [
            T(0, 0, 0, -1),
            T(-1, 0, 0, -1),
            T(-2, 0, 0, -1),
            T(-1, 0, 0, -1),
        ],
        lari: [
            T(-1, 0, 0, -3),
            T(-2, 1, -1, -3),
            T(-3, 0, 0, -3),
            T(-2, 1, -1, -3),
        ],
        ambil: [T(0, 1, 0, 0), T(-1, 2, 0, 0)],
    },
};

/** Aksi penjaga kasir yang punya gerak sendiri (di meja dan di pintu). */
export type CashierMotionState =
    | 'menyapa'
    | 'pindai'
    | 'bungkus'
    | 'terima_koin'
    | 'batal'
    | 'di_pintu';

/**
 * Gerak penjaga zombie (cara 1), ditulis untuk tokoh yang menghadap pembeli di
 * kiri-bawah: condong ke depan = lean negatif.
 * - menyapa: membungkuk; pindai: condong ke scanner di depannya;
 * - bungkus: menoleh ke kantong di kanan; terima koin: meraih ke depan;
 * - batal dan di pintu: menggeleng (di pintu lebih pelan).
 */
export const CASHIER_MOTIONS: Record<
    CashierMotionState,
    { fps: number; frames: readonly Transform[] }
> = {
    menyapa: {
        fps: 5,
        frames: [T(0, -1, 0, -2), T(1, -2, 1, -3), T(0, -1, 0, -2)],
    },
    pindai: {
        fps: 7,
        frames: [T(0, 0, 0, -2), T(1, -1, 0, -3), T(1, -1, 0, -3)],
    },
    bungkus: { fps: 8, frames: [T(0, 0, 0, 1), T(0, -1, 1, 2)] },
    terima_koin: {
        fps: 4,
        frames: [T(0, 1, 0, -1), T(-1, 1, 0, -2), T(0, 0, 0, -1)],
    },
    batal: { fps: 8, frames: [T(0, 0, 0, -2), T(0, 0, 0, 2)] },
    di_pintu: { fps: 4, frames: [T(0, 0, 0, -1), T(0, 0, 0, 1)] },
};

/** Bingkai gerak penjaga untuk state itu, atau null bila state memakai diam/jalan/lari. */
export function cashierMotion(
    state: string,
    stateTime: number,
): { frame: number; transform: Transform } | null {
    if (!(state in CASHIER_MOTIONS)) {
        return null;
    }

    const { fps, frames } = CASHIER_MOTIONS[state as CashierMotionState];
    const frame = Math.floor(stateTime * fps) % frames.length;

    return { frame, transform: frames[frame] };
}

export function motionFrame(
    character: ReferenceCharacter,
    action: CustomerAction,
    frame: number,
    movingLeft = true,
): Transform {
    const frames = MOTIONS[character.motion][action];
    const t = frames[((frame % frames.length) + frames.length) % frames.length];
    // Condong ke depan = ke arah hadap gambar setelah (mungkin) dicermin.
    const facesLeft =
        character.natural === 'depan'
            ? movingLeft
            : character.natural === 'kiri';

    return facesLeft ? t : { ...t, lean: -t.lean };
}

/**
 * Perlu dicermin agar tokoh menghadap ke arah jalannya. Gambar yang menghadap
 * depan tidak pernah dicermin.
 */
export function referenceFlip(
    character: ReferenceCharacter,
    movingLeft: boolean,
): boolean {
    if (character.natural === 'depan') {
        return false;
    }

    return movingLeft
        ? character.natural === 'kanan'
        : character.natural === 'kiri';
}

// ---- Gambar → matriks dan warna ------------------------------------------------

const hex = (v: number) => v.toString(16).padStart(2, '0');

/** RGBA dari getImageData → matriks; piksel dengan alfa < 128 transparan. */
export function matrixFromRgba(
    data: ArrayLike<number>,
    width: number,
    height: number,
): PixelMatrix {
    const m = createMatrix(width, height);

    for (let i = 0; i < width * height; i++) {
        if (data[i * 4 + 3] >= 128) {
            m.pixels[i] =
                `#${hex(data[i * 4])}${hex(data[i * 4 + 1])}${hex(data[i * 4 + 2])}`;
        }
    }

    return m;
}

type Rgb = [number, number, number];
const toRgb = (c: string): Rgb =>
    [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)) as Rgb;
const toHex = ([r, g, b]: Rgb) => `#${hex(r)}${hex(g)}${hex(b)}`;
const dist2 = (a: Rgb, b: Rgb) =>
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

function nearest(c: Rgb, set: readonly Rgb[]): Rgb {
    let best = set[0];
    let bestD = Infinity;

    for (const q of set) {
        const d = dist2(c, q);

        if (d < bestD) {
            bestD = d;
            best = q;
        }
    }

    return best;
}

function recolor(m: PixelMatrix, map: (c: string) => string): PixelMatrix {
    return { ...m, pixels: m.pixels.map((p) => (p === null ? null : map(p))) };
}

/** Rapikan derau warna: gabungkan menjadi paling banyak `k` warna (k-means), bentuk tidak berubah. */
export function reduceColors(m: PixelMatrix, k = 16): PixelMatrix {
    const points = m.pixels.filter((p): p is string => p !== null).map(toRgb);

    if (points.length === 0) {
        return m;
    }

    const step = Math.max(1, Math.floor(points.length / k));
    let centers = points.filter((_, i) => i % step === 0).slice(0, k);

    for (let iteration = 0; iteration < 10; iteration++) {
        const sums = centers.map(() => [0, 0, 0, 0]);

        for (const p of points) {
            const j = centers.indexOf(nearest(p, centers));
            sums[j][0] += p[0];
            sums[j][1] += p[1];
            sums[j][2] += p[2];
            sums[j][3] += 1;
        }

        centers = centers.map((c, j) =>
            sums[j][3] > 0
                ? ([0, 1, 2].map((ch) =>
                      Math.round(sums[j][ch] / sums[j][3]),
                  ) as Rgb)
                : c,
        );
    }

    return recolor(m, (p) => toHex(nearest(toRgb(p), centers)));
}

const PALETTE_RGB = PALETTE.map(toRgb);

/** Paksa ke palet 24 warna (warna terdekat). Untuk perbandingan saja. */
export function mapToPalette(m: PixelMatrix): PixelMatrix {
    return recolor(m, (p) => toHex(nearest(toRgb(p), PALETTE_RGB)));
}

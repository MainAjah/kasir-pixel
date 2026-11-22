/**
 * Sprite pelanggan buatan kode (Tahap 5C), ±26 × 46 piksel kanvas dasar.
 *
 * Bagian tubuh ditulis sebagai grid huruf, satu huruf = satu peran warna:
 *   O garis tepi, E mata, C pipi, M mulut,
 *   S/s kulit dan bayangannya, H/h/i rambut, bayangan, kilau,
 *   B/b/L baju, bayangan, terang, P/p celana, F/f sepatu.
 * Bingkai disusun dari bagian: kaki digambar menurut pose (kaki diangkat saat
 * melangkah), badan naik-turun (bob), lengan berayun atau ditekuk saat berlari.
 *
 * Gambar "depan" menghadap kiri-bawah (sw); kanan-bawah (se) hasil cermin.
 * Gambar "belakang" menghadap kanan-atas (ne); kiri-atas (nw) hasil cermin.
 * Variasi pelanggan hanya lewat tukar palet: kulit, rambut, baju, celana.
 */
import type { Facing } from '../engine/iso';
import { C } from './palette';
import type { PaletteIndex } from './palette';
import { createMatrix, stamp } from './pixels';
import type { Legend, PixelMatrix } from './pixels';

export type SpriteSide = 'depan' | 'belakang';
export type CustomerAction = 'diam' | 'jalan' | 'lari' | 'ambil';

export const FRAME_W = 26;
export const FRAME_H = 46;
/** Titik pijak di dalam bingkai: tengah bawah. */
export const FOOT_X = 13;
export const FOOT_Y = FRAME_H - 1;

export const CUSTOMER_ACTIONS: readonly CustomerAction[] = [
    'diam',
    'jalan',
    'lari',
    'ambil',
];
export const FRAME_COUNT: Record<CustomerAction, number> = {
    diam: 2,
    jalan: 4,
    lari: 4,
    ambil: 2,
};
/** Bingkai per detik tiap gerakan. */
export const FRAME_RATE: Record<CustomerAction, number> = {
    diam: 2,
    jalan: 8,
    lari: 12,
    ambil: 4,
};

// ---- Variasi palet ----------------------------------------------------------

type Shades2 = readonly [PaletteIndex, PaletteIndex];
type Shades3 = readonly [PaletteIndex, PaletteIndex, PaletteIndex];

/** [dasar, bayangan] */
export const SKINS: readonly Shades2[] = [
    [21, 22],
    [22, 23],
    [23, 20],
];
/** [dasar, bayangan, kilau]: cokelat, hitam, oranye, pirang, merah muda, lavender, biru. */
export const HAIRS: readonly Shades3[] = [
    [20, 2, 23],
    [2, 1, 3],
    [13, 15, 12],
    [12, 13, 11],
    [16, 14, 4],
    [17, 3, 5],
    [19, 24, 18],
];
/** [dasar, bayangan, terang]: bata, kunyit, hijau, biru, merah muda, lavender, krem. */
export const SHIRTS: readonly Shades3[] = [
    [14, 15, 16],
    [12, 13, 11],
    [9, 10, 5],
    [18, 19, 4],
    [16, 14, 4],
    [17, 3, 5],
    [6, 8, 4],
];
/** [dasar, bayangan]: biru tua, abu gelap, kayu, abu lavender. */
export const PANTS: readonly Shades2[] = [
    [19, 24],
    [2, 1],
    [20, 1],
    [3, 2],
];

export type CustomerVariant = {
    skin: number;
    hair: number;
    shirt: number;
    pants: number;
};

/** Nomor tampilan pelanggan → kombinasi palet yang selalu sama. */
export function variantForLook(look: number): CustomerVariant {
    const n = Math.abs(Math.floor(look));

    return {
        skin: n % SKINS.length,
        hair: (n * 5 + 1) % HAIRS.length,
        shirt: (n * 3 + 2) % SHIRTS.length,
        pants: (n * 7 + Math.floor(n / 4)) % PANTS.length,
    };
}

export function variantKey(v: CustomerVariant): string {
    return `${v.skin}${v.hair}${v.shirt}${v.pants}`;
}

export function customerLegend(v: CustomerVariant): Legend {
    const skin = SKINS[v.skin % SKINS.length];
    const hair = HAIRS[v.hair % HAIRS.length];
    const shirt = SHIRTS[v.shirt % SHIRTS.length];
    const pants = PANTS[v.pants % PANTS.length];

    return {
        O: C(1),
        E: C(1),
        C: C(16),
        M: C(15),
        S: C(skin[0]),
        s: C(skin[1]),
        H: C(hair[0]),
        h: C(hair[1]),
        i: C(hair[2]),
        B: C(shirt[0]),
        b: C(shirt[1]),
        L: C(shirt[2]),
        P: C(pants[0]),
        p: C(pants[1]),
        F: C(20),
        f: C(2),
    };
}

// ---- Bagian tubuh -----------------------------------------------------------

/** Kepala 18 × 16, menghadap kiri-bawah: mata, mulut, dan pipi sedikit ke kiri. */
const HEAD_FRONT = [
    '......OOOOOO......',
    '....OOHHHHHHOO....',
    '...OHHHiiHHHHHO...',
    '..OHHHiiHHHHHHhO..',
    '..OHHHHHHHHHHHhO..',
    '.OHHHHHHHHHHHHHhO.',
    '.OHHhHHHHHHHhHHhO.',
    '.OHhSShHHHhSSSHhO.',
    '.OhSSSSSSSSSSSShO.',
    '.OhSESSSSSSESSShO.',
    '.OSSESSSSSSESSSsO.',
    '.OCCSSSSSSSSCCSsO.',
    '..OSSSSMMSSSSSsO..',
    '...OSSSSSSSSSsO...',
    '....OOsSSSSsOO....',
    '......OSSSsO......',
];

/** Kepala dari belakang: rambut, telinga, dan tengkuk. */
const HEAD_BACK = [
    '......OOOOOO......',
    '....OOHHHHHHOO....',
    '...OHHHiiHHHHHO...',
    '..OHHHiiHHHHHHhO..',
    '..OHHHHHHHHHHHhO..',
    '.OHHHHHHHHHHHHHhO.',
    '.OHHHHHHHHHHHHHhO.',
    '.OHHHHHHHHHHHHHhO.',
    '.OHHHHHHHHHHHHhhO.',
    '.OhHHHHHHHHHHHhhO.',
    '.OShHHHHHHHHHhhsO.',
    '.OShhHHHHHHHhhhsO.',
    '..OShhhHHHhhhhO...',
    '...OOhhhhhhhhOO...',
    '....OOsSSSSsOO....',
    '......OSSSsO......',
];

/** Badan 12 × 13: kaos berkerah V, lalu pinggul bercelana. */
const TORSO_FRONT = [
    'OBBBSSSSBBbO',
    'OLBBBSSBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OBBBBBBBBBbO',
    'OBBBBBBBBBbO',
    'ObbbbbbbbbbO',
    'OPPPPPPPPPpO',
    'OPPPPPPPPPpO',
    'OPPPPPPPPPpO',
];

const TORSO_BACK = [
    'OBBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OLBBBBBBBBbO',
    'OBBBBBBBBBbO',
    'ObbbbbbbbbbO',
    'OPPPPPPPPPpO',
    'OPPPPPPPPPpO',
    'OPPPPPPPPPpO',
];

/**
 * Lengan 3 piksel: bahu, lengan baju pendek (4 baris), lengan bawah dan tangan
 * (kulit), lalu ujung. Saat berayun ke depan lengan tampak memendek (tangan lebih
 * tinggi); saat berayun ke belakang lengan bergeser sedikit menjauhi badan.
 */
function armGrid(which: 0 | 1, sleeve: number, skin: number): string[] {
    const left = which === 0;
    const rows = [left ? '.OO' : 'OO.'];

    for (let k = 0; k < sleeve; k++) {
        const last = k === sleeve - 1;

        rows.push(
            left
                ? k === 0
                    ? 'OLB'
                    : last
                      ? 'Obb'
                      : 'OBB'
                : last
                  ? 'bbO'
                  : 'BbO',
        );
    }

    for (let k = 0; k < skin; k++) {
        const shade = k >= skin - 2;
        rows.push(left ? (shade ? 'OSs' : 'OSS') : shade ? 'ssO' : 'SsO');
    }

    rows.push(left ? '.OO' : 'OO.');

    return rows;
}

/** Lengan terangkat meraih rak: tangan di atas, lengan baju di bahu. */
const ARM_REACH = [
    '.OO.',
    'OSSO',
    'OSsO',
    'OSsO',
    'OSsO',
    'OSsO',
    'OSsO',
    'OBbO',
    'OBbO',
    'ObbO',
];

const LEG = 'OPPpO';
const SHOE_FRONT = ['.OFFfO', 'OFFFfO', 'OOOOOO'];
const SHOE_BACK = ['OFFfO', 'OFFfO', 'OOOOO'];

// ---- Pose -------------------------------------------------------------------

/** lurus: menggantung; depan / depan_jauh: berayun ke depan; belakang: ke belakang; raih: terangkat. */
type ArmSwing = 'lurus' | 'depan' | 'depan_jauh' | 'belakang' | 'raih';
type Pose = {
    /** Badan naik (negatif) atau turun (positif). */
    bob: number;
    /** Kaki kiri dan kanan diangkat berapa piksel dari lantai. */
    lift: readonly [number, number];
    arms: readonly [ArmSwing, ArmSwing];
    /** Kepala condong ke arah hadap saat berlari. */
    lean?: number;
};

const POSES: Record<CustomerAction, readonly Pose[]> = {
    // Bernapas: badan turun satu piksel.
    diam: [
        { bob: 0, lift: [0, 0], arms: ['lurus', 'lurus'] },
        { bob: 1, lift: [0, 0], arms: ['lurus', 'lurus'] },
    ],
    // Langkah, lewat, langkah, lewat; lengan berayun berlawanan dengan kaki.
    jalan: [
        { bob: 0, lift: [0, 2], arms: ['belakang', 'depan'] },
        { bob: -1, lift: [0, 1], arms: ['lurus', 'lurus'] },
        { bob: 0, lift: [2, 0], arms: ['depan', 'belakang'] },
        { bob: -1, lift: [1, 0], arms: ['lurus', 'lurus'] },
    ],
    // Lari: lutut tinggi, sesaat melayang, ayunan lengan lebar, kepala condong.
    lari: [
        { bob: -1, lift: [0, 4], arms: ['belakang', 'depan_jauh'], lean: -1 },
        { bob: -2, lift: [2, 2], arms: ['depan', 'depan'], lean: -1 },
        { bob: -1, lift: [4, 0], arms: ['depan_jauh', 'belakang'], lean: -1 },
        { bob: -2, lift: [2, 2], arms: ['depan', 'depan'], lean: -1 },
    ],
    // Meraih rak: satu lengan terangkat, berjinjit di bingkai kedua.
    ambil: [
        { bob: 0, lift: [0, 0], arms: ['lurus', 'raih'] },
        { bob: -1, lift: [0, 0], arms: ['lurus', 'raih'] },
    ],
};

// Tata letak di dalam bingkai 26 × 46 (4 baris kosong di atas untuk lompatan dan lengan).
const TOP = 4;
const HEAD_X = 4;
const TORSO_X = 7;
const TORSO_Y = TOP + 16;
const LEG_TOP = TORSO_Y + TORSO_FRONT.length;
const LEG_X: readonly [number, number] = [TORSO_X + 1, TORSO_X + 6];
const ARM_X: readonly [number, number] = [HEAD_X, TORSO_X + 12];

function drawLeg(
    m: PixelMatrix,
    legend: Legend,
    side: SpriteSide,
    x: number,
    top: number,
    lift: number,
): void {
    const bottom = FOOT_Y - lift;
    const shoe = side === 'depan' ? SHOE_FRONT : SHOE_BACK;
    const shoeTop = bottom - shoe.length + 1;

    for (let y = top; y < shoeTop; y++) {
        stamp(m, [LEG], legend, x, y);
    }

    stamp(m, shoe, legend, side === 'depan' ? x - 1 : x, shoeTop);
}

function drawArm(
    m: PixelMatrix,
    legend: Legend,
    which: 0 | 1,
    swing: ArmSwing,
    shoulderY: number,
): void {
    if (swing === 'raih') {
        // Menempel di bahu dan naik di samping kepala.
        stamp(
            m,
            ARM_REACH,
            legend,
            ARM_X[which],
            shoulderY - ARM_REACH.length + 3,
        );

        return;
    }

    const outward = which === 0 ? -1 : 1;
    const [sleeve, skin, dx] =
        swing === 'depan'
            ? [4, 3, 0]
            : swing === 'depan_jauh'
              ? [3, 2, 0]
              : swing === 'belakang'
                ? [4, 5, outward]
                : [4, 5, 0];

    stamp(
        m,
        armGrid(which, sleeve, skin),
        legend,
        ARM_X[which] + dx,
        shoulderY,
    );
}

/** Satu bingkai pelanggan sebagai matriks piksel (belum dicermin). */
export function buildCustomerFrame(
    variant: CustomerVariant,
    side: SpriteSide,
    action: CustomerAction,
    frame: number,
): PixelMatrix {
    const poses = POSES[action];
    const pose = poses[((frame % poses.length) + poses.length) % poses.length];
    const legend = customerLegend(variant);
    const m = createMatrix(FRAME_W, FRAME_H);
    const front = side === 'depan';
    const bodyY = TORSO_Y + pose.bob;

    drawLeg(m, legend, side, LEG_X[0], LEG_TOP + pose.bob, pose.lift[0]);
    drawLeg(m, legend, side, LEG_X[1], LEG_TOP + pose.bob, pose.lift[1]);
    stamp(m, front ? TORSO_FRONT : TORSO_BACK, legend, TORSO_X, bodyY);

    const reaching = pose.arms.includes('raih');

    if (!reaching) {
        drawArm(m, legend, 0, pose.arms[0], bodyY);
        drawArm(m, legend, 1, pose.arms[1], bodyY);
    } else {
        drawArm(m, legend, 0, pose.arms[0], bodyY);
    }

    stamp(
        m,
        front ? HEAD_FRONT : HEAD_BACK,
        legend,
        HEAD_X + (pose.lean ?? 0),
        TOP + pose.bob,
    );

    // Lengan yang meraih digambar paling akhir: naik di samping kepala.
    if (reaching) {
        drawArm(m, legend, 1, pose.arms[1], bodyY);
    }

    return m;
}

/** Naik-turun badan pada bingkai ini (negatif = naik), untuk barang di tangan. */
export function customerBob(action: CustomerAction, frame: number): number {
    const poses = POSES[action];

    return poses[((frame % poses.length) + poses.length) % poses.length].bob;
}

/** Arah hadap isometrik → sisi gambar dan apakah dicermin. */
export function sideForFacing(facing: Facing): {
    side: SpriteSide;
    flip: boolean;
} {
    switch (facing) {
        case 'sw':
            return { side: 'depan', flip: false };
        case 'se':
            return { side: 'depan', flip: true };
        case 'ne':
            return { side: 'belakang', flip: false };
        case 'nw':
            return { side: 'belakang', flip: true };
    }
}

/** Nomor bingkai dari waktu, dengan geser fase per pelanggan agar tidak serempak. */
export function frameAt(
    action: CustomerAction,
    time: number,
    phase = 0,
): number {
    return Math.floor(time * FRAME_RATE[action] + phase) % FRAME_COUNT[action];
}

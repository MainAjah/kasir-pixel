/**
 * Tekstur perabot 3D (Tahap 5H langkah a2), murni dan berbenih, hanya palet
 * dunia. Bentuk dan warnanya mengikuti perabot Canvas konsep v4 yang sudah
 * disetujui: rak walnut berlis kuningan, meja berpermukaan marmer dengan badan
 * walnut berpanel, kulkas krem enamel bertutup walnut, pot terakota.
 *
 * Ukuran: sepanjang lantai 16 texel per ubin, arah tegak 1 texel = 1 piksel
 * (tinggi sama dengan `height` perabot di denah).
 */
import { createRng } from '../../engine/rng';
import { createMatrix, fillRect, setPixel } from '../../sprites/pixels';
import type { PixelMatrix } from '../../sprites/pixels';
import type { RackFill } from '../../sprites/rack-sprite';
import { W } from '../../three/palette-world';
import { marbleTexture } from './marble';
import { plankTexture } from './wood';

/** Seberapa penuh isi menurut tingkat stok (sama dengan rak Canvas). */
export const FILL_LEVEL: Record<RackFill, number> = {
    kosong: 0,
    sedikit: 0.25,
    setengah: 0.6,
    penuh: 1,
};

/** Pasangan warna barang [badan, sisi gelap], padanan barang rak v4. */
export const GOODS: readonly (readonly [string, string])[] = [
    [W('burgundi'), W('burgundi-gelap')],
    [W('madu'), W('kuningan-gelap')],
    [W('sage'), W('sage-gelap')],
    [W('kaca'), W('kaca-gelap')],
    [W('mawar-muda'), W('burgundi')],
    [W('marmer'), W('krem-bayangan')],
];

const SLICE = 16;

// ---- Rak --------------------------------------------------------------------

export const RACK_TEXELS = 32;
/** Baris papan tiap tingkat (dari atas), sama dengan rak Canvas. */
export const RACK_BOARDS = [11, 22, 31] as const;

/**
 * Muka depan rak: lis kuningan di atas, tiga tingkat papan dengan dinding
 * belakang gelap, tiang di tiap batas potongan, dan barang menurut isi tiap
 * potongan. Letak barang tetap untuk benih yang sama; isi hanya menentukan
 * barang mana yang tampil (dari kiri), jadi barang tidak berpindah saat stok
 * berubah.
 */
export function rackFrontTexture(
    fills: readonly RackFill[],
    seed: number,
): PixelMatrix {
    const width = fills.length * SLICE;
    const m = createMatrix(width, RACK_TEXELS);

    fillRect(m, 0, 0, width, RACK_TEXELS, W('walnut-6'));

    for (let x = 0; x < width; x++) {
        setPixel(m, x, 0, W('kuningan'));
        setPixel(m, x, 1, W('walnut-3'));
    }

    for (const board of RACK_BOARDS) {
        for (let x = 0; x < width; x++) {
            setPixel(m, x, board, W('walnut-2'));
            setPixel(m, x, board - 1, W('walnut-7'));
        }
    }

    fills.forEach((fill, slice) => {
        const level = FILL_LEVEL[fill];
        const sx = slice * SLICE;

        RACK_BOARDS.forEach((board, tier) => {
            const rng = createRng(seed + slice * 101 + tier * 7);
            const top = tier === 0 ? 2 : RACK_BOARDS[tier - 1] + 1;
            const room = board - 1 - top;
            let i = 2;

            while (i < SLICE - 3) {
                const w = 2 + Math.floor(rng() * 2);
                const ph = Math.min(room - 1, 4 + Math.floor(rng() * 4));
                const [body, dark] = GOODS[Math.floor(rng() * GOODS.length)];
                const cap = rng() < 0.4;

                if (i / SLICE <= level) {
                    const y0 = board - 1 - ph;
                    fillRect(m, sx + i, y0, w, ph, body);
                    fillRect(m, sx + i + w - 1, y0, 1, ph, dark);

                    if (cap) {
                        fillRect(m, sx + i, y0, w, 1, W('kuningan-gelap'));
                    }
                }

                i += w + 1;
            }
        });
    });

    // Tiang di tepi dan di tiap batas potongan.
    for (let x = 0; x <= width; x += SLICE) {
        const px = Math.min(x, width - 1);
        fillRect(m, px, 1, 1, RACK_TEXELS - 1, W('walnut-4'));
    }

    return m;
}

/** Sisi ujung rak: panel walnut berbingkai, lis kuningan di atas. */
export function rackEndTexture(depthTexels = SLICE): PixelMatrix {
    const m = createMatrix(depthTexels, RACK_TEXELS);

    fillRect(m, 0, 0, depthTexels, RACK_TEXELS, W('walnut-5'));
    fillRect(m, 0, 0, depthTexels, 1, W('kuningan'));
    fillRect(m, 0, 1, depthTexels, 1, W('walnut-3'));
    fillRect(m, 2, 4, depthTexels - 4, RACK_TEXELS - 8, W('walnut-4'));
    fillRect(m, 2, 4, depthTexels - 4, 1, W('walnut-6'));
    fillRect(m, 2, 4, 1, RACK_TEXELS - 8, W('walnut-6'));
    fillRect(m, 2, RACK_TEXELS - 5, depthTexels - 4, 1, W('walnut-3'));

    return m;
}

/** Papan atas rak: papan walnut, tepi depan kuningan. */
export function rackTopTexture(
    widthTexels: number,
    depthTexels: number,
    seed: number,
): PixelMatrix {
    const m = plankTexture({
        width: widthTexels,
        height: depthTexels,
        seed,
        length: [24, 40],
    });

    for (let x = 0; x < widthTexels; x++) {
        setPixel(m, x, depthTexels - 1, W('kuningan'));
    }

    return m;
}

// ---- Meja kasir -------------------------------------------------------------

export const COUNTER_TEXELS = 28;

/** Panel cekung walnut: tepi atas dan kiri berbayang, bawah dan kanan tersorot. */
function recessedPanel(
    m: PixelMatrix,
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    fillRect(m, x, y, w, h, W('walnut-4'));
    fillRect(m, x, y, w, 1, W('walnut-6'));
    fillRect(m, x, y, 1, h, W('walnut-6'));
    fillRect(m, x, y + h - 1, w, 1, W('walnut-2'));
    fillRect(m, x + w - 1, y, 1, h, W('walnut-2'));
}

/** Badan meja (depan atau sisi): tepi lempeng marmer, lis kuningan, panel walnut, plint. */
export function counterBodyTexture(widthTexels: number): PixelMatrix {
    const m = createMatrix(widthTexels, COUNTER_TEXELS);

    fillRect(m, 0, 0, widthTexels, COUNTER_TEXELS, W('walnut-3'));
    fillRect(m, 0, 0, widthTexels, 1, W('marmer-gelap'));
    fillRect(m, 0, 1, widthTexels, 1, W('kuningan'));
    fillRect(m, 0, COUNTER_TEXELS - 2, widthTexels, 2, W('walnut-6'));
    fillRect(m, 0, 2, 1, COUNTER_TEXELS - 4, W('walnut-4'));
    fillRect(m, widthTexels - 1, 2, 1, COUNTER_TEXELS - 4, W('walnut-4'));

    for (let x = 0; x + SLICE <= widthTexels; x += SLICE) {
        recessedPanel(m, x + 3, 5, SLICE - 6, COUNTER_TEXELS - 10);
    }

    return m;
}

/** Permukaan meja: marmer dengan tepi depan gelap. */
export function counterTopTexture(
    widthTexels: number,
    depthTexels: number,
    seed: number,
): PixelMatrix {
    const m = marbleTexture(widthTexels, depthTexels, seed);

    for (let x = 0; x < widthTexels; x++) {
        setPixel(m, x, depthTexels - 1, W('marmer-gelap'));
    }

    return m;
}

// ---- Kulkas -----------------------------------------------------------------

export const FRIDGE_TEXELS = 76;
/** Rak kaca di balik pintu (baris dari atas). */
export const FRIDGE_SHELVES = [21, 34, 47, 60] as const;

/** Tutup walnut 4 baris di atas badan enamel. */
function fridgeCap(m: PixelMatrix, width: number): void {
    fillRect(m, 0, 0, width, 1, W('walnut-2'));
    fillRect(m, 0, 1, width, 2, W('walnut-3'));
    fillRect(m, 0, 3, width, 1, W('kuningan'));
}

/**
 * Muka depan kulkas: badan krem enamel, pintu kaca berbingkai dengan empat rak
 * kaca, botol menurut isi, gagang kuningan, kisi di bawah pintu, plint walnut.
 */
export function fridgeFrontTexture(fill: RackFill, seed: number): PixelMatrix {
    const w = SLICE;
    const m = createMatrix(w, FRIDGE_TEXELS);
    const level = FILL_LEVEL[fill];

    fillRect(m, 0, 0, w, FRIDGE_TEXELS, W('enamel'));
    fridgeCap(m, w);

    // Pintu kaca.
    fillRect(m, 2, 7, w - 4, 57, W('enamel-gelap'));
    fillRect(m, 3, 8, w - 6, 55, W('kaca'));

    FRIDGE_SHELVES.forEach((shelf, tier) => {
        fillRect(m, 3, shelf, w - 6, 1, W('kaca-gelap'));
        const rng = createRng(seed + tier * 13);
        let i = 4;

        while (i < w - 4) {
            const [body, dark] = GOODS[Math.floor(rng() * GOODS.length)];
            const h = 5 + Math.floor(rng() * 3);

            if ((i - 3) / (w - 6) <= level) {
                fillRect(m, i, shelf - h, 2, h, body);
                fillRect(m, i + 1, shelf - h + 1, 1, h - 1, dark);
                setPixel(m, i, shelf - h, W('kuningan-gelap'));
            }

            i += 3;
        }
    });

    // Gagang di sisi kanan pintu.
    fillRect(m, w - 4, 30, 1, 12, W('kuningan'));

    // Kisi di bawah pintu dan plint.
    for (let y = 66; y < 71; y += 2) {
        fillRect(m, 3, y, w - 6, 1, W('enamel-gelap'));
    }

    fillRect(m, 0, FRIDGE_TEXELS - 4, w, 2, W('walnut-5'));
    fillRect(m, 0, FRIDGE_TEXELS - 2, w, 2, W('walnut-6'));

    return m;
}

/** Sisi kulkas: enamel dengan tepi depan sedikit gelap, tutup dan plint walnut. */
export function fridgeSideTexture(depthTexels = SLICE): PixelMatrix {
    const m = createMatrix(depthTexels, FRIDGE_TEXELS);

    fillRect(m, 0, 0, depthTexels, FRIDGE_TEXELS, W('enamel'));
    fridgeCap(m, depthTexels);
    fillRect(m, 0, 4, 1, FRIDGE_TEXELS - 8, W('enamel-gelap'));
    fillRect(m, 0, FRIDGE_TEXELS - 4, depthTexels, 2, W('walnut-5'));
    fillRect(m, 0, FRIDGE_TEXELS - 2, depthTexels, 2, W('walnut-6'));

    return m;
}

/** Tutup atas kulkas: walnut. */
export function fridgeTopTexture(seed: number): PixelMatrix {
    return plankTexture({
        width: SLICE,
        height: SLICE,
        seed,
        length: [16, 16],
    });
}

// ---- Pot tanaman ------------------------------------------------------------

export const POT_TEXELS = 10;
export const POT_SIZE = 8;

/** Sisi pot terakota: bibir terang, badan, sisi kanan dan dasar lebih gelap. */
export function potSideTexture(): PixelMatrix {
    const m = createMatrix(POT_SIZE, POT_TEXELS);

    fillRect(m, 0, 0, POT_SIZE, POT_TEXELS, W('pot'));
    fillRect(m, 0, 0, POT_SIZE, 2, W('pot-sorot'));
    fillRect(m, POT_SIZE - 2, 2, 2, POT_TEXELS - 2, W('pot-gelap'));
    fillRect(m, 0, POT_TEXELS - 1, POT_SIZE, 1, W('pot-gelap'));

    return m;
}

/** Atas pot: bibir terakota mengelilingi tanah. */
export function potTopTexture(): PixelMatrix {
    const m = createMatrix(POT_SIZE, POT_SIZE);

    fillRect(m, 0, 0, POT_SIZE, POT_SIZE, W('pot-sorot'));
    fillRect(m, 1, 1, POT_SIZE - 2, POT_SIZE - 2, W('walnut-6'));

    return m;
}

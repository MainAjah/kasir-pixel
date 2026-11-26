/**
 * Tekstur dinding toko (Tahap 5H), mengikuti konsep v4 yang disetujui: plester
 * (mawar di kiri, ivory di kanan) di atas wainscot putih berpanel dengan lis
 * kuningan, mahkota bergaris kuningan di atas, dan plint walnut di bawah.
 *
 * Tinggi 80 texel = tinggi dinding Canvas (WALL_H). Baris dari atas:
 * mahkota 0–3, plester 4–47, lis kursi 48–50, panel 51–74, plint 75–79.
 */
import { createMatrix, setPixel } from '../../sprites/pixels';
import type { PixelMatrix } from '../../sprites/pixels';
import { W } from '../../three/palette-world';
import { ditherMix } from './dither';
import { hash2, valueNoise } from './noise';

export const WALL_TEXELS = 80;
export const PLASTER_ROWS = [4, 47] as const;
export const RAIL_ROWS = [48, 50] as const;
export const PANEL_ROWS = [51, 74] as const;
export const PLINTH_ROWS = [75, 79] as const;
/** Jarak antarpanel wainscot sepanjang dinding (texel). */
export const PANEL_PERIOD = 24;

export type WallTone = 'mawar' | 'ivory';

const PLASTER: Record<WallTone, { base: string; light: string; dark: string }> =
    {
        mawar: {
            base: W('mawar'),
            light: W('mawar-terang'),
            dark: W('mawar-gelap'),
        },
        ivory: {
            base: W('ivory'),
            light: W('wainscot'),
            dark: W('ivory-gelap'),
        },
    };

const CROWN = [W('wainscot'), W('kuningan'), W('wainscot'), W('krem-bayangan')];
const RAIL = [W('wainscot'), W('kuningan'), W('krem-bayangan')];
const PLINTH = [
    W('kuningan-gelap'),
    W('walnut-3'),
    W('walnut-4'),
    W('walnut-5'),
    W('walnut-6'),
];

/** Warna satu texel dinding di kolom `x` (sepanjang dinding) dan baris `y`. */
function wallTexel(
    x: number,
    y: number,
    tone: WallTone,
    seed: number,
    panels: boolean,
): string {
    if (y < PLASTER_ROWS[0]) {
        return CROWN[y];
    }

    if (y <= PLASTER_ROWS[1]) {
        const p = PLASTER[tone];
        // Empat baris di bawah mahkota sedikit lebih gelap (bayangan mahkota),
        // dengan dither Bayer supaya gradasinya rata.
        const shade = Math.max(0, (PLASTER_ROWS[0] + 4 - y) / 4) * 0.5;

        if (ditherMix(x, y, shade)) {
            return p.dark;
        }

        // Plester halus: bintik gelap acak yang jarang, sedikit lebih rapat
        // di bercak derau besar; sorot lebih jarang lagi.
        const n = valueNoise(seed, x, y, 6);
        const speck = 0.03 + Math.max(0, n - 0.6) * 0.25;
        const h = hash2(seed, x, y);

        if (h < speck) {
            return p.dark;
        }

        if (h > 0.965) {
            return p.light;
        }

        return p.base;
    }

    if (y <= RAIL_ROWS[1]) {
        return RAIL[y - RAIL_ROWS[0]];
    }

    if (y <= PANEL_ROWS[1]) {
        if (!panels) {
            return W('wainscot');
        }

        // Panel cekung: tepi atas dan kiri berbayang, tepi bawah dan kanan tersorot.
        const px = ((x % PANEL_PERIOD) + PANEL_PERIOD) % PANEL_PERIOD;
        const py = y - PANEL_ROWS[0];
        const left = 3;
        const right = PANEL_PERIOD - 4;
        const top = 2;
        const bottom = PANEL_ROWS[1] - PANEL_ROWS[0] - 2;

        if (px < left || px > right || py < top || py > bottom) {
            return W('wainscot');
        }

        if (py === top || px === left) {
            return W('krem-bayangan');
        }

        if (py === bottom || px === right) {
            return W('wainscot');
        }

        return W('panel');
    }

    return PLINTH[y - PLINTH_ROWS[0]];
}

/** Muka dalam dinding sepanjang `width` texel. */
export function wallTexture(
    width: number,
    tone: WallTone,
    seed: number,
): PixelMatrix {
    const m = createMatrix(width, WALL_TEXELS);

    for (let y = 0; y < WALL_TEXELS; y++) {
        for (let x = 0; x < width; x++) {
            setPixel(m, x, y, wallTexel(x, y, tone, seed, true));
        }
    }

    return m;
}

/** Ujung dinding (tebal dinding × tinggi): lapisan yang sama tanpa panel. */
export function wallEndTexture(
    thickness: number,
    tone: WallTone,
    seed: number,
): PixelMatrix {
    const m = createMatrix(thickness, WALL_TEXELS);

    for (let y = 0; y < WALL_TEXELS; y++) {
        for (let x = 0; x < thickness; x++) {
            setPixel(m, x, y, wallTexel(x, y, tone, seed, false));
        }
    }

    return m;
}

/** Tutup atas dinding (panjang × tebal): kayu walnut bertepi kuningan. */
export function wallCapTexture(length: number, thickness: number): PixelMatrix {
    const m = createMatrix(length, thickness);

    for (let x = 0; x < length; x++) {
        for (let y = 0; y < thickness; y++) {
            const edge = y === thickness - 1;
            setPixel(
                m,
                x,
                y,
                edge
                    ? W('kuningan')
                    : y === 0
                      ? W('walnut-2')
                      : x % 7 === 3 && y === 1
                        ? W('walnut-4')
                        : W('walnut-3'),
            );
        }
    }

    return m;
}

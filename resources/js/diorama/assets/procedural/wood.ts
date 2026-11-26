/**
 * Tekstur papan walnut (Tahap 5H): lantai toko dan badan perabot kayu.
 *
 * Papan sejajar sumbu u (gx), selebar `plank` texel termasuk satu baris celah.
 * Tiap jalur papan dipotong menjadi ruas acak (sambungan berselang), tiap ruas
 * bernada sendiri dari tangga walnut, dengan serat dari derau 1D, sorot tipis
 * di tepi atas, dan sesekali mata kayu. Satu tekstur menutup seluruh lantai,
 * jadi papan menyambung lintas ubin tanpa pola berulang.
 */
import { createRng } from '../../engine/rng';
import { createMatrix, setPixel } from '../../sprites/pixels';
import type { PixelMatrix } from '../../sprites/pixels';
import { W } from '../../three/palette-world';
import { step } from './dither';
import { hash2, valueNoise } from './noise';

/** Tangga nada walnut, terang → gelap. */
export const WALNUT = [
    W('walnut-1'),
    W('walnut-2'),
    W('walnut-3'),
    W('walnut-4'),
    W('walnut-5'),
    W('walnut-6'),
    W('walnut-7'),
] as const;

export type PlankOptions = {
    width: number;
    height: number;
    seed: number;
    /** Lebar satu papan termasuk baris celah (texel). */
    plank?: number;
    /** Panjang ruas papan terpendek dan terpanjang (texel). */
    length?: readonly [number, number];
};

/** Warna celah antarpapan dan sambungan ujung. */
export const PLANK_GAP = W('walnut-7');
export const PLANK_JOINT = W('walnut-6');

export function plankTexture({
    width,
    height,
    seed,
    plank = 4,
    length = [20, 44],
}: PlankOptions): PixelMatrix {
    const m = createMatrix(width, height);
    const rng = createRng(seed);
    const bands = Math.ceil(height / plank);

    for (let band = 0; band < bands; band++) {
        const top = band * plank;
        // Sambungan berselang: ruas pertama tiap jalur mulai di titik acak.
        let start = -Math.floor(rng() * length[1]);
        let previous = -1;

        while (start < width) {
            const len =
                length[0] + Math.floor(rng() * (length[1] - length[0] + 1));
            let tone = Math.floor(rng() * 3);

            if (tone === previous) {
                tone = (tone + 1) % 3;
            }

            previous = tone;
            const segSeed = Math.floor(rng() * 1e9);
            const knot =
                rng() < 0.15 ? start + 3 + Math.floor(rng() * (len - 6)) : null;
            const knotRow = top + 1 + Math.floor(rng() * (plank - 2));

            for (let dx = 0; dx < len; dx++) {
                const x = start + dx;

                if (x < 0 || x >= width) {
                    continue;
                }

                for (let dy = 0; dy < plank; dy++) {
                    const y = top + dy;

                    if (y >= height) {
                        break;
                    }

                    if (dy === plank - 1) {
                        setPixel(m, x, y, PLANK_GAP);

                        continue;
                    }

                    if (dx === len - 1) {
                        setPixel(m, x, y, PLANK_JOINT);

                        continue;
                    }

                    let t = tone;
                    // Serat: garis memanjang dari derau 1D per baris papan.
                    const grain = valueNoise(segSeed + dy * 7919, x, 0, 5);

                    if (grain > 0.74) {
                        t += 1;
                    } else if (grain < 0.12 && t > 0) {
                        t -= 1;
                    }

                    if (dy === 0 && hash2(segSeed, x, y) < 0.5) {
                        t -= 1; // sorot tipis di tepi atas papan
                    }

                    if (knot !== null && y === knotRow) {
                        if (x === knot) {
                            t = 4;
                        } else if (Math.abs(x - knot) === 1) {
                            t = 3;
                        }
                    }

                    setPixel(m, x, y, step(WALNUT, t));
                }
            }

            start += len;
        }
    }

    return m;
}

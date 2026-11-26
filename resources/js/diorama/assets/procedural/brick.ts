/**
 * Tekstur bata alas balok toko (Tahap 5H). Satu muka alas setinggi 23 texel,
 * sama dengan alas Canvas 5F: lis kuningan, garis bayangan, tiga lapis bata
 * berselang, dan garis bawah.
 *
 * Langkah: susunan ikatan berselang → nada dasar per bata (acak dari tangga 3
 * nada) → derau per piksel menggeser ±1 nada → tepi atas sorot, tepi bawah
 * bayang, sudut gempil acak → nat dua nada ber-dither → kotor ke bawah (Bayer).
 */
import { createMatrix, setPixel } from '../../sprites/pixels';
import type { PixelMatrix } from '../../sprites/pixels';
import { createRng } from '../../engine/rng';
import { W } from '../../three/palette-world';
import { ditherMix, step } from './dither';
import { hash2, valueNoise } from './noise';

export const BASE_TEXELS = 23;
/** Panjang satu bata termasuk satu kolom nat. */
export const BRICK_LEN = 12;
/** Tinggi satu lapis: satu baris nat + lima baris bata. */
export const COURSE_H = 6;
/** Baris pertama lapis bata (di bawah lis dan garis bayangan). */
export const COURSE_TOP = 3;
export const COURSES = 3;

/** Tangga nada bata, terang → gelap. */
const RAMP = [
    W('bata-sorot'),
    W('bata-1'),
    W('bata-2'),
    W('bata-3'),
    W('nat-1'),
] as const;

export function brickTexture(width: number, seed: number): PixelMatrix {
    const m = createMatrix(width, BASE_TEXELS);
    const rng = createRng(seed);

    // Lis kuningan dan garis bayangan di bawahnya.
    for (let x = 0; x < width; x++) {
        setPixel(m, x, 0, W('kuningan-sorot'));
        setPixel(m, x, 1, W('kuningan-gelap'));
        setPixel(m, x, 2, W('nat-2'));
    }

    for (let course = 0; course < COURSES; course++) {
        const top = COURSE_TOP + course * COURSE_H;
        const offset = course % 2 === 0 ? 0 : BRICK_LEN / 2;
        // Baris nat di atas lapis.
        for (let x = 0; x < width; x++) {
            setPixel(
                m,
                x,
                top,
                ditherMix(x, top, 0.3) ? W('nat-2') : W('nat-1'),
            );
        }

        const first = -offset;

        for (let start = first; start < width; start += BRICK_LEN) {
            // Nada dasar bata: 1 (terang) sering, 3 (gelap) jarang.
            const r = rng();
            const base = r < 0.45 ? 1 : r < 0.85 ? 2 : 3;
            const chipped = rng() < 0.25 ? Math.floor(rng() * 4) : -1;
            const brickSeed = Math.floor(rng() * 1e9);

            for (let dx = 0; dx < BRICK_LEN; dx++) {
                const x = start + dx;

                if (x < 0 || x >= width) {
                    continue;
                }

                for (let dy = 1; dy < COURSE_H; dy++) {
                    const y = top + dy;

                    // Kolom nat tegak di ujung bata.
                    if (dx === BRICK_LEN - 1) {
                        setPixel(m, x, y, dy % 2 ? W('nat-1') : W('nat-2'));

                        continue;
                    }

                    let tone = base;

                    if (dy === 1) {
                        tone -= 1; // tepi atas tersorot
                    } else if (dy === COURSE_H - 1) {
                        tone += 1; // tepi bawah berbayang
                    }

                    const n = valueNoise(brickSeed, x, y, 2);

                    if (n > 0.8) {
                        tone += 1;
                    } else if (hash2(brickSeed, x, y) < 0.06) {
                        tone -= 1;
                    }

                    // Kotor ke arah bawah: lapis terakhir makin gelap.
                    if (
                        course === COURSES - 1 &&
                        ditherMix(x, y, (dy - 1) / (COURSE_H * 3))
                    ) {
                        tone += 1;
                    }

                    // Sudut gempil: satu piksel sudut menjadi nat.
                    const corner =
                        (chipped === 0 && dx === 0 && dy === 1) ||
                        (chipped === 1 && dx === BRICK_LEN - 2 && dy === 1) ||
                        (chipped === 2 && dx === 0 && dy === COURSE_H - 1) ||
                        (chipped === 3 &&
                            dx === BRICK_LEN - 2 &&
                            dy === COURSE_H - 1);

                    setPixel(m, x, y, corner ? W('nat-1') : step(RAMP, tone));
                }
            }
        }
    }

    // Garis bawah alas.
    for (let x = 0; x < width; x++) {
        setPixel(m, x, BASE_TEXELS - 2, W('nat-1'));
        setPixel(m, x, BASE_TEXELS - 1, W('nat-2'));
    }

    return m;
}

/**
 * Tekstur marmer (Tahap 5H): permukaan meja kasir. Urat tipis dari kontur
 * derau berlapis, sesekali berinti gelap; dasar krem pucat.
 */
import { createMatrix, setPixel } from '../../sprites/pixels';
import type { PixelMatrix } from '../../sprites/pixels';
import { W } from '../../three/palette-world';
import { ditherMix } from './dither';
import { valueNoise } from './noise';

export function marbleTexture(
    width: number,
    height: number,
    seed: number,
): PixelMatrix {
    const m = createMatrix(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const n =
                valueNoise(seed, x, y, 9) * 0.7 +
                valueNoise(seed + 1, x, y, 3) * 0.3;
            // Urat = garis kontur derau (pecahan dekat 0).
            const contour = Math.abs(((n * 5) % 1) - 0.5);
            let color = W('marmer');

            if (contour > 0.43) {
                color =
                    contour > 0.47 && valueNoise(seed + 2, x, y, 6) > 0.45
                        ? W('marmer-gelap')
                        : W('marmer-urat');
            } else if (ditherMix(x, y, (contour - 0.36) * 4)) {
                color = W('marmer-urat');
            }

            setPixel(m, x, y, color);
        }
    }

    return m;
}

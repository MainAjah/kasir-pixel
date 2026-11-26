/**
 * Rimbun daun (Tahap 5H): tanaman pot. Gumpalan lingkaran acak berbenih;
 * tiap gumpalan dinaungi dari kiri atas (tangga 5 nada daun), tepinya lebih
 * gelap, dan sesekali kilau. Di luar gumpalan transparan.
 */
import { createRng } from '../../engine/rng';
import { createMatrix, setPixel } from '../../sprites/pixels';
import type { PixelMatrix } from '../../sprites/pixels';
import { W } from '../../three/palette-world';
import { step } from './dither';
import { hash2 } from './noise';

export const LEAF_RAMP = [
    W('daun-sorot'),
    W('daun-1'),
    W('daun-2'),
    W('daun-3'),
    W('daun-4'),
] as const;

export function leafTexture(
    width: number,
    height: number,
    seed: number,
    clumps = 9,
): PixelMatrix {
    const m = createMatrix(width, height);
    const rng = createRng(seed);
    const blobs = Array.from({ length: clumps }, () => {
        const r = 3 + rng() * 4;

        return {
            x: r + rng() * (width - 2 * r),
            y: r + rng() * (height - 2 * r),
            r,
        };
    });

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Gumpalan terakhir yang menutup piksel ini menang (lebih depan).
            let tone: number | null = null;

            for (const b of blobs) {
                const dx = x + 0.5 - b.x;
                const dy = y + 0.5 - b.y;
                const d = Math.hypot(dx, dy) / b.r;

                if (d <= 1) {
                    // Cahaya dari kiri atas: makin ke kanan bawah makin gelap.
                    const lit = (dx + dy) / (2 * b.r);
                    tone = 1 + Math.round(lit * 2 + (d > 0.8 ? 1 : 0));
                }
            }

            if (tone === null) {
                continue;
            }

            if (tone <= 1 && hash2(seed, x, y) < 0.12) {
                tone = 0; // kilau
            }

            setPixel(m, x, y, step(LEAF_RAMP, tone));
        }
    }

    return m;
}

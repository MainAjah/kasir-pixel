/**
 * Melukis matriks piksel ke kanvas cadangan sekali, lalu dipakai ulang tiap bingkai
 * (rancangan bagian 5: "dirender sekali ke kanvas cadangan").
 */
import type { PixelMatrix } from './pixels';

export function paintMatrix(
    ctx: CanvasRenderingContext2D,
    m: PixelMatrix,
    x0 = 0,
    y0 = 0,
): void {
    for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
            const color = m.pixels[y * m.width + x];

            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(x0 + x, y0 + y, 1, 1);
            }
        }
    }
}

export class SpriteCache {
    private readonly canvases = new Map<string, HTMLCanvasElement>();

    /** Kanvas untuk kunci ini; dibuat sekali dengan `build`. */
    get(key: string, build: () => PixelMatrix): HTMLCanvasElement {
        const cached = this.canvases.get(key);

        if (cached) {
            return cached;
        }

        const matrix = build();
        const canvas = document.createElement('canvas');
        canvas.width = matrix.width;
        canvas.height = matrix.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            paintMatrix(ctx, matrix);
        }

        this.canvases.set(key, canvas);

        return canvas;
    }

    /** Kanvas yang dilukis langsung dengan perintah gambar (misalnya balok isometrik rak). */
    getDrawn(
        key: string,
        width: number,
        height: number,
        draw: (ctx: CanvasRenderingContext2D) => void,
    ): HTMLCanvasElement {
        const cached = this.canvases.get(key);

        if (cached) {
            return cached;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.imageSmoothingEnabled = false;
            draw(ctx);
        }

        this.canvases.set(key, canvas);

        return canvas;
    }
}

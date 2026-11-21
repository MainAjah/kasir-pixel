/**
 * Sprite sebagai matriks piksel murni (tanpa DOM): tiap sel berisi warna hex atau
 * null (transparan). Bagian-bagian ditulis sebagai grid huruf, satu huruf = satu
 * peran warna, lalu dipetakan ke palet. Hasilnya bisa dites di Node, dan dilukis
 * ke kanvas cadangan sekali saja (sprite-cache.ts).
 */
export type PixelMatrix = {
    width: number;
    height: number;
    /** Baris demi baris; null = transparan. */
    pixels: (string | null)[];
};

/** Peta huruf → warna. Huruf yang tidak dipetakan (termasuk ".") transparan. */
export type Legend = Record<string, string | undefined>;

export function createMatrix(width: number, height: number): PixelMatrix {
    return {
        width,
        height,
        pixels: Array.from<string | null>({ length: width * height }).fill(
            null,
        ),
    };
}

export function setPixel(
    m: PixelMatrix,
    x: number,
    y: number,
    color: string | null,
): void {
    if (x >= 0 && y >= 0 && x < m.width && y < m.height) {
        m.pixels[y * m.width + x] = color;
    }
}

export function getPixel(m: PixelMatrix, x: number, y: number): string | null {
    return x >= 0 && y >= 0 && x < m.width && y < m.height
        ? m.pixels[y * m.width + x]
        : null;
}

/** Tempel grid huruf di (x0, y0). Huruf transparan tidak menimpa yang di bawahnya. */
export function stamp(
    m: PixelMatrix,
    grid: readonly string[],
    legend: Legend,
    x0: number,
    y0: number,
): void {
    grid.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const color = legend[row[x]];

            if (color) {
                setPixel(m, x0 + x, y0 + y, color);
            }
        }
    });
}

export function fillRect(
    m: PixelMatrix,
    x0: number,
    y0: number,
    w: number,
    h: number,
    color: string,
): void {
    for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
            setPixel(m, x, y, color);
        }
    }
}

/** Cermin horizontal (arah hadap kiri ↔ kanan). */
export function mirror(m: PixelMatrix): PixelMatrix {
    const out = createMatrix(m.width, m.height);

    for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
            out.pixels[y * m.width + (m.width - 1 - x)] =
                m.pixels[y * m.width + x];
        }
    }

    return out;
}

/** Semua warna yang dipakai (untuk tes palet). */
export function colorsOf(m: PixelMatrix): Set<string> {
    return new Set(m.pixels.filter((p): p is string => p !== null));
}

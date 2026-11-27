/**
 * Logika murni komponen HD-2D (Tahap B1), tanpa DOM, dites Vitest.
 */

/** Jumlah huruf yang sudah tampil pada efek mengetik. */
export function typedLength(
    total: number,
    elapsedMs: number,
    charsPerSecond: number,
): number {
    if (elapsedMs <= 0 || charsPerSecond <= 0) {
        return 0;
    }

    return Math.min(total, Math.floor((elapsedMs * charsPerSecond) / 1000));
}

/** Potong teks per titik kode (aman untuk emoji dan huruf beraksen gabungan). */
export function sliceChars(text: string, count: number): string {
    return Array.from(text).slice(0, count).join('');
}

/**
 * Indeks tab berikutnya untuk tombol panah, Home, dan End (pola tablist WAI-ARIA).
 * Tab nonaktif dilewati dan ujungnya berputar. `null` bila tombol tidak dipakai.
 */
export function nextTabIndex(
    current: number,
    key: string,
    count: number,
    disabled: readonly boolean[] = [],
): number | null {
    const enabled = (i: number) => !disabled[i];

    if (
        count <= 0 ||
        !Array.from({ length: count }, (_, i) => i).some(enabled)
    ) {
        return null;
    }

    const step = (from: number, delta: 1 | -1) => {
        let i = from;

        for (let n = 0; n < count; n++) {
            i = (i + delta + count) % count;

            if (enabled(i)) {
                return i;
            }
        }

        return from;
    };

    switch (key) {
        case 'ArrowRight':
        case 'ArrowDown':
            return step(current, 1);
        case 'ArrowLeft':
        case 'ArrowUp':
            return step(current, -1);
        case 'Home':
            return step(-1, 1);
        case 'End':
            return step(count, -1);
        default:
            return null;
    }
}

/**
 * Pindah baris aktif di daftar (panah atas dan bawah), tanpa berputar di ujung.
 * Baris nonaktif (stok habis) tetap bisa dipilih agar alasannya bisa dijelaskan;
 * yang mencegah penambahan adalah pemanggil.
 */
export function moveActive(
    current: number,
    delta: number,
    count: number,
): number {
    if (count <= 0) {
        return -1;
    }

    if (current < 0) {
        return delta >= 0 ? 0 : count - 1;
    }

    return Math.min(count - 1, Math.max(0, current + delta));
}

// ---- Kontras warna (WCAG 2.x) ------------------------------------------------

type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
    const h = hex.replace('#', '');
    const full =
        h.length === 3
            ? h
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : h;

    return [0, 2, 4].map((i) =>
        parseInt(full.slice(i, i + 2), 16),
    ) as unknown as Rgb;
}

/** Campur warna depan dengan opasitas di atas warna latar (hasil sRGB). */
export function blend(front: string, alpha: number, back: string): Rgb {
    const f = hexToRgb(front);
    const b = hexToRgb(back);

    return [0, 1, 2].map((i) =>
        Math.round(f[i] * alpha + b[i] * (1 - alpha)),
    ) as unknown as Rgb;
}

export function relativeLuminance(rgb: Rgb | string): number {
    const [r, g, b] = (typeof rgb === 'string' ? hexToRgb(rgb) : rgb).map(
        (v) => {
            const c = v / 255;

            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        },
    );

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: Rgb | string, b: Rgb | string): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];

    return (hi + 0.05) / (lo + 0.05);
}

/**
 * Memuat gambar karakter pemilik (PNG di folder referensi/) menjadi matriks piksel.
 * Hanya di browser; dimuat sekali, lalu dipakai renderer dan lab.
 */
import { REFERENCE_CHARACTERS } from './reference-sprite';
import { matrixFromRgba } from './reference-sprite';
import type { PixelMatrix } from './pixels';

const urls = import.meta.glob('./referensi/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>;

const matrices = new Map<string, PixelMatrix>();
let loading: Promise<void> | null = null;

function loadOne(key: string, url: string): Promise<void> {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.drawImage(image, 0, 0);
                const { data } = ctx.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                );
                matrices.set(
                    key,
                    matrixFromRgba(data, canvas.width, canvas.height),
                );
            }

            resolve();
        };
        image.onerror = () => resolve();
        image.src = url;
    });
}

/** Mulai memuat semua gambar (sekali). */
export function loadReferences(): Promise<void> {
    loading ??= Promise.all(
        REFERENCE_CHARACTERS.map((c) => {
            const url = urls[`./referensi/${c.file}`];

            return url ? loadOne(c.key, url) : Promise.resolve();
        }),
    ).then(() => undefined);

    return loading;
}

/** Matriks gambar asli, atau null bila belum dimuat. */
export function referenceMatrix(key: string): PixelMatrix | null {
    return matrices.get(key) ?? null;
}

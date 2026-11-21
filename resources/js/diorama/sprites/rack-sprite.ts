/**
 * Potongan rak per tile (Tahap 5C), dipindahkan dari halaman rancangan 5A yang
 * sudah disetujui: badan kayu setinggi 32 px, papan atas krem berbingkai kayu
 * (beda dari lantai), tiga tingkat papan, barang beraneka tinggi dan warna dengan
 * kilau dan label, label harga, dan panel kayu di sisi ujung.
 *
 * Isi rak 4 tingkat menurut stok (rancangan bagian 9): kosong, sedikit, setengah,
 * penuh. Barang mengisi dari kiri; tata letaknya tetap untuk benih yang sama.
 */
import { isoBox, leftDot, rightDot, topDot } from '../render/pixel';
import { C } from './palette';

export type RackFill = 'kosong' | 'sedikit' | 'setengah' | 'penuh';

export const RACK_FILLS: readonly RackFill[] = [
    'kosong',
    'sedikit',
    'setengah',
    'penuh',
];
export const RACK_HEIGHT = 32;
/** Ukuran kanvas cadangan satu potongan dan letak puncak tile di dalamnya. */
export const RACK_CANVAS = {
    width: 64,
    height: 66,
    originX: 32,
    originY: 33,
} as const;

const FILL_LEVEL: Record<RackFill, number> = {
    kosong: 0,
    sedikit: 0.25,
    setengah: 0.6,
    penuh: 1,
};

/** Pasangan warna barang [badan, sisi gelap]. */
const PRODUCTS: readonly (readonly [string, string])[] = [
    [C(14), C(15)],
    [C(12), C(13)],
    [C(9), C(10)],
    [C(18), C(19)],
    [C(16), C(14)],
    [C(17), C(3)],
    [C(4), C(3)],
];

const T = 32;
const SHELVES = [11, 22, 31];

/** Gambar satu potongan rak dengan puncak tile di (cx, ty). */
export function drawRackSlice(
    ctx: CanvasRenderingContext2D,
    cx: number,
    ty: number,
    fill: RackFill,
    seed: number,
): void {
    const h = RACK_HEIGHT;
    const level = FILL_LEVEL[fill];

    isoBox(ctx, cx, ty, T, T, h, C(5), C(20), C(23));

    // Bingkai kayu di tepi papan atas.
    for (let i = 0; i < T; i++) {
        leftDot(ctx, cx, ty, T, h, i, 0, C(23));
        topDot(ctx, cx, ty, h, i, T - 1, C(20));
    }

    for (let j = 0; j < T; j++) {
        topDot(ctx, cx, ty, h, T - 1, j, C(20));
    }

    let state = (seed * 9301 + 49297) % 233280;
    const rand = () => (state = (state * 9301 + 49297) % 233280) / 233280;

    for (const floorD of SHELVES) {
        leftDot(ctx, cx, ty, T, h, 0, floorD, C(8), T, 1); // papan
        leftDot(ctx, cx, ty, T, h, 0, floorD - 1, C(1), T, 1); // bayangan papan

        let i = 2;

        while (i < T - 3) {
            const w = 2 + Math.floor(rand() * 2);
            const ph = 4 + Math.floor(rand() * 4);
            const [body, dark] = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];

            if (i / T <= level) {
                leftDot(ctx, cx, ty, T, h, i, floorD - 1 - ph, body, w, ph);
                leftDot(
                    ctx,
                    cx,
                    ty,
                    T,
                    h,
                    i + w - 1,
                    floorD - 1 - ph,
                    dark,
                    1,
                    ph,
                );
                leftDot(ctx, cx, ty, T, h, i, floorD - 1 - ph, C(4), 1, 1); // kilau

                if (ph > 5) {
                    leftDot(
                        ctx,
                        cx,
                        ty,
                        T,
                        h,
                        i,
                        floorD - 3 - Math.floor(ph / 2),
                        C(4),
                        w - 1,
                        1,
                    ); // label
                }
            }

            i += w + 1;
        }

        for (let t = 4; t < T - 2; t += 9) {
            leftDot(ctx, cx, ty, T, h, t, floorD, C(4), 2, 1); // label harga
        }
    }

    // Sisi ujung: panel kayu dengan garis.
    for (let j = 6; j < T; j += 10) {
        rightDot(ctx, cx, ty, T, T, h, j, 2, C(20), 1, h - 3);
    }
}

import { describe, expect, it } from 'vite-plus/test';
import { Cashier, CASHIER_DURATION } from '../actors/cashier';
import {
    IDLE_COUNTER,
    drawCounterSlice,
    drawStool,
    formatDisplay,
} from './counter-sprite';
import type { CounterLook } from './counter-sprite';
import { C, isPaletteColor } from './palette';
import { CASHIER_MOTIONS, cashierMotion } from './reference-sprite';

/** Konteks kanvas palsu: mencatat warna setiap piksel. */
function paint(draw: (ctx: CanvasRenderingContext2D) => void) {
    const pixels = new Map<string, string>();
    const ctx = {
        fillStyle: '#000000',
        fillRect(x: number, y: number, w: number, h: number) {
            for (let yy = y; yy < y + h; yy++) {
                for (let xx = x; xx < x + w; xx++) {
                    pixels.set(`${xx},${yy}`, String(this.fillStyle));
                }
            }
        },
    };
    draw(ctx as unknown as CanvasRenderingContext2D);

    return pixels;
}

const counter = (look: CounterLook) =>
    paint((ctx) => {
        drawCounterSlice(ctx, 40, 40, 'kiri', look);
        drawCounterSlice(ctx, 72, 56, 'kanan', look);
    });

const colors = (pixels: Map<string, string>) => new Set(pixels.values());

describe('layar mini', () => {
    it('angka rupiah, lalu jutaan disingkat; paling banyak 7 karakter', () => {
        const cases: [number, string][] = [
            [0, '0'],
            [113_000, '113.000'],
            [999_999, '999.999'],
            [1_250_000, '1,2JT'],
            [12_500_000, '12,5JT'],
            [125_000_000, '125JT'],
            [-500, '0'],
        ];

        for (const [value, text] of cases) {
            expect(formatDisplay(value)).toBe(text);
            expect(formatDisplay(value).length).toBeLessThanOrEqual(7);
        }
    });

    it('hijau untuk total harian, kuning untuk total belanja', () => {
        const daily = colors(
            counter({
                ...IDLE_COUNTER,
                display: { text: '113.000', mode: 'harian' },
            }),
        );
        const paying = colors(
            counter({
                ...IDLE_COUNTER,
                display: { text: '23.500', mode: 'belanja' },
            }),
        );

        expect(daily.has(C(9))).toBe(true);
        expect(daily.has(C(11))).toBe(false);
        expect(paying.has(C(11))).toBe(true);
    });
});

describe('meja kasir', () => {
    const looks: CounterLook[] = [
        IDLE_COUNTER,
        { ...IDLE_COUNTER, scan: 0 },
        { ...IDLE_COUNTER, scan: 0.5 },
        { ...IDLE_COUNTER, beep: true },
        {
            ...IDLE_COUNTER,
            receipt: 1,
            display: { text: '1,2JT', mode: 'belanja' },
        },
        {
            ...IDLE_COUNTER,
            on: false,
            display: { text: 'TUTUP', mode: 'harian' },
        },
    ];

    it('semua keadaan dan bangku hanya memakai palet 24 warna', () => {
        const used = new Set<string>();

        for (const look of looks) {
            colors(counter(look)).forEach((c) => used.add(c));
        }

        colors(paint((ctx) => drawStool(ctx, 40, 40))).forEach((c) =>
            used.add(c),
        );

        expect([...used].filter((c) => !isPaletteColor(c))).toEqual([]);
    });

    it('laser terang dan barang di kaca hanya saat memindai', () => {
        const count = (pixels: Map<string, string>, color: string) =>
            [...pixels.values()].filter((c) => c === color).length;
        const idle = counter(IDLE_COUNTER);
        const scanning = counter({ ...IDLE_COUNTER, scan: 0 });

        // Saat diam laser redup (bata gelap); LED siaga scanner genggam saja yang bata pastel.
        // Garis laser 7 piksel, satu bisa tertutup barang yang sedang meluncur.
        expect(count(scanning, C(14))).toBeGreaterThanOrEqual(
            count(idle, C(14)) + 4,
        );
        expect(count(idle, C(15))).toBeGreaterThan(count(scanning, C(15)));
        // Barang kecil meluncur (kuning lampu) hanya saat memindai.
        expect(count(idle, C(11))).toBe(0);
        expect(count(scanning, C(11))).toBeGreaterThan(0);
    });

    it('struk keluar hanya saat membayar', () => {
        const idle = counter(IDLE_COUNTER);
        const printing = counter({ ...IDLE_COUNTER, receipt: 1 });

        expect(printing.size).toBeGreaterThan(idle.size - 1);
        expect(
            [...printing.entries()].filter(([at, c]) => idle.get(at) !== c)
                .length,
        ).toBeGreaterThan(0);
    });

    it('kasir tutup tidak menampilkan laser', () => {
        const closed = colors(
            counter({
                ...IDLE_COUNTER,
                on: false,
                display: { text: 'TUTUP', mode: 'harian' },
            }),
        );

        expect(closed.has(C(14))).toBe(false);
        expect(closed.has(C(15))).toBe(false);
    });
});

describe('penjaga melayani', () => {
    it('kemajuan aksi naik dari 0 ke 1 selama satu pindai', () => {
        const cashier = new Cashier();
        cashier.scan();
        cashier.update(0.001);

        expect(cashier.state).toBe('pindai');
        cashier.update(CASHIER_DURATION.pindai / 2);
        expect(cashier.progress).toBeGreaterThan(0.4);
        expect(cashier.progress).toBeLessThan(0.6);
    });

    it('gerak sendiri untuk sapa, pindai, bungkus, terima koin, batal, dan di pintu', () => {
        for (const state of Object.keys(CASHIER_MOTIONS)) {
            expect(cashierMotion(state, 0), state).not.toBeNull();
        }

        expect(cashierMotion('diam', 0)).toBeNull();
        expect(cashierMotion('mengejar', 0)).toBeNull();
    });

    it('saat memindai zombie condong ke depan, ke arah scanner dan pembeli', () => {
        for (let t = 0; t < CASHIER_DURATION.pindai; t += 0.05) {
            expect(cashierMotion('pindai', t)?.transform.lean).toBeLessThan(0);
        }
    });
});

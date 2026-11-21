import { useEffect } from 'react';
import { CellSections, clearCell } from '@/components/diorama/sprite-cells';
import type { Cell, CellSection } from '@/components/diorama/sprite-cells';
import { isoBox } from '@/diorama/render/pixel';
import {
    drawCounterSlice,
    drawStool,
    formatDisplay,
} from '@/diorama/sprites/counter-sprite';
import type { CounterLook } from '@/diorama/sprites/counter-sprite';
import { C } from '@/diorama/sprites/palette';
import {
    loadReferences,
    referenceMatrix,
} from '@/diorama/sprites/reference-loader';
import {
    cashierMotion,
    motionFrame,
    referenceByKey,
    referenceFrameSize,
    transformFrame,
} from '@/diorama/sprites/reference-sprite';
import { SpriteCache } from '@/diorama/sprites/sprite-cache';

const cache = new SpriteCache();

/** Ukuran potongan: dua tile meja, penjaga di belakang, layar di atas. */
const W = 104;
const H = 106;
/** Puncak tile meja kiri (9,6) di dalam potongan. */
const CX = 36;
const TY = 54;

type Step = { state: string; duration: number };

/** Satu siklus melayani, sama dengan urutan penjaga di diorama. */
const SERVE: Step[] = [
    { state: 'diam', duration: 1 },
    { state: 'menyapa', duration: 0.6 },
    { state: 'pindai', duration: 0.45 },
    { state: 'bungkus', duration: 0.25 },
    { state: 'pindai', duration: 0.45 },
    { state: 'bungkus', duration: 0.25 },
    { state: 'terima_koin', duration: 0.9 },
    { state: 'diam', duration: 1.6 },
];
const CANCEL: Step[] = [
    { state: 'diam', duration: 1 },
    { state: 'batal', duration: 1.2 },
    { state: 'diam', duration: 1.6 },
];

function stepAt(steps: Step[], time: number) {
    const total = steps.reduce((sum, s) => sum + s.duration, 0);
    let t = time % total;

    for (let i = 0; i < steps.length; i++) {
        if (t < steps[i].duration) {
            return {
                index: i,
                ...steps[i],
                stateTime: t,
                progress: t / steps[i].duration,
            };
        }

        t -= steps[i].duration;
    }

    return { index: 0, ...steps[0], stateTime: 0, progress: 0 };
}

/** Angka harian yang menghitung naik/turun selama `ease` detik setelah titik ubah. */
function easedTotal(
    from: number,
    to: number,
    sinceChange: number,
    ease = 0.6,
): number {
    if (sinceChange <= 0) {
        return from;
    }

    return from + (to - from) * Math.min(1, sinceChange / ease);
}

function drawFloor(ctx: CanvasRenderingContext2D) {
    // Dua tile lantai di bawah meja dan satu di bawah penjaga.
    isoBox(ctx, CX, TY, 32, 32, 0, C(5), null, null);
    isoBox(ctx, CX + 32, TY + 16, 32, 32, 0, C(9), null, null);
    isoBox(ctx, CX + 32, TY - 16, 32, 32, 0, C(9), null, null);
}

function drawZombie(
    ctx: CanvasRenderingContext2D,
    state: string,
    stateTime: number,
) {
    const zombie = referenceByKey('zombie');
    const src = referenceMatrix('zombie');

    if (!zombie || !src) {
        return;
    }

    const serving = cashierMotion(state, stateTime);
    const frame = serving ? serving.frame : Math.floor(stateTime * 2) % 2;
    const canvas = cache.get(`lab-kasir|zombie|${state}|${frame}`, () =>
        transformFrame(
            src,
            serving ? serving.transform : motionFrame(zombie, 'diam', frame),
        ),
    );
    const size = referenceFrameSize(src);
    // Penjaga berdiri di tengah tile (9,5): puncak tile + setengah tinggi tile.
    const footX = CX + 32;
    const footY = TY - 16 + 16;
    ctx.globalAlpha = 0.25;
    isoBox(ctx, footX, footY - 6, 12, 12, 0, C(2), null, null);
    ctx.globalAlpha = 1;
    ctx.drawImage(canvas, footX - size.footX, footY - size.footY);
}

function drawCounter(ctx: CanvasRenderingContext2D, look: CounterLook) {
    drawCounterSlice(ctx, CX, TY, 'kiri', look);
    drawCounterSlice(ctx, CX + 32, TY + 16, 'kanan', look);
}

const BEFORE = 312_500;
const SALE = 23_500;

function serveCell(): Cell {
    return {
        key: 'kasir-melayani',
        label: 'Kasir 1 melayani: sapa, pindai ×2 (laser, barang meluncur, bip), bungkus, terima koin (layar kuning, struk); lalu total harian naik',
        width: W,
        height: H,
        draw: (ctx, time) => {
            clearCell(ctx, W, H);
            const step = stepAt(SERVE, time);
            const paidAt =
                SERVE.slice(0, 6).reduce((sum, s) => sum + s.duration, 0) +
                SERVE[6].duration;
            const total = SERVE.reduce((sum, s) => sum + s.duration, 0);
            const since = (time % total) - paidAt;
            const paying = step.state === 'terima_koin';
            const daily =
                step.index >= 7
                    ? easedTotal(BEFORE, BEFORE + SALE, since)
                    : BEFORE;

            drawFloor(ctx);
            drawZombie(ctx, step.state, step.stateTime);
            drawCounter(ctx, {
                on: true,
                scan: step.state === 'pindai' ? step.progress : null,
                beep: step.state === 'bungkus',
                receipt: paying ? step.progress : null,
                display: paying
                    ? { text: formatDisplay(SALE), mode: 'belanja' }
                    : { text: formatDisplay(daily), mode: 'harian' },
            });
        },
    };
}

function cancelCell(): Cell {
    return {
        key: 'kasir-batal',
        label: 'Pembatalan: penjaga menggeleng, total harian turun',
        width: W,
        height: H,
        draw: (ctx, time) => {
            clearCell(ctx, W, H);
            const step = stepAt(CANCEL, time);
            const total = CANCEL.reduce((sum, s) => sum + s.duration, 0);
            const since = (time % total) - CANCEL[0].duration;
            const daily =
                step.index >= 1
                    ? easedTotal(BEFORE + SALE, BEFORE, since)
                    : BEFORE + SALE;

            drawFloor(ctx);
            drawZombie(ctx, step.state, step.stateTime);
            drawCounter(ctx, {
                on: true,
                scan: null,
                beep: false,
                receipt: null,
                display: { text: formatDisplay(daily), mode: 'harian' },
            });
        },
    };
}

function closedCell(): Cell {
    return {
        key: 'kasir-tutup',
        label: 'Kasir 2 tutup: komputer mati, layar TUTUP, bangku kosong',
        width: W,
        height: H,
        draw: (ctx) => {
            clearCell(ctx, W, H);
            drawFloor(ctx);
            // Bangku di (9,2) = di belakang meja kasir 2 (9,3).
            drawStool(ctx, CX + 32, TY - 16);
            drawCounter(ctx, {
                on: false,
                scan: null,
                beep: false,
                receipt: null,
                display: { text: 'TUTUP', mode: 'harian' },
            });
        },
    };
}

function displayCell(): Cell {
    const values = [0, 113_000, 999_999, 1_250_000, 12_500_000, 125_000_000];

    return {
        key: 'kasir-layar',
        label: 'Layar mini: 0, 113.000, 999.999, 1,2JT, 12,5JT, 125JT (berganti tiap detik)',
        width: W,
        height: H,
        draw: (ctx, time) => {
            clearCell(ctx, W, H);
            const value = values[Math.floor(time) % values.length];
            drawFloor(ctx);
            drawCounter(ctx, {
                on: true,
                scan: null,
                beep: false,
                receipt: null,
                display: { text: formatDisplay(value), mode: 'harian' },
            });
        },
    };
}

const SECTIONS: CellSection[] = [
    {
        title: 'Meja kasir, scanner, dan layar mini (perbesaran 4×)',
        note: 'Hanya palet 24 warna. Laser memakai bata pastel dengan pendar merah muda karena palet tidak punya merah terang. Layar mini hijau = total harian (menghitung naik/turun mengikuti total nyata), kuning = total belanja saat membayar.',
        cells: [serveCell(), cancelCell(), closedCell(), displayCell()],
    },
];

/** Pratinjau elemen meja kasir (Tahap 5C elemen 2). */
export default function CounterLab() {
    useEffect(() => {
        void loadReferences();
    }, []);

    return <CellSections sections={SECTIONS} />;
}

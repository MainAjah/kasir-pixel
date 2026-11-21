import { useEffect, useState } from 'react';
import { CellSections, clearCell } from '@/components/diorama/sprite-cells';
import type { Cell, CellSection } from '@/components/diorama/sprite-cells';
import { isoBox } from '@/diorama/render/pixel';
import {
    FRAME_COUNT,
    FRAME_H,
    FRAME_W,
    buildCustomerFrame,
    frameAt,
} from '@/diorama/sprites/customer-sprite';
import type { CustomerAction } from '@/diorama/sprites/customer-sprite';
import { C } from '@/diorama/sprites/palette';
import {
    loadReferences,
    referenceMatrix,
} from '@/diorama/sprites/reference-loader';
import {
    PAD_TOP,
    PAD_X,
    REFERENCE_CHARACTERS,
    mapToPalette,
    motionFrame,
    reduceColors,
    referenceByKey,
    referenceFrameSize,
    transformFrame,
} from '@/diorama/sprites/reference-sprite';
import type { ReferenceCharacter } from '@/diorama/sprites/reference-sprite';
import { RACK_CANVAS, drawRackSlice } from '@/diorama/sprites/rack-sprite';
import { SpriteCache } from '@/diorama/sprites/sprite-cache';

const cache = new SpriteCache();

const ACTION_LABEL: Record<CustomerAction, string> = {
    diam: 'Diam',
    jalan: 'Jalan',
    lari: 'Lari',
    ambil: 'Ambil barang',
};

function character(key: string): ReferenceCharacter {
    const found = referenceByKey(key);

    if (!found) {
        throw new Error(`Karakter tidak dikenal: ${key}`);
    }

    return found;
}

/** Ruang di bawah kaki untuk bayangan. */
const SHADOW_ROOM = 4;

const frameSize = (c: ReferenceCharacter) => ({
    width: c.size[0] + PAD_X * 2,
    height: c.size[1] + PAD_TOP + c.hover + SHADOW_ROOM,
});

/** Bingkai karakter dari gambar asli + transformasi, dalam arah aslinya. */
function referenceCanvas(
    c: ReferenceCharacter,
    action: CustomerAction,
    frame: number,
): HTMLCanvasElement | null {
    const src = referenceMatrix(c.key);

    if (!src) {
        return null;
    }

    return cache.get(`lab-ref|${c.key}|${action}|${frame}`, () =>
        transformFrame(src, motionFrame(c, action, frame)),
    );
}

/** Bayangan di lantai, lebih kecil saat tokoh terangkat. */
function shadow(
    ctx: CanvasRenderingContext2D,
    footX: number,
    footY: number,
    width: number,
): void {
    const s = Math.max(8, Math.min(24, Math.round(width * 0.45)));
    ctx.globalAlpha = 0.25;
    isoBox(ctx, footX, footY - Math.floor(s / 2), s, s, 0, C(2), null, null);
    ctx.globalAlpha = 1;
}

function drawReference(
    ctx: CanvasRenderingContext2D,
    c: ReferenceCharacter,
    action: CustomerAction,
    frame: number,
    x: number,
    bottom: number,
): void {
    const canvas = referenceCanvas(c, action, frame);

    if (!canvas) {
        return;
    }

    const src = referenceMatrix(c.key);
    const footX = x + (src ? referenceFrameSize(src).footX : canvas.width / 2);
    shadow(ctx, footX, bottom, c.size[0]);
    ctx.drawImage(canvas, x, bottom - canvas.height + 1 - c.hover);
}

function actionCells(key: string, actions: CustomerAction[]): Cell[] {
    const c = character(key);
    const { width, height } = frameSize(c);
    const cells: Cell[] = [];
    const gap = 2;

    for (const action of actions) {
        const frames = FRAME_COUNT[action];

        cells.push({
            key: `ref-${key}-${action}`,
            label: ACTION_LABEL[action],
            width,
            height,
            draw: (ctx, time) => {
                clearCell(ctx, width, height);
                drawReference(
                    ctx,
                    c,
                    action,
                    frameAt(action, time),
                    0,
                    height - SHADOW_ROOM,
                );
            },
        });

        const stripWidth = frames * (width + gap);
        cells.push({
            key: `ref-${key}-${action}-strip`,
            label: `${frames} bingkai`,
            width: stripWidth,
            height,
            draw: (ctx) => {
                clearCell(ctx, stripWidth, height);

                for (let f = 0; f < frames; f++) {
                    drawReference(
                        ctx,
                        c,
                        action,
                        f,
                        f * (width + gap),
                        height - SHADOW_ROOM,
                    );
                }
            },
        });
    }

    return cells;
}

/** Semua karakter berdiri di satu garis lantai, bersama pelanggan buatan kode dan rak. */
function scaleCell(): Cell {
    const gap = 4;
    const refs = REFERENCE_CHARACTERS;
    const width =
        refs.reduce((sum, c) => sum + c.size[0] + gap, 0) +
        FRAME_W +
        gap +
        RACK_CANVAS.width +
        gap * 2;
    const height = 76;
    const floor = height - 4;

    return {
        key: 'skala',
        label: 'Kiri ke kanan: delapan karakter, pelanggan buatan kode, potongan rak',
        width,
        height,
        draw: (ctx) => {
            clearCell(ctx, width, height);
            ctx.fillStyle = C(8);
            ctx.fillRect(0, floor + 1, width, 1);
            let x = gap;

            for (const c of refs) {
                const src = referenceMatrix(c.key);

                if (src) {
                    const canvas = cache.get(
                        `lab-ref|${c.key}|asli`,
                        () => src,
                    );
                    ctx.drawImage(canvas, x, floor - src.height + 1 - c.hover);
                }

                x += c.size[0] + gap;
            }

            const customer = cache.get('lab-skala-pelanggan', () =>
                buildCustomerFrame(
                    { skin: 0, hair: 0, shirt: 0, pants: 0 },
                    'depan',
                    'diam',
                    0,
                ),
            );
            ctx.drawImage(customer, x, floor - FRAME_H + 1);
            x += FRAME_W + gap;

            const rack = cache.getDrawn(
                'lab-skala-rak',
                RACK_CANVAS.width,
                RACK_CANVAS.height,
                (r) =>
                    drawRackSlice(
                        r,
                        RACK_CANVAS.originX,
                        RACK_CANVAS.originY,
                        'penuh',
                        3,
                    ),
            );
            // Pojok depan rak berdiri di garis lantai.
            ctx.drawImage(rack, x, floor - RACK_CANVAS.height + 1);
        },
    };
}

/** Asli, dirapikan ke 16 warna, dan dipaksa ke palet 24 warna. */
function colorCells(keys: string[]): Cell[] {
    return keys.map((key) => {
        const c = character(key);
        const gap = 4;
        const width = c.size[0] * 3 + gap * 4;
        const height = c.size[1] + gap * 2;

        return {
            key: `warna-${key}`,
            label: `${c.title}: asli, 16 warna, palet 24`,
            width,
            height,
            draw: (ctx) => {
                clearCell(ctx, width, height);
                const src = referenceMatrix(key);

                if (!src) {
                    return;
                }

                const versions = [
                    cache.get(`lab-warna|${key}|asli`, () => src),
                    cache.get(`lab-warna|${key}|16`, () =>
                        reduceColors(src, 16),
                    ),
                    cache.get(`lab-warna|${key}|palet`, () =>
                        mapToPalette(src),
                    ),
                ];

                versions.forEach((canvas, i) =>
                    ctx.drawImage(canvas, gap + i * (c.size[0] + gap), gap),
                );
            },
        };
    });
}

const SECTIONS: CellSection[] = [
    {
        title: 'Zombie, penjaga kasir (cara 1): diam, jalan, dan lari untuk adegan kejar',
        note: 'Menyeret badan sambil condong ke depan; saat lari condong lebih jauh dan terangkat sesaat. Di diorama, penjaga kini memakai zombie ini.',
        cells: actionCells('zombie', ['diam', 'jalan', 'lari']),
    },
    {
        title: 'Ninja berjubah awan merah (cara 1)',
        note: 'Jubah menutupi kaki, jadi goyangan dan naik-turun cukup meyakinkan.',
        cells: actionCells('ninja', ['diam', 'jalan', 'lari', 'ambil']),
    },
    {
        title: 'Bajak laut berompi merah (cara 1)',
        note: 'Kaki terbuka lebar dalam kuda-kuda; saat berjalan bisa terlihat meluncur. Calon untuk cara 2 bila terlihat kaku.',
        cells: actionCells('bajak_laut', ['diam', 'jalan', 'lari', 'ambil']),
    },
    {
        title: 'Ukuran terhadap skala diorama (perbesaran 2×)',
        cells: [scaleCell()],
        scale: 2,
    },
    {
        title: 'Warna (perbesaran 4×)',
        note: 'Kiri ke kanan: asli, dirapikan ke 16 warna, dipaksa ke palet 24 warna.',
        cells: colorCells(['zombie', 'ninja', 'bajak_laut']),
    },
];

/** Pratinjau karakter dari gambar pemilik (Tahap 5C langkah 2) dengan perbesaran 4×. */
export default function ReferenceLab() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let active = true;
        void loadReferences().then(() => {
            if (active) {
                setLoaded(true);
            }
        });

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-2">
            {!loaded && (
                <p className="text-sm text-muted-foreground">Memuat gambar…</p>
            )}
            <CellSections sections={SECTIONS} />
        </div>
    );
}

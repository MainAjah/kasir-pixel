import { CellSections, clearCell } from '@/components/diorama/sprite-cells';
import type { Cell, CellSection } from '@/components/diorama/sprite-cells';
import { isoBox } from '@/diorama/render/pixel';
import {
    CUSTOMER_ACTIONS,
    FRAME_COUNT,
    FRAME_H,
    FRAME_W,
    buildCustomerFrame,
    frameAt,
    variantKey,
} from '@/diorama/sprites/customer-sprite';
import type {
    CustomerAction,
    CustomerVariant,
    SpriteSide,
} from '@/diorama/sprites/customer-sprite';
import { C } from '@/diorama/sprites/palette';
import { mirror } from '@/diorama/sprites/pixels';
import {
    RACK_CANVAS,
    RACK_FILLS,
    drawRackSlice,
} from '@/diorama/sprites/rack-sprite';
import { SpriteCache } from '@/diorama/sprites/sprite-cache';

const ACTION_LABEL: Record<CustomerAction, string> = {
    diam: 'Diam',
    jalan: 'Jalan',
    lari: 'Lari',
    ambil: 'Ambil barang',
};
const SIDE_LABEL: Record<SpriteSide, string> = {
    depan: 'depan',
    belakang: 'belakang',
};

const BASE: CustomerVariant = { skin: 0, hair: 0, shirt: 0, pants: 0 };
const VARIANTS: CustomerVariant[] = Array.from({ length: 7 }, (_, k) => ({
    skin: k % 3,
    hair: k,
    shirt: (k + 1) % 7,
    pants: k % 4,
}));

const cache = new SpriteCache();

function frameCanvas(
    variant: CustomerVariant,
    side: SpriteSide,
    action: CustomerAction,
    frame: number,
    flip = false,
): HTMLCanvasElement {
    return cache.get(
        `lab|${variantKey(variant)}|${side}|${action}|${frame}|${flip ? 1 : 0}`,
        () => {
            const m = buildCustomerFrame(variant, side, action, frame);

            return flip ? mirror(m) : m;
        },
    );
}

function customerCells(): Cell[] {
    const cells: Cell[] = [];
    const sides: SpriteSide[] = ['depan', 'belakang'];
    const gap = 3;

    for (const side of sides) {
        for (const action of CUSTOMER_ACTIONS) {
            const frames = FRAME_COUNT[action];
            const width = FRAME_W + 4;
            const height = FRAME_H + 4;

            cells.push({
                key: `anim-${side}-${action}`,
                label: `${ACTION_LABEL[action]}, ${SIDE_LABEL[side]}`,
                width,
                height,
                draw: (ctx, time) => {
                    clearCell(ctx, width, height);
                    const frame = frameAt(action, time);
                    ctx.drawImage(frameCanvas(BASE, side, action, frame), 2, 2);
                },
            });

            const stripWidth = frames * (FRAME_W + gap) + gap;
            cells.push({
                key: `strip-${side}-${action}`,
                label: `${frames} bingkai`,
                width: stripWidth,
                height,
                draw: (ctx) => {
                    clearCell(ctx, stripWidth, height);

                    for (let f = 0; f < frames; f++) {
                        ctx.drawImage(
                            frameCanvas(BASE, side, action, f),
                            gap + f * (FRAME_W + gap),
                            2,
                        );
                    }
                },
            });
        }
    }

    return cells;
}

function variantCells(): Cell[] {
    return VARIANTS.map((variant, k) => {
        const width = FRAME_W + 4;
        const height = FRAME_H + 4;

        return {
            key: `variant-${k}`,
            label: `Variasi ${k + 1}`,
            width,
            height,
            draw: (ctx, time) => {
                clearCell(ctx, width, height);
                const frame = frameAt('jalan', time, k * 0.5);
                ctx.drawImage(
                    frameCanvas(variant, 'depan', 'jalan', frame, k % 2 === 1),
                    2,
                    2,
                );
            },
        };
    });
}

const RACK_LABEL = {
    kosong: 'Kosong',
    sedikit: 'Sedikit',
    setengah: 'Setengah',
    penuh: 'Penuh',
} as const;

function rackCells(): Cell[] {
    const width = RACK_CANVAS.width + 8;
    const height = RACK_CANVAS.height + 6;

    return RACK_FILLS.map((fill) => ({
        key: `rack-${fill}`,
        label: `Rak, isi ${RACK_LABEL[fill].toLowerCase()}`,
        width,
        height,
        draw: (ctx) => {
            clearCell(ctx, width, height);
            const ox = 4 + RACK_CANVAS.originX;
            const oy = 2 + RACK_CANVAS.originY;
            // Tile lantai di bawah rak sebagai alas.
            isoBox(ctx, ox, oy, 32, 32, 0, C(7), null, null);
            ctx.drawImage(
                cache.getDrawn(
                    `lab-rak|${fill}`,
                    RACK_CANVAS.width,
                    RACK_CANVAS.height,
                    (c) =>
                        drawRackSlice(
                            c,
                            RACK_CANVAS.originX,
                            RACK_CANVAS.originY,
                            fill,
                            3,
                        ),
                ),
                4,
                2,
            );
        },
    }));
}

const SECTIONS: CellSection[] = [
    {
        title: 'Pelanggan: depan dan belakang (perbesaran 4×)',
        cells: customerCells(),
    },
    {
        title: 'Variasi lewat tukar palet: kulit, rambut, baju, celana',
        cells: variantCells(),
    },
    {
        title: 'Potongan rak: empat tingkat isi (perbesaran 4×)',
        cells: rackCells(),
    },
];

/** Pratinjau sprite buatan kode 5C (langkah 1, disetujui) dengan perbesaran 4×. */
export default function SpriteLab() {
    return <CellSections sections={SECTIONS} />;
}

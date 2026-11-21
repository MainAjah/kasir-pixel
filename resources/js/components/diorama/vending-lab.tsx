import { CellSections } from '@/components/diorama/sprite-cells';
import type { Cell, CellSection } from '@/components/diorama/sprite-cells';
import { isoBox } from '@/diorama/render/pixel';
import { C } from '@/diorama/sprites/palette';
import { RACK_FILLS } from '@/diorama/sprites/rack-sprite';
import type { RackFill } from '@/diorama/sprites/rack-sprite';
import { SpriteCache } from '@/diorama/sprites/sprite-cache';
import {
    VENDING_CANVAS,
    drawVending,
    vendingLightOn,
} from '@/diorama/sprites/vending-sprite';
import type { VendingColor } from '@/diorama/sprites/vending-sprite';

const cache = new SpriteCache();

/** Latar seperti di diorama: dinding biru langit di belakang mesin. */
function wall(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = C(18);
    ctx.fillRect(0, 0, width, height);
}

function vendingCanvas(color: VendingColor, fill: RackFill, on: boolean) {
    return cache.getDrawn(
        `lab-vending|${color}|${fill}|${on ? 1 : 0}`,
        VENDING_CANVAS.width,
        VENDING_CANVAS.height,
        (ctx) =>
            drawVending(
                ctx,
                VENDING_CANVAS.originX,
                VENDING_CANVAS.originY,
                color,
                fill,
                on,
            ),
    );
}

/** Satu mesin di atas satu tile lantai, lampunya berkedip pelan. */
function machineCell(
    key: string,
    label: string,
    color: VendingColor,
    fill: RackFill,
): Cell {
    const width = VENDING_CANVAS.width + 12;
    const height = VENDING_CANVAS.height + 8;
    const cx = VENDING_CANVAS.originX + 6;
    const ty = VENDING_CANVAS.originY + 2;

    return {
        key,
        label,
        width,
        height,
        draw: (ctx, time) => {
            wall(ctx, width, height);
            isoBox(ctx, cx, ty, 32, 32, 0, C(9), null, null);
            ctx.drawImage(
                vendingCanvas(color, fill, vendingLightOn(time, color)),
                cx - VENDING_CANVAS.originX,
                ty - VENDING_CANVAS.originY,
            );
        },
    };
}

/** Tiga mesin berjajar menempel dinding, seperti di denah (7,0), (8,0), (9,0). */
function rowCell(): Cell {
    const width = 140;
    const height = 154;
    // Puncak tile (7,0); tile berikutnya ke kanan-bawah (+32, +16).
    const cx = 30;
    const ty = 86;

    return {
        key: 'vending-jajar',
        label: 'Berjajar di dinding: merah, biru, hijau; lampu berkedip bergantian',
        width,
        height,
        draw: (ctx, time) => {
            wall(ctx, width, height);

            for (const color of [0, 1, 2] as VendingColor[]) {
                const x = cx + color * 32;
                const y = ty + color * 16;
                isoBox(
                    ctx,
                    x,
                    y,
                    32,
                    32,
                    0,
                    color % 2 ? C(5) : C(9),
                    null,
                    null,
                );
            }

            for (const color of [0, 1, 2] as VendingColor[]) {
                const x = cx + color * 32;
                const y = ty + color * 16;
                ctx.drawImage(
                    vendingCanvas(color, 'penuh', vendingLightOn(time, color)),
                    x - VENDING_CANVAS.originX,
                    y - VENDING_CANVAS.originY,
                );
            }
        },
    };
}

const FILL_LABEL: Record<RackFill, string> = {
    kosong: 'kosong (0 botol per baris)',
    sedikit: 'sedikit (1 botol per baris)',
    setengah: 'setengah (3 botol per baris)',
    penuh: 'penuh (5 botol per baris)',
};

const SECTIONS: CellSection[] = [
    {
        title: 'Vending machine: tiga warna, lampu berkedip pelan (perbesaran 4×)',
        note: 'Papan nama MINUM dan lampu di atas kaca menyala (kuning lampu) lalu redup (krem) tiap 1,2 detik; tiap mesin punya fase sendiri. Hanya palet 24 warna.',
        cells: [rowCell()],
    },
    {
        title: 'Isi botol empat tingkat menurut stok (perbesaran 4×)',
        note: 'Di diorama sementara penuh; isi menurut stok nyata dihubungkan di 5D.',
        cells: RACK_FILLS.map((fill) =>
            machineCell(
                `vending-isi-${fill}`,
                `Isi ${FILL_LABEL[fill]}`,
                0,
                fill,
            ),
        ),
    },
];

/** Pratinjau elemen vending machine (Tahap 5C elemen 3). */
export default function VendingLab() {
    return <CellSections sections={SECTIONS} />;
}

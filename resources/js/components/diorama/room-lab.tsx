import { CellSections } from '@/components/diorama/sprite-cells';
import type { Cell, CellSection } from '@/components/diorama/sprite-cells';
import { CANVAS_H, CANVAS_W } from '@/diorama/engine/iso';
import { STORE_SCENE } from '@/diorama/scenes/store-scene';
import { drawRoom } from '@/diorama/sprites/room-sprite';
import { SpriteCache } from '@/diorama/sprites/sprite-cache';

const cache = new SpriteCache();

/** Ruangan utuh (skema langit dan lavender), dirender sekali. */
function roomCanvas(): HTMLCanvasElement {
    return cache.getDrawn('ruang', CANVAS_W, CANVAS_H, (ctx) =>
        drawRoom(ctx, STORE_SCENE, CANVAS_W, CANVAS_H),
    );
}

type Crop = {
    key: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

const CROPS: Crop[] = [
    {
        key: 'pintu',
        label: 'Sudut pintu: dinding, list, plint, pintu kaca, keset',
        x: 40,
        y: 100,
        w: 136,
        h: 150,
    },
    {
        key: 'depan',
        label: 'Sudut depan: lantai, karpet antrean, alas diorama',
        x: 330,
        y: 300,
        w: 136,
        h: 132,
    },
];

const SECTIONS: CellSection[] = [
    {
        title: 'Lantai, dinding, dan pintu: langit dan lavender (perbesaran 4×)',
        note: 'Dinding lavender (berpintu) dan biru langit, list putih, plint dan alas hijau, lantai mint dan krem. Hanya palet 24.',
        cells: CROPS.map((crop): Cell => ({
            key: `ruang-${crop.key}`,
            label: crop.label,
            width: crop.w,
            height: crop.h,
            draw: (ctx) =>
                ctx.drawImage(
                    roomCanvas(),
                    crop.x,
                    crop.y,
                    crop.w,
                    crop.h,
                    0,
                    0,
                    crop.w,
                    crop.h,
                ),
        })),
    },
];

/** Lantai, dinding, dan pintu yang disetujui (Tahap 5C elemen 1). */
export default function RoomLab() {
    return <CellSections sections={SECTIONS} />;
}

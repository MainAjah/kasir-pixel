import { useMemo } from 'react';
import { CellSections, clearCell } from '@/components/diorama/sprite-cells';
import type { Cell, CellSection } from '@/components/diorama/sprite-cells';
import { Button } from '@/components/ui/button';
import { CANVAS_H, CANVAS_W } from '@/diorama/engine/iso';
import { DioramaWorld } from '@/diorama/engine/world';
import { NIGHT_ALPHA, wallGlow } from '@/diorama/render/lighting';
import { isoBox } from '@/diorama/render/pixel';
import { PlaceholderRenderer } from '@/diorama/render/placeholder-renderer';
import { STORE_SCENE } from '@/diorama/scenes/store-scene';
import {
    CLOCK_TIME,
    NIGHT_STRENGTH,
    PAINTINGS,
    TIMES_OF_DAY,
    clockMatrix,
    drawPlant,
    lampMatrix,
    windowMatrix,
} from '@/diorama/sprites/decor-sprite';
import type { PaintingKey, TimeOfDay } from '@/diorama/sprites/decor-sprite';
import { C } from '@/diorama/sprites/palette';
import type { PixelMatrix } from '@/diorama/sprites/pixels';
import { SpriteCache } from '@/diorama/sprites/sprite-cache';

const cache = new SpriteCache();

export const TIME_LABEL: Record<TimeOfDay, string> = {
    siang: 'Siang',
    senja: 'Senja',
    malam: 'Malam',
};

const PAINTING_LABEL: Record<PaintingKey, string> = {
    gunung: 'Gunung dan sawah',
    laut: 'Laut senja',
    buah: 'Buah di mangkuk',
    bunga: 'Bunga dalam vas',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Satu gambar datar di tengah sel, dengan latar polos. */
function matrixCell(
    key: string,
    label: string,
    make: () => PixelMatrix,
    background = C(5),
): Cell {
    const m = make();
    const width = m.width + 8;
    const height = m.height + 8;

    return {
        key,
        label,
        width,
        height,
        draw: (ctx) => {
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(cache.get(key, make), 4, 4);
        },
    };
}

/** Lampu dinding di dinding biru yang diredupkan lapisan malam, dengan pendarnya. */
function litLampCell(): Cell {
    const width = 48;
    const height = 40;

    return {
        key: 'hiasan-lampu-nyala',
        label: 'Lampu menyala di malam hari: bola kuning dan lingkaran cahaya hangat di dinding',
        width,
        height,
        draw: (ctx) => {
            ctx.fillStyle = C(18);
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = NIGHT_ALPHA;
            ctx.fillStyle = C(24);
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1;
            wallGlow(ctx, 24, 18, 15, 0, C(11), 0.1);
            wallGlow(ctx, 24, 17, 9, 0, C(11), 0.14);
            ctx.drawImage(
                cache.get('hiasan-lampu-1', () => lampMatrix(true)),
                21,
                8,
            );
            wallGlow(ctx, 24, 15, 2, 0, C(11), 0.45);
        },
    };
}

function plantCell(time: TimeOfDay): Cell {
    const width = 76;
    const height = 60;
    const cx = 38;
    const ty = 22;

    return {
        key: `hiasan-tanaman-${time}`,
        label: `Tanaman pot (${TIME_LABEL[time].toLowerCase()})`,
        width,
        height,
        draw: (ctx) => {
            clearCell(ctx, width, height);
            isoBox(ctx, cx, ty, 32, 32, 0, C(9), null, null);
            drawPlant(ctx, cx, ty);

            const strength = NIGHT_STRENGTH[time];

            if (strength > 0) {
                ctx.globalAlpha = NIGHT_ALPHA * strength;
                ctx.fillStyle = C(24);
                ctx.fillRect(0, 0, width, height);
                ctx.globalAlpha = 1;
            }
        },
    };
}

// ---- Potongan diorama sungguhan (renderer yang sama dengan diorama di bawah) ----------

const labWorld = new DioramaWorld({ seed: 5, dailyTotal: 312_500 });
const labRenderer = new PlaceholderRenderer(STORE_SCENE);
const frames = new Map<TimeOfDay, { canvas: HTMLCanvasElement; t: number }>();
let lastT = 0;

/** Diorama tanpa pelanggan pada waktu ini, digambar sekali per bingkai. */
function sceneAt(time: TimeOfDay, t: number): HTMLCanvasElement {
    if (t !== lastT) {
        labWorld.update(t > lastT ? Math.min(0.1, t - lastT) : 0);
        lastT = t;
    }

    let frame = frames.get(time);

    if (!frame) {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        frame = { canvas, t: -1 };
        frames.set(time, frame);
    }

    if (frame.t !== t) {
        const ctx = frame.canvas.getContext('2d');

        if (ctx) {
            labRenderer.render(ctx, labWorld, { timeOfDay: time });
        }

        frame.t = t;
    }

    return frame.canvas;
}

type Crop = {
    key: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

const WINDOW_CROP: Crop = {
    key: 'jendela',
    label: 'Jendela dan vending machine',
    x: 596,
    y: 150,
    w: 150,
    h: 120,
};

const DOOR_CROP: Crop = {
    key: 'pintu',
    label: 'Pintu kaca dan keset',
    x: 66,
    y: 96,
    w: 130,
    h: 140,
};

const CROPS: Crop[] = [
    {
        key: 'kiri',
        label: 'Dinding kiri: lukisan buah, lukisan bunga, lampu; tanaman di pojok',
        x: 140,
        y: 40,
        w: 210,
        h: 104,
    },
    {
        key: 'kanan',
        label: 'Dinding kanan: lukisan gunung, lukisan laut, jam, lampu',
        x: 356,
        y: 34,
        w: 224,
        h: 112,
    },
    {
        key: 'kasir',
        label: 'Meja kasir 1 dan layar mini; tanaman di samping meja',
        x: 396,
        y: 270,
        w: 180,
        h: 112,
    },
];

function cropCell(crop: Crop, time: TimeOfDay, label: string): Cell {
    return {
        key: `diorama-${crop.key}-${time}`,
        label,
        width: crop.w,
        height: crop.h,
        draw: (ctx, t) =>
            ctx.drawImage(
                sceneAt(time, t),
                crop.x,
                crop.y,
                crop.w,
                crop.h,
                0,
                0,
                crop.w,
                crop.h,
            ),
    };
}

function sections(time: TimeOfDay): CellSection[] {
    return [
        {
            title: 'Jendela: siang, senja, dan malam berbintang (perbesaran 4×)',
            note: 'Kusen kayu bersilang dengan list kunyit. Siang: langit biru, awan, pepohonan. Senja: langit lavender ke kunyit dan matahari terbenam. Malam: langit biru malam, bulan sabit, dan bintang.',
            cells: TIMES_OF_DAY.map((t) =>
                matrixCell(`hiasan-jendela-${t}`, TIME_LABEL[t], () =>
                    windowMatrix(t),
                ),
            ),
        },
        {
            title: 'Pintu kaca: siang, senja, dan malam (perbesaran 4×)',
            note: 'Kaca pintu kini menampilkan pemandangan luar seperti jendela: langit, pepohonan, rumput, dan trotoar. Siang: langit biru berawan. Senja: langit jingga dan matahari terbenam di balik pohon. Malam: langit biru malam berbintang dan siluet pohon. Kusen dan tiang kayu tetap, pantulan kaca meredup di malam hari. Pelanggan yang lewat pintu tetap menutupi kaca.',
            cells: TIMES_OF_DAY.map((t) =>
                cropCell(
                    DOOR_CROP,
                    t,
                    `Pintu (${TIME_LABEL[t].toLowerCase()})`,
                ),
            ),
        },
        {
            title: 'Jam dinding, lampu dinding, dan empat lukisan (perbesaran 4×)',
            note: 'Jarum jam mengikuti waktu yang dipilih (jam browser menyusul di 5D). Lampu dinding baru di 5C: mati di siang hari, menyala di senja dan malam. Lukisan dari rancangan 5A; tiga warna 5A yang di luar palet diganti warna palet.',
            cells: [
                ...TIMES_OF_DAY.map((t) => {
                    const [h, m] = CLOCK_TIME[t];

                    return matrixCell(
                        `hiasan-jam-${t}`,
                        `Jam ${TIME_LABEL[t].toLowerCase()}: ${pad(h)}.${pad(m)}`,
                        () => clockMatrix(h, m),
                    );
                }),
                matrixCell('hiasan-lampu-0', 'Lampu mati (siang)', () =>
                    lampMatrix(false),
                ),
                litLampCell(),
                ...(Object.keys(PAINTINGS) as PaintingKey[]).map((key) =>
                    matrixCell(
                        `hiasan-lukisan-${key}`,
                        PAINTING_LABEL[key],
                        PAINTINGS[key],
                    ),
                ),
            ],
        },
        {
            title: 'Tanaman pot (perbesaran 4×)',
            note: 'Pot terakota berbibir kunyit, rumpun daun rimbun dua warna hijau dengan kilau.',
            cells: [plantCell('siang'), plantCell('malam')],
        },
        {
            title: 'Di diorama: pojok jendela dalam tiga waktu (perbesaran 4×)',
            note: 'Potongan dari renderer diorama yang sama. Senja dan malam memakai lapisan biru malam tembus pandang; kaca jendela dan pintu, lampu, papan nama vending, dan layar mini tetap terang.',
            cells: TIMES_OF_DAY.map((t) =>
                cropCell(
                    WINDOW_CROP,
                    t,
                    `${WINDOW_CROP.label} (${TIME_LABEL[t].toLowerCase()})`,
                ),
            ),
        },
        {
            title: `Di diorama: dinding dan meja kasir saat ${TIME_LABEL[time].toLowerCase()} (perbesaran 4×)`,
            note: 'Ganti waktu dengan tombol Siang, Senja, Malam. Diorama besar di bawah ikut berganti.',
            cells: CROPS.map((crop) => cropCell(crop, time, crop.label)),
        },
    ];
}

/** Tombol pilih waktu: siang, senja, malam. */
export function TimePicker({
    value,
    onChange,
}: {
    value: TimeOfDay;
    onChange: (time: TimeOfDay) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Waktu">
            {TIMES_OF_DAY.map((t) => (
                <Button
                    key={t}
                    size="sm"
                    variant={value === t ? 'default' : 'outline'}
                    aria-pressed={value === t}
                    onClick={() => onChange(t)}
                >
                    {TIME_LABEL[t]}
                </Button>
            ))}
        </div>
    );
}

/** Pratinjau hiasan: tanaman pot, jam, jendela, lukisan, lampu (Tahap 5C elemen 5). */
export default function DecorLab({ time }: { time: TimeOfDay }) {
    const list = useMemo(() => sections(time), [time]);

    return <CellSections sections={list} />;
}

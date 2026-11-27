import { useEffect, useMemo, useRef } from 'react';
import type { AtlasEntry } from '@/diorama/assets/atlas';
import {
    A2_FURNITURE,
    A3_DECOR,
    furnitureEntries,
    storeEntries,
} from '@/diorama/assets/procedural-source';
import { shelfFills } from '@/diorama/engine/shelves';
import { STORE_SCENE } from '@/diorama/scenes/store-scene';
import { paintMatrix } from '@/diorama/sprites/sprite-cache';
import { WORLD } from '@/diorama/three/palette-world';

const LABELS: Record<string, string> = {
    'tex/lantai/walnut': 'Lantai papan walnut (seluruh toko, 12 × 9 ubin)',
    'tex/dinding/kiri': 'Dinding kiri, plester mawar + wainscot',
    'tex/dinding/kanan': 'Dinding kanan, plester ivory + wainscot',
    'tex/dinding/kiri-ujung': 'Ujung dinding kiri',
    'tex/dinding/kanan-ujung': 'Ujung dinding kanan',
    'tex/dinding/kiri-tutup': 'Tutup dinding kiri',
    'tex/dinding/kanan-tutup': 'Tutup dinding kanan',
    'tex/alas/depan-kiri': 'Alas bata, muka depan kiri',
    'tex/alas/depan-kanan': 'Alas bata, muka depan kanan',
    'contoh/marmer': 'Marmer (contoh)',
    'contoh/daun': 'Daun (contoh)',
    'tex/perabot/rak-a/depan':
        'Rak A, muka depan (isi: penuh, setengah, sedikit, penuh, kosong)',
    'tex/perabot/rak-a/kanan': 'Rak A, sisi',
    'tex/perabot/rak-a/atas': 'Rak A, papan atas',
    'tex/perabot/kasir-1/depan': 'Meja kasir, depan',
    'tex/perabot/kasir-1/kanan': 'Meja kasir, sisi',
    'tex/perabot/kasir-1/atas': 'Meja kasir, permukaan marmer',
    'tex/perabot/vending-merah/depan': 'Kulkas, depan (isi setengah)',
    'tex/perabot/vending-merah/kanan': 'Kulkas, sisi',
    'tex/perabot/vending-merah/atas': 'Kulkas, tutup',
    'tex/perabot/tanaman-1/depan': 'Pot, sisi',
    'tex/perabot/tanaman-1/kanan': 'Pot, sisi kanan',
    'tex/perabot/tanaman-1/atas': 'Pot, atas',
    'tex/hiasan/lampu-kanan': 'Lampu dinding kanan (gambar 5C, menyala)',
    'tex/hiasan/lampu-kiri': 'Lampu dinding kiri (gambar 5C, menyala)',
    'tex/hiasan/jendela': 'Jendela senja (gambar 5C), sumber berkas sinar',
};

function Swatch({ entry, scale }: { entry: AtlasEntry; scale: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const { width, height } = entry.matrix;

    useEffect(() => {
        const ctx = ref.current?.getContext('2d');

        if (ctx) {
            ctx.clearRect(0, 0, width, height);
            paintMatrix(ctx, entry.matrix);
        }
    }, [entry, width, height]);

    return (
        <figure className="space-y-1">
            <canvas
                ref={ref}
                width={width}
                height={height}
                className="block border-2 border-px-tinta bg-[repeating-conic-gradient(#d9c7a3_0_25%,#efe2c4_0_50%)] bg-[length:16px_16px]"
                style={{
                    width: width * scale,
                    height: height * scale,
                    imageRendering: 'pixelated',
                }}
            />
            <figcaption className="text-xs text-px-bayangan">
                {LABELS[entry.key] ?? entry.key}, {width} × {height} texel
            </figcaption>
        </figure>
    );
}

/**
 * Lembar tekstur procedural Tahap 5H pada perbesaran 4×, persis matriks yang
 * dikemas ke atlas, beserta palet dunia.
 */
export default function TextureSheet({ scale = 4 }: { scale?: number }) {
    const entries = useMemo(
        () => [
            ...storeEntries(STORE_SCENE),
            ...furnitureEntries(
                STORE_SCENE,
                A2_FURNITURE,
                A3_DECOR,
                shelfFills(
                    {
                        rak: [
                            'penuh',
                            'setengah',
                            'sedikit',
                            'penuh',
                            'kosong',
                        ],
                        vending: ['setengah'],
                    },
                    STORE_SCENE,
                ),
                undefined,
                true,
            ),
        ],
        [],
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start gap-6">
                {entries.map((entry) => (
                    <Swatch key={entry.key} entry={entry} scale={scale} />
                ))}
            </div>

            <section className="space-y-2">
                <h3 className="font-pixel text-lg text-px-tinta">
                    Palet dunia ({Object.keys(WORLD).length} warna)
                </h3>
                <p className="max-w-prose text-sm text-px-bayangan">
                    Khusus tekstur diorama 3D. Palet antarmuka 24 warna tidak
                    berubah.
                </p>
                <ul className="flex flex-wrap gap-1.5">
                    {Object.entries(WORLD).map(([name, color]) => (
                        <li
                            key={name}
                            className="w-16 text-[10px] leading-tight"
                        >
                            <span
                                className="block h-8 border-2 border-px-tinta"
                                style={{ backgroundColor: color }}
                            />
                            <span className="block truncate" title={name}>
                                {name}
                            </span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

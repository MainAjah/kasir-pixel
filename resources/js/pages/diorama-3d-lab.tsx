import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import TextureSheet from '@/components/diorama/texture-sheet';
import ThreeLabStage from '@/components/diorama/three-lab-stage';
import type { StageStats } from '@/components/diorama/three-lab-stage';
import {
    SECONDARY_BUTTON,
    TAB,
    TAB_ACTIVE,
    TAB_IDLE,
} from '@/components/pixel/styles';
import { shelfFills } from '@/diorama/engine/shelves';
import { STORE_SCENE } from '@/diorama/scenes/store-scene';
import type { RackFill } from '@/diorama/sprites/rack-sprite';
import type { Lens, Upscale } from '@/diorama/three/webgl-view';
import { cn } from '@/lib/utils';
import { lab3d } from '@/routes/diorama';

const PITCHES: readonly number[] = [30, 35, 40];
const LENSES: { value: Lens; label: string }[] = [
    { value: 'perspektif', label: 'Perspektif 10°' },
    { value: 'ortografik', label: 'Ortografik' },
];
const UPSCALES: { value: Upscale; label: string }[] = [
    { value: 'nearest', label: 'Nearest murni' },
    { value: 'sharp', label: 'Sharp bilinear' },
];

/** Isi rak contoh untuk lab (bukan data stok; lab tidak membaca data). */
const FILL_PATTERNS: Record<string, readonly RackFill[]> = {
    kosong: ['kosong'],
    sedikit: ['sedikit'],
    setengah: ['setengah'],
    penuh: ['penuh'],
    campur: ['penuh', 'setengah', 'sedikit', 'penuh', 'kosong'],
};
const FILL_CHOICES = [
    { value: 'campur', label: 'Campur' },
    { value: 'kosong', label: 'Kosong' },
    { value: 'sedikit', label: 'Sedikit' },
    { value: 'setengah', label: 'Setengah' },
    { value: 'penuh', label: 'Penuh' },
];

function sampleFills(pattern: string) {
    const levels = FILL_PATTERNS[pattern] ?? FILL_PATTERNS.campur;
    const repeat = (n: number) =>
        Array.from({ length: n }, (_, i) => levels[i % levels.length]);

    return shelfFills({ rak: repeat(10), vending: repeat(3) }, STORE_SCENE);
}

function Choice<T extends string | number>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: readonly { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div className="space-y-1">
            <p className="text-xs text-px-bayangan">{label}</p>
            <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={label}
            >
                {options.map((o) => (
                    <button
                        key={String(o.value)}
                        type="button"
                        aria-pressed={o.value === value}
                        className={cn(
                            TAB,
                            o.value === value ? TAB_ACTIVE : TAB_IDLE,
                        )}
                        onClick={() => onChange(o.value)}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-px-bayangan">{label}</dt>
            <dd className="font-pixel text-base text-px-tinta">{children}</dd>
        </div>
    );
}

/**
 * Lab diorama 3D (Tahap 5H, hanya admin). Prototipe terpisah dari Beranda dan
 * /diorama-lab. Langkah a1: balok toko, kamera miring dengan geser kursor,
 * lembar tekstur 4×. Langkah a2: perabot, lampu dinding, zombie diam, satu
 * pelanggan berjalan dari logika diorama yang ada, dan pilihan cara perbesaran
 * untuk skala pecahan. Belum ada efek cahaya.
 */
export default function Diorama3dLab() {
    const [pitch, setPitch] = useState<number>(30);
    const [lens, setLens] = useState<Lens>('perspektif');
    const [drift, setDrift] = useState(true);
    const [upscale, setUpscale] = useState<Upscale>('nearest');
    const [fillPattern, setFillPattern] = useState('campur');
    const fills = useMemo(() => sampleFills(fillPattern), [fillPattern]);
    const [full, setFull] = useState(false);
    const [stats, setStats] = useState<StageStats | null>(null);
    const onStats = useCallback((s: StageStats) => setStats(s), []);

    useEffect(() => {
        if (!full) {
            return;
        }

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setFull(false);
            }
        };
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);

        return () => {
            document.body.style.overflow = overflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [full]);

    const stage = (
        <ThreeLabStage
            pitchDeg={pitch}
            lens={lens}
            drift={drift}
            upscale={upscale}
            fills={fills}
            onStats={onStats}
            className="size-full bg-[#17213a]"
        />
    );

    return (
        <>
            <Head title="Diorama 3D lab" />

            <div className="space-y-6 p-4">
                <p className="max-w-prose text-sm text-px-bayangan">
                    Prototipe Tahap 5H langkah a2: balok toko 3D dengan rak,
                    meja kasir, kulkas, tanaman, lampu dinding, zombie penjaga,
                    dan satu pembeli pura-pura (hanya animasi, tanpa data).
                    Belum ada efek cahaya. Mode layar penuh menunjukkan ukuran
                    seperti di Beranda; cara perbesaran hanya berpengaruh bila
                    skalanya pecahan.
                </p>

                <div className="flex flex-wrap items-end gap-6">
                    <Choice
                        label="Kemiringan kamera"
                        options={PITCHES.map((p) => ({
                            value: p,
                            label: `${p}°`,
                        }))}
                        value={pitch}
                        onChange={setPitch}
                    />
                    <Choice
                        label="Lensa"
                        options={LENSES}
                        value={lens}
                        onChange={setLens}
                    />
                    <Choice
                        label="Geser mengikuti kursor"
                        options={[
                            { value: 'nyala', label: 'Nyala' },
                            { value: 'mati', label: 'Mati' },
                        ]}
                        value={drift ? 'nyala' : 'mati'}
                        onChange={(v) => setDrift(v === 'nyala')}
                    />
                    <Choice
                        label="Perbesaran skala pecahan"
                        options={UPSCALES}
                        value={upscale}
                        onChange={setUpscale}
                    />
                    <Choice
                        label="Isi rak dan kulkas (contoh)"
                        options={FILL_CHOICES}
                        value={fillPattern}
                        onChange={setFillPattern}
                    />
                    <button
                        type="button"
                        className={cn(SECONDARY_BUTTON, 'h-9 text-sm')}
                        onClick={() => setFull(true)}
                    >
                        Layar penuh
                    </button>
                </div>

                {full ? (
                    // Portal ke <body>: tata letak halaman tidak membatasi
                    // ukuran, jadi sama dengan Beranda (seluruh jendela).
                    createPortal(
                        <div className="fixed inset-0 z-50">
                            {stage}
                            <button
                                type="button"
                                className={cn(
                                    SECONDARY_BUTTON,
                                    'absolute top-3 right-3 h-9 text-sm',
                                )}
                                onClick={() => setFull(false)}
                            >
                                Tutup layar penuh (Esc)
                            </button>
                        </div>,
                        document.body,
                    )
                ) : (
                    <div className="relative h-[70vh] min-h-[420px] border-[3px] border-px-tinta">
                        {stage}
                    </div>
                )}

                {stats && (
                    <dl className="grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
                        <Stat label="Skala tampilan">
                            ×{stats.scale.toFixed(2)}{' '}
                            {stats.integer
                                ? '(bulat)'
                                : stats.upscale === 'sharp'
                                  ? `(pecahan, sharp ×${stats.prescale})`
                                  : '(pecahan, nearest)'}
                        </Stat>
                        <Stat label="Gambar dalam">
                            {stats.internal[0]} × {stats.internal[1]}
                        </Stat>
                        <Stat label="Piksel perangkat">
                            {stats.device[0]} × {stats.device[1]}
                        </Stat>
                        <Stat label="Bingkai per detik">{stats.fps}</Stat>
                        <Stat label="Draw call per bingkai">{stats.calls}</Stat>
                        <Stat label="Segitiga">{stats.triangles}</Stat>
                        <Stat label="Geometri, tekstur di GPU">
                            {stats.geometries}, {stats.textures}
                        </Stat>
                        <Stat label="Sprite, bingkai di atlas karakter">
                            {stats.sprites}, {stats.spriteFrames}
                        </Stat>
                        <Stat label="Geser kamera">
                            {stats.driftActive
                                ? 'aktif'
                                : 'mati (pilihan, gerak dikurangi, atau layar sentuh)'}
                        </Stat>
                    </dl>
                )}

                <section className="space-y-3">
                    <h2 className="font-pixel text-xl text-px-tinta">
                        Lembar tekstur 4×
                    </h2>
                    <TextureSheet />
                </section>
            </div>
        </>
    );
}

Diorama3dLab.layout = {
    breadcrumbs: [{ title: 'Diorama 3D lab', href: lab3d() }],
};

import { useEffect, useRef, useState } from 'react';
import DioramaHud from '@/components/diorama/diorama-hud';
import { startLoop } from '@/diorama/engine/loop';
import type { LoopHandle } from '@/diorama/engine/loop';
import type { ShelfFills } from '@/diorama/engine/shelves';
import type { DioramaWorld } from '@/diorama/engine/world';
import type { Effects } from '@/diorama/three/effects';
import type {
    Lens,
    TierMode,
    Upscale,
    WebGLStats,
    WebGLView,
} from '@/diorama/three/webgl-view';
import { cn } from '@/lib/utils';

export type StageStats = WebGLStats;

type Status = 'memuat' | 'siap' | 'tidak-didukung' | 'gagal' | 'hilang';

const MESSAGES: Record<Exclude<Status, 'siap'>, string> = {
    memuat: 'Memuat diorama 3D…',
    'tidak-didukung':
        'Browser ini tidak mendukung WebGL2. Di Beranda nanti diorama Canvas dipakai otomatis.',
    gagal: 'Diorama 3D gagal dimuat. Muat ulang halaman untuk mencoba lagi.',
    hilang: 'Konteks grafis hilang (driver atau GPU direset). Muat ulang halaman.',
};

/** Jeda (detik) sebelum pelanggan berikutnya masuk setelah toko kosong. */
const RESPAWN_DELAY = 1.5;

export function supportsWebGL2(): boolean {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();

        return gl !== null;
    } catch {
        return false;
    }
}

/**
 * Panggung diorama 3D untuk lab Tahap 5H. three.js dimuat dengan import()
 * dinamis (potongan terpisah). Loop 30 FPS yang sama dengan Canvas
 * (`startLoop`, berhenti saat tab tersembunyi).
 *
 * Dunia diorama (`DioramaWorld`, sama dengan Beranda) diberikan dari luar,
 * sehingga lab bisa menampilkan Canvas dan 3D pada saat yang sama. Panggung
 * hanya memajukan dunia bila `driveWorld` dan tidak dibekukan. Satu pembeli
 * pura-pura (`stagePretend`, hanya animasi, tanpa data) masuk lagi setelah
 * toko kosong sebentar.
 */
export default function ThreeLabStage({
    world,
    driveWorld,
    frozen,
    pitchDeg,
    lens,
    drift,
    upscale,
    fills,
    effects,
    tier,
    hud,
    onStats,
    className,
}: {
    world: DioramaWorld;
    driveWorld: boolean;
    frozen: boolean;
    pitchDeg: number;
    lens: Lens;
    drift: boolean;
    upscale: Upscale;
    fills: ShelfFills;
    effects: Effects;
    tier: TierMode;
    hud: boolean;
    onStats?: (stats: StageStats) => void;
    className?: string;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<WebGLView | null>(null);
    const settings = useRef({ pitchDeg, lens, drift, upscale, effects, tier });
    const live = useRef({ fills, driveWorld, frozen });
    const onStatsRef = useRef(onStats);
    const [status, setStatus] = useState<Status>('memuat');
    const [stats, setStats] = useState<StageStats | null>(null);

    useEffect(() => {
        onStatsRef.current = onStats;
    }, [onStats]);

    useEffect(() => {
        live.current = { fills, driveWorld, frozen };
    }, [fills, driveWorld, frozen]);

    useEffect(() => {
        const host = hostRef.current;

        if (!host) {
            return;
        }

        if (!supportsWebGL2()) {
            setStatus('tidak-didukung');

            return;
        }

        let disposed = false;
        let view: WebGLView | null = null;
        let loop: LoopHandle | null = null;
        let observer: ResizeObserver | null = null;
        let timer = 0;

        void import('@/diorama/three/webgl-view')
            .then(async ({ WebGLView: View }) => {
                const v = await View.create(settings.current);

                if (disposed) {
                    v.dispose();

                    return;
                }

                view = v;
                viewRef.current = v;
                v.attach(host);
                v.onLost(() => setStatus('hilang'));
                observer = new ResizeObserver(([entry]) => {
                    const { width, height } = entry.contentRect;
                    v.resize(width, height, window.devicePixelRatio || 1);
                });
                observer.observe(host);
                let idle = 0;
                loop = startLoop((dt) => {
                    const {
                        fills: f,
                        driveWorld: drive,
                        frozen: still,
                    } = live.current;

                    if (drive && !still) {
                        if (
                            world.customers.length === 0 &&
                            world.pending.length === 0
                        ) {
                            idle += dt;

                            if (idle > RESPAWN_DELAY) {
                                world.stagePretend('pembeli');
                                idle = 0;
                            }
                        } else {
                            idle = 0;
                        }

                        world.update(dt);
                    }

                    v.render(world, { fills: f }, still ? 0 : dt);
                });
                timer = window.setInterval(() => {
                    const s = v.stats();
                    setStats(s);
                    onStatsRef.current?.(s);
                }, 500);
                setStatus('siap');
            })
            .catch((error: unknown) => {
                console.error('Diorama 3D gagal dimuat', error);
                setStatus('gagal');
            });

        return () => {
            disposed = true;
            loop?.stop();
            observer?.disconnect();
            window.clearInterval(timer);
            view?.dispose();
            viewRef.current = null;
        };
    }, [world]);

    useEffect(() => {
        settings.current.pitchDeg = pitchDeg;
        viewRef.current?.setPitch(pitchDeg);
    }, [pitchDeg]);

    useEffect(() => {
        settings.current.lens = lens;
        viewRef.current?.setLens(lens);
    }, [lens]);

    useEffect(() => {
        settings.current.drift = drift;
        viewRef.current?.setDrift(drift);
    }, [drift]);

    useEffect(() => {
        settings.current.upscale = upscale;
        viewRef.current?.setUpscale(upscale);
    }, [upscale]);

    useEffect(() => {
        settings.current.effects = effects;
        viewRef.current?.setEffects(effects);
    }, [effects]);

    useEffect(() => {
        settings.current.tier = tier;
        viewRef.current?.setTier(tier);
    }, [tier]);

    return (
        <div className={cn('relative overflow-hidden', className)}>
            <div ref={hostRef} className="absolute inset-0" />
            {hud && stats && status === 'siap' && <DioramaHud stats={stats} />}
            {status !== 'siap' && (
                <p
                    role="status"
                    className="absolute inset-0 grid place-items-center p-6 text-center font-pixel text-base text-px-sorotan"
                >
                    {MESSAGES[status]}
                </p>
            )}
        </div>
    );
}

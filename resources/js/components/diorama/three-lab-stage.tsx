import { useEffect, useRef, useState } from 'react';
import { startLoop } from '@/diorama/engine/loop';
import type { LoopHandle } from '@/diorama/engine/loop';
import { DioramaWorld } from '@/diorama/engine/world';
import type { Lens, WebGLStats, WebGLView } from '@/diorama/three/webgl-view';
import { cn } from '@/lib/utils';

export type StageStats = WebGLStats & { fps: number };

type Status = 'memuat' | 'siap' | 'tidak-didukung' | 'gagal' | 'hilang';

const MESSAGES: Record<Exclude<Status, 'siap'>, string> = {
    memuat: 'Memuat diorama 3D…',
    'tidak-didukung':
        'Browser ini tidak mendukung WebGL2. Di Beranda nanti diorama Canvas dipakai otomatis.',
    gagal: 'Diorama 3D gagal dimuat. Muat ulang halaman untuk mencoba lagi.',
    hilang: 'Konteks grafis hilang (driver atau GPU direset). Muat ulang halaman.',
};

function supportsWebGL2(): boolean {
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
 */
export default function ThreeLabStage({
    pitchDeg,
    lens,
    drift,
    onStats,
    className,
}: {
    pitchDeg: number;
    lens: Lens;
    drift: boolean;
    onStats?: (stats: StageStats) => void;
    className?: string;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<WebGLView | null>(null);
    const settings = useRef({ pitchDeg, lens, drift });
    const onStatsRef = useRef(onStats);
    const [world] = useState(() => new DioramaWorld({ autoBackground: false }));
    const [status, setStatus] = useState<Status>('memuat');

    useEffect(() => {
        onStatsRef.current = onStats;
    }, [onStats]);

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
        let frames = 0;

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
                loop = startLoop((dt) => {
                    v.render(world, {}, dt);
                    frames += 1;
                });
                timer = window.setInterval(() => {
                    onStatsRef.current?.({ ...v.stats(), fps: frames * 2 });
                    frames = 0;
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

    return (
        <div className={cn('relative overflow-hidden', className)}>
            <div ref={hostRef} className="absolute inset-0" />
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

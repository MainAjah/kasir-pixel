import type { WebGLStats } from '@/diorama/three/webgl-view';

const ms = (v: number | null) =>
    v === null ? 'tidak tersedia' : `${v.toFixed(1)} ms`;

/**
 * HUD diorama 3D (Tahap 5H a3), tampil dengan `?hud=1` atau sakelar lab.
 * FPS dari jarak antarbingkai (loop dibatasi 30); CPU = waktu kerja merender
 * satu bingkai; GPU = waktu GPU bila browser mendukung pengukurannya.
 */
export default function DioramaHud({ stats }: { stats: WebGLStats }) {
    const rows: [string, string][] = [
        ['Backend', `${stats.backend} (3D)`],
        ['FPS', stats.fps.toFixed(1)],
        [
            'CPU p50 / p90',
            `${stats.cpu50.toFixed(1)} / ${stats.cpu90.toFixed(1)} ms`,
        ],
        [
            'GPU p50 / p90',
            stats.gpu50 === null
                ? 'tidak tersedia'
                : `${ms(stats.gpu50)} / ${ms(stats.gpu90)}`,
        ],
        ['Draw call', String(stats.calls)],
        ['Segitiga', stats.triangles.toLocaleString('id-ID')],
        [
            'Gambar dalam',
            `${stats.internal[0]} × ${stats.internal[1]}, ×${stats.scale.toFixed(2)}`,
        ],
        [
            'Tingkat',
            `${stats.tier} (${stats.tierMode})${stats.fallback ? ', sarankan Canvas' : ''}`,
        ],
        ['Peta bayangan', stats.shadowMap > 0 ? `${stats.shadowMap}²` : 'mati'],
    ];

    return (
        <dl
            aria-label="Statistik diorama 3D"
            className="pointer-events-none absolute top-3 left-3 z-10 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 border-2 border-px-tinta bg-[#0f1626]/85 px-2.5 py-2 font-mono text-[11px] leading-tight text-[#fdf8f0]"
        >
            {rows.map(([k, v]) => (
                <div key={k} className="contents">
                    <dt className="text-[#c9b6e4]">{k}</dt>
                    <dd>{v}</dd>
                </div>
            ))}
        </dl>
    );
}

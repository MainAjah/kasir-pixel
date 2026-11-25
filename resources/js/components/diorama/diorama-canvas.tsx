import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { screenScale } from '@/diorama/engine/fit';
import { CANVAS_H, CANVAS_W } from '@/diorama/engine/iso';
import type { Point } from '@/diorama/engine/iso';
import { startLoop } from '@/diorama/engine/loop';
import type { DioramaWorld } from '@/diorama/engine/world';
import { backdropColor, vignette } from '@/diorama/render/lighting';
import {
    GLOW_H,
    GLOW_W,
    PlaceholderRenderer,
} from '@/diorama/render/placeholder-renderer';
import type { TimeOfDay } from '@/diorama/sprites/decor-sprite';
import { loadReferences } from '@/diorama/sprites/reference-loader';
import type { RenderOptions } from '@/diorama/render/placeholder-renderer';

type Props = {
    world: DioramaWorld;
    options?: RenderOptions;
    className?: string;
    /**
     * "width" (bawaan): skala kelipatan bulat menurut lebar wadah.
     * "screen": kanvas sebesar mungkin di dalam wadah (lebar dan tinggi), di
     * tengah, dengan sekelilingnya diwarnai sama dengan latar kanvas.
     */
    fit?: 'width' | 'screen';
    /**
     * Mode "screen": lapisan di atas kanvas seukuran kanvas, untuk tombol yang
     * menempel di diorama. Menerima skala tampilan (px layar per px kanvas dasar).
     */
    overlay?: (scale: number) => ReactNode;
    /** Dipanggil tiap bingkai setelah dunia maju (misalnya untuk bunyi). */
    onFrame?: (world: DioramaWorld) => void;
    /** Mode "screen": klik di kanvas, dalam koordinat kanvas dasar. */
    onCanvasClick?: (point: Point) => void;
    /** Mode "screen": apakah titik ini bisa diklik (kursor tangan). */
    isClickable?: (point: Point) => boolean;
};

/** Kepekatan lapisan bloom (Tahap 5F) menurut waktu: halus siang, kuat malam. */
const BLOOM_OPACITY: Record<TimeOfDay, number> = {
    siang: 0.55,
    senja: 0.75,
    malam: 0.9,
};

/** Titik layar → titik kanvas dasar. */
function canvasPoint(event: MouseEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
        x: ((event.clientX - rect.left) / rect.width) * CANVAS_W,
        y: ((event.clientY - rect.top) / rect.height) * CANVAS_H,
    };
}

/**
 * Kanvas diorama 768 × 480 dengan `image-rendering: pixelated`. Mode "width":
 * skala kelipatan bulat menurut lebar wadah; wadah lebih sempit dari 768 px
 * membuat kanvas diperkecil. Mode "screen": lihat `screenScale`. Loop 30 FPS
 * berhenti saat tab tersembunyi.
 */
export default function DioramaCanvas({
    world,
    options,
    className,
    fit = 'width',
    overlay,
    onFrame,
    onCanvasClick,
    isClickable,
}: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glowRef = useRef<HTMLCanvasElement>(null);
    const optionsRef = useRef<RenderOptions | undefined>(options);
    const onFrameRef = useRef(onFrame);
    const [scale, setScale] = useState(fit === 'screen' ? 0 : 1);
    const [pointer, setPointer] = useState(false);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    useEffect(() => {
        onFrameRef.current = onFrame;
    }, [onFrame]);

    useEffect(() => {
        const wrap = wrapRef.current;

        if (!wrap) {
            return;
        }

        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;

            if (fit === 'screen') {
                setScale(
                    screenScale(width, height, window.devicePixelRatio || 1),
                );
            } else {
                setScale(width < CANVAS_W ? 0 : Math.floor(width / CANVAS_W));
            }
        });
        observer.observe(wrap);

        return () => observer.disconnect();
    }, [fit]);

    // Gambar karakter pemilik (zombie penjaga kasir); sebelum termuat dipakai kotak pengganti.
    useEffect(() => {
        void loadReferences();
    }, []);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');

        if (!ctx) {
            return;
        }

        const renderer = new PlaceholderRenderer(world.scene);
        // Mode "screen" (Beranda): kanvas cahaya kecil untuk bloom, digambar ulang
        // hanya bila bagian yang menyala berubah.
        const glow = glowRef.current?.getContext('2d') ?? null;

        const loop = startLoop((dt) => {
            world.update(dt);
            renderer.render(ctx, world, optionsRef.current);

            if (glow) {
                renderer.renderGlow(glow, world, optionsRef.current);
            }

            onFrameRef.current?.(world);
        });

        return () => loop.stop();
    }, [world]);

    if (fit === 'screen') {
        const time = options?.timeOfDay ?? 'siang';

        return (
            <div
                ref={wrapRef}
                className={`overflow-hidden ${className ?? ''}`}
                style={{ backgroundColor: backdropColor(time) }}
            >
                <div className="relative isolate flex size-full items-center justify-center">
                    {/* Vinyet (Tahap 5F): sudut layar lebih gelap, lebih pekat saat malam.
                        Di atas kanvas, di bawah tombol pos; tidak menangkap klik. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 z-[1]"
                        style={{ background: vignette(time) }}
                    />
                    <div
                        className="relative shrink-0"
                        style={{
                            width: CANVAS_W * scale,
                            height: CANVAS_H * scale,
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_W}
                            height={CANVAS_H}
                            className="block size-full"
                            style={{
                                imageRendering: 'pixelated',
                                cursor: pointer ? 'pointer' : undefined,
                            }}
                            onClick={
                                onCanvasClick
                                    ? (event) =>
                                          onCanvasClick(canvasPoint(event))
                                    : undefined
                            }
                            onMouseMove={
                                isClickable
                                    ? (event) =>
                                          setPointer(
                                              isClickable(canvasPoint(event)),
                                          )
                                    : undefined
                            }
                            onMouseLeave={() => setPointer(false)}
                        />
                        {/* Bloom (Tahap 5F): kanvas cahaya ¼ ukuran, diperbesar halus,
                            diburamkan, dan dicampur "screen". Kanvas utama tetap tajam. */}
                        <canvas
                            ref={glowRef}
                            width={GLOW_W}
                            height={GLOW_H}
                            aria-hidden
                            className="pointer-events-none absolute inset-0 size-full"
                            style={{
                                filter: `blur(${Math.max(2, scale * 2.5).toFixed(1)}px)`,
                                mixBlendMode: 'screen',
                                opacity: BLOOM_OPACITY[time],
                            }}
                        />
                        {/* Tilt-shift (Tahap 5F): tepi atas dan bawah sedikit buram. */}
                        <div
                            aria-hidden
                            className="diorama-tilt diorama-tilt-top"
                            style={
                                {
                                    '--tilt-blur': `${Math.max(1, scale * 1.2).toFixed(1)}px`,
                                } as CSSProperties
                            }
                        />
                        <div
                            aria-hidden
                            className="diorama-tilt diorama-tilt-bottom"
                            style={
                                {
                                    '--tilt-blur': `${Math.max(1, scale * 1.2).toFixed(1)}px`,
                                } as CSSProperties
                            }
                        />
                        {overlay && scale > 0 && (
                            <div className="pointer-events-none absolute inset-0 z-[2]">
                                {overlay(scale)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={wrapRef} className={className}>
            <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="block"
                style={{
                    width: scale === 0 ? '100%' : CANVAS_W * scale,
                    imageRendering: 'pixelated',
                }}
            />
        </div>
    );
}

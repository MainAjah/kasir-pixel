import { useEffect, useRef, useState } from 'react';
import { screenScale } from '@/diorama/engine/fit';
import { CANVAS_H, CANVAS_W } from '@/diorama/engine/iso';
import { startLoop } from '@/diorama/engine/loop';
import type { DioramaWorld } from '@/diorama/engine/world';
import { backdropColor } from '@/diorama/render/lighting';
import { PlaceholderRenderer } from '@/diorama/render/placeholder-renderer';
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
};

/**
 * Kanvas diorama 768 × 432 dengan `image-rendering: pixelated`. Mode "width":
 * skala kelipatan bulat menurut lebar wadah; wadah lebih sempit dari 768 px
 * membuat kanvas diperkecil. Mode "screen": lihat `screenScale`. Loop 30 FPS
 * berhenti saat tab tersembunyi.
 */
export default function DioramaCanvas({
    world,
    options,
    className,
    fit = 'width',
}: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const optionsRef = useRef<RenderOptions | undefined>(options);
    const [scale, setScale] = useState(fit === 'screen' ? 0 : 1);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

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
        const loop = startLoop((dt) => {
            world.update(dt);
            renderer.render(ctx, world, optionsRef.current);
        });

        return () => loop.stop();
    }, [world]);

    if (fit === 'screen') {
        return (
            <div
                ref={wrapRef}
                className={`flex items-center justify-center overflow-hidden ${className ?? ''}`}
                style={{
                    backgroundColor: backdropColor(
                        options?.timeOfDay ?? 'siang',
                    ),
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="block shrink-0"
                    style={{
                        width: CANVAS_W * scale,
                        height: CANVAS_H * scale,
                        imageRendering: 'pixelated',
                    }}
                />
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

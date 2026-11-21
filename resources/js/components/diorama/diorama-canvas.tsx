import { useEffect, useRef, useState } from 'react';
import { CANVAS_H, CANVAS_W } from '@/diorama/engine/iso';
import { startLoop } from '@/diorama/engine/loop';
import type { DioramaWorld } from '@/diorama/engine/world';
import { PlaceholderRenderer } from '@/diorama/render/placeholder-renderer';
import { loadReferences } from '@/diorama/sprites/reference-loader';
import type { RenderOptions } from '@/diorama/render/placeholder-renderer';

type Props = {
    world: DioramaWorld;
    options?: RenderOptions;
    className?: string;
};

/**
 * Kanvas diorama 768 × 432 yang diskalakan kelipatan bulat menurut lebar wadah,
 * dengan `image-rendering: pixelated`. Wadah lebih sempit dari 768 px membuat
 * kanvas diperkecil (bukan skala bulat). Loop 30 FPS berhenti saat tab tersembunyi.
 */
export default function DioramaCanvas({ world, options, className }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const optionsRef = useRef<RenderOptions | undefined>(options);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    useEffect(() => {
        const wrap = wrapRef.current;

        if (!wrap) {
            return;
        }

        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            setScale(width < CANVAS_W ? 0 : Math.floor(width / CANVAS_W));
        });
        observer.observe(wrap);

        return () => observer.disconnect();
    }, []);

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

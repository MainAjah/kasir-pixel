import { useEffect, useRef, useState } from 'react';
import type { PostKey } from '@/diorama/scenes/store-scene';
import { guardPortrait, portraitScale } from '@/diorama/sprites/post-guard';
import { paintMatrix } from '@/diorama/sprites/sprite-cache';
import { loadReferences } from '@/diorama/sprites/reference-loader';

type Props = {
    post: PostKey;
    /** Ukuran dasar potret (px layar), lihat portraitMaxHeight. */
    size: number;
    /** Tinggi potret paling besar yang masih muat di layar (px layar). */
    capHeight: number;
};

/**
 * Penjaga pos diperbesar dengan skala bulat (gambar yang sama, tanpa ekspresi
 * tambahan), dilukis tajam tanpa anti-alias. Semua penjaga tampak sama besar
 * (disamakan menurut luas).
 */
export default function BigPortrait({ post, size, capHeight }: Props) {
    const ref = useRef<HTMLCanvasElement>(null);
    const [matrix, setMatrix] = useState(() => guardPortrait(post));

    useEffect(() => {
        let alive = true;
        void loadReferences().then(() => {
            if (alive) {
                setMatrix(guardPortrait(post));
            }
        });

        return () => {
            alive = false;
        };
    }, [post]);

    useEffect(() => {
        const ctx = ref.current?.getContext('2d');

        if (!ctx || !matrix) {
            return;
        }

        ctx.clearRect(0, 0, matrix.width, matrix.height);
        paintMatrix(ctx, matrix);
    }, [matrix]);

    if (!matrix) {
        return null;
    }

    const scale = portraitScale(matrix.width, matrix.height, size, capHeight);

    return (
        <canvas
            ref={ref}
            width={matrix.width}
            height={matrix.height}
            aria-hidden="true"
            className="block"
            style={{
                width: matrix.width * scale,
                height: matrix.height * scale,
                imageRendering: 'pixelated',
            }}
        />
    );
}

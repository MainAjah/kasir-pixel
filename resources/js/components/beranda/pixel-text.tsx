import { useEffect, useRef } from 'react';
import { drawText, textWidth } from '@/diorama/render/pixel';

type Props = {
    text: string;
    color: string;
    /** Ukuran satu piksel huruf dalam px layar. */
    scale?: number;
    className?: string;
};

/**
 * Tulisan dengan huruf pixel 3 × 5 milik diorama (bukan font luar), untuk judul
 * dan angka besar. Kanvasnya disembunyikan dari pembaca layar; teks aslinya
 * tetap ada untuk pembaca layar.
 */
export default function PixelText({
    text,
    color,
    scale = 3,
    className,
}: Props) {
    const ref = useRef<HTMLCanvasElement>(null);
    const width = Math.max(1, textWidth(text));

    useEffect(() => {
        const ctx = ref.current?.getContext('2d');

        if (!ctx) {
            return;
        }

        ctx.clearRect(0, 0, width, 5);
        drawText(ctx, 0, 0, text, color);
    }, [text, color, width]);

    return (
        <span className={className}>
            <canvas
                ref={ref}
                width={width}
                height={5}
                aria-hidden="true"
                className="block"
                style={{
                    width: width * scale,
                    height: 5 * scale,
                    imageRendering: 'pixelated',
                }}
            />
            <span className="sr-only">{text}</span>
        </span>
    );
}

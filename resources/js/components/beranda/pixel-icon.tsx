import { ICON_COLORS, PIXEL_ICONS } from './pixel-icons';
import type { PixelIconName } from './pixel-icons';

type Props = {
    name: PixelIconName;
    /** Ukuran satu piksel ikon dalam px layar. */
    scale?: number;
    className?: string;
};

/** Ikon pixel 12 × 12 sebagai SVG berpetak tajam (tanpa anti-alias). */
export default function PixelIcon({ name, scale = 3, className }: Props) {
    const rows = PIXEL_ICONS[name];
    const size = rows.length;
    const rects = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < rows[y].length; x++) {
            const color = ICON_COLORS[rows[y][x]];

            if (color) {
                rects.push(
                    <rect
                        key={`${x},${y}`}
                        x={x}
                        y={y}
                        width={1}
                        height={1}
                        fill={color}
                    />,
                );
            }
        }
    }

    return (
        <svg
            aria-hidden="true"
            viewBox={`0 0 ${size} ${size}`}
            width={size * scale}
            height={size * scale}
            shapeRendering="crispEdges"
            className={className}
        >
            {rects}
        </svg>
    );
}

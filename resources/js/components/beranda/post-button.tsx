import type { Point } from '@/diorama/engine/iso';
import { PIXEL_FRAME } from './pixel-frame';
import type { PostInfo } from './posts';

type Props = {
    post: PostInfo;
    /** Letak di kanvas dasar (postAnchor). */
    anchor: Point;
    /** Skala tampilan kanvas (px layar per px kanvas dasar). */
    scale: number;
    onOpen: () => void;
};

/**
 * Tombol berlabel di depan meja pos (tanpa balon). Tombol HTML biasa: bisa
 * dipilih dengan Tab dan dibuka dengan Enter atau Spasi. Di layar kecil hanya
 * judulnya yang tampil.
 */
export default function PostButton({ post, anchor, scale, onOpen }: Props) {
    const compact = scale < 1.2;

    return (
        <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            aria-label={`${post.title}: ${post.subtitle}`}
            className={`${PIXEL_FRAME} pointer-events-auto absolute -translate-x-1/2 cursor-pointer text-left text-[#2b2a33] transition-transform hover:bg-[#ffe9a8] focus-visible:bg-[#ffe9a8] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#6a9fc4] active:translate-y-[2px] active:shadow-[1px_1px_0_#2b2a33] ${compact ? 'px-2 py-0.5' : 'px-3 py-1.5'}`}
            style={{ left: anchor.x * scale, top: anchor.y * scale }}
        >
            <span
                className={`block font-bold tracking-wide uppercase ${compact ? 'text-xs' : 'text-sm'}`}
            >
                {post.title}
            </span>
            {!compact && (
                <span className="block text-xs whitespace-nowrap text-[#5b5470]">
                    {post.subtitle}
                </span>
            )}
        </button>
    );
}

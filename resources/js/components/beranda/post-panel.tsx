import { Link } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { KeyboardEvent } from 'react';
import { portraitCap, portraitMaxHeight } from '@/diorama/sprites/post-guard';
import BigPortrait from './big-portrait';
import { PIXEL_FRAME } from './pixel-frame';
import type { PostOption } from '@/lib/post-access';
import type { PostInfo } from './posts';

type Props = {
    /** Pos yang dibuka beserta pilihan fiturnya dari server; null = tertutup. */
    open: { post: PostInfo; options: PostOption[] } | null;
    onClose: () => void;
};

const OPTION =
    'flex w-full items-center justify-between gap-3 border-[3px] border-[#2b2a33] bg-[#fdf8f0] px-2.5 py-1 text-left text-sm font-semibold text-[#2b2a33] shadow-[3px_3px_0_#2b2a33]';

/** Panah pixel 4 × 7 berwarna palet (bukan karakter ▶ yang bisa jadi emoji). */
function PixelArrow() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 4 7"
            width={8}
            height={14}
            shapeRendering="crispEdges"
        >
            <rect x={0} y={0} width={1} height={7} fill="#e89b4f" />
            <rect x={1} y={1} width={1} height={5} fill="#e89b4f" />
            <rect x={2} y={2} width={1} height={3} fill="#e89b4f" />
            <rect x={3} y={3} width={1} height={1} fill="#e89b4f" />
        </svg>
    );
}

/** Panah atas dan bawah memindah fokus antarpilihan (selain Tab). */
function moveFocus(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return;
    }

    const items = [
        ...event.currentTarget.querySelectorAll<HTMLElement>('[data-option]'),
    ];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = items[(index + step + items.length) % items.length];

    event.preventDefault();
    next?.focus();
}

/**
 * Panel karakter besar (gaya dialog game): diorama diredupkan, penjaga pos
 * diperbesar skala bulat di kiri, kotak dialog berisi sapaan dan pilihan fitur
 * di kanan. Esc atau tombol Tutup menutup; fokus terkunci di dalam panel.
 */
export default function PostPanel({ open, onClose }: Props) {
    const post = open?.post ?? null;

    // Potret dan dialog dibuat kecil, potret tetap lebih tinggi dari dialog (keputusan pemilik).
    const viewport =
        typeof window === 'undefined'
            ? { w: 1366, h: 768 }
            : { w: window.innerWidth, h: window.innerHeight };
    const size = portraitMaxHeight(viewport.w, viewport.h);
    const capHeight = portraitCap(viewport.w, viewport.h);

    return (
        <DialogPrimitive.Root
            open={open !== null}
            onOpenChange={(isOpen) => !isOpen && onClose()}
        >
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[#2b2a33]/55" />
                {post && (
                    <DialogPrimitive.Content
                        aria-describedby={`sapaan-${post.key}`}
                        onOpenAutoFocus={(event) => {
                            // Fokus awal selalu di pilihan pertama.
                            event.preventDefault();
                            (event.currentTarget as HTMLElement)
                                .querySelector<HTMLElement>('[data-option]')
                                ?.focus();
                        }}
                        className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 p-4 outline-none sm:flex-row sm:items-end sm:justify-center sm:gap-4 sm:p-6"
                    >
                        <div className="shrink-0">
                            <BigPortrait
                                post={post.key}
                                size={size}
                                capHeight={capHeight}
                            />
                        </div>

                        <div
                            className={`${PIXEL_FRAME} w-full max-w-xs p-3 text-[#2b2a33] sm:mb-3`}
                        >
                            <DialogPrimitive.Title className="inline-block border-[3px] border-[#2b2a33] bg-[#f6c56b] px-1.5 py-0.5 text-xs font-bold tracking-wide uppercase">
                                {post.guardName}
                            </DialogPrimitive.Title>
                            <p
                                id={`sapaan-${post.key}`}
                                className="mt-1.5 mb-2 text-sm"
                            >
                                “{post.greeting}”
                            </p>

                            <ul className="space-y-1.5" onKeyDown={moveFocus}>
                                {open?.options.map((option) => (
                                    <li key={option.label}>
                                        {option.href ? (
                                            <Link
                                                href={option.href}
                                                data-option
                                                className={`${OPTION} hover:bg-[#ffe9a8] focus-visible:bg-[#ffe9a8] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#6a9fc4]`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <PixelArrow />
                                                    {option.label}
                                                </span>
                                            </Link>
                                        ) : (
                                            <button
                                                type="button"
                                                data-option
                                                aria-disabled="true"
                                                className={`${OPTION} cursor-not-allowed border-[#8f88a8] text-[#8f88a8] shadow-[3px_3px_0_#8f88a8] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#6a9fc4]`}
                                            >
                                                <span>{option.label}</span>
                                                <span className="text-xs font-normal">
                                                    {option.note ??
                                                        'segera hadir'}
                                                </span>
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-2.5 flex justify-end">
                                <DialogPrimitive.Close
                                    className={`${PIXEL_FRAME} px-2 py-0.5 text-xs font-semibold hover:bg-[#ffe9a8] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#6a9fc4]`}
                                >
                                    Tutup (Esc)
                                </DialogPrimitive.Close>
                            </div>
                        </div>
                    </DialogPrimitive.Content>
                )}
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

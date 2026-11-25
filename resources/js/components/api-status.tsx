import { SECONDARY_BUTTON } from '@/components/pixel/styles';
import type { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Kotak "sedang memuat" bergaya pixel untuk halaman yang membaca REST API (Tahap 11). */
export function ApiLoading({ label }: { label: string }) {
    return (
        <div
            role="status"
            className="flex items-center gap-3 bg-px-sorotan p-4 text-px-tinta pixel-frame"
        >
            <span
                aria-hidden="true"
                className="size-4 animate-pulse border-2 border-px-tinta bg-px-kunyit motion-reduce:animate-none"
            />
            <span className="font-pixel text-base">{label}…</span>
        </div>
    );
}

/** Pesan galat memuat data dengan tombol Coba lagi. */
export function ApiErrorPanel({
    error,
    onRetry,
    className,
}: {
    error: ApiError;
    onRetry?: () => void;
    className?: string;
}) {
    return (
        <div
            role="alert"
            className={cn(
                'flex flex-wrap items-center gap-3 bg-px-sorotan p-4 text-px-tinta pixel-frame',
                className,
            )}
        >
            <span className="inline-block bg-px-bata px-1.5 text-sm">
                {error.message}
            </span>
            {onRetry && error.status !== 403 && (
                <button
                    type="button"
                    className={cn(SECONDARY_BUTTON, 'h-9 text-sm')}
                    onClick={onRetry}
                >
                    Coba lagi
                </button>
            )}
        </div>
    );
}

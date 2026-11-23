import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Panel kertas krem berbingkai pixel (Tahap 5E-2) untuk form dan detail:
 * judul font pixel, keterangan singkat, garis putus-putus di bawah kepala.
 */
export default function PixelPanel({
    title,
    description,
    actions,
    children,
    className,
}: {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'space-y-4 bg-px-sorotan p-5 text-px-tinta pixel-frame',
                className,
            )}
        >
            {(title || description || actions) && (
                <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-dashed border-px-lantai pb-3">
                    <div className="min-w-0 space-y-1">
                        {title && (
                            <h2 className="font-pixel text-xl leading-tight">
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p className="max-w-prose text-sm text-px-bayangan">
                                {description}
                            </p>
                        )}
                    </div>
                    {actions}
                </header>
            )}
            {children}
        </section>
    );
}

import { Link } from '@inertiajs/react';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PaginationLink } from '@/types';

const ITEM =
    'grid h-8 min-w-8 place-items-center border-2 border-px-tinta px-2 font-pixel text-sm text-px-tinta focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none';

/**
 * Navigasi halaman bergaya pixel (Tahap 5E-2): kotak bertepi tinta, halaman
 * aktif kunyit. Bila `from`, `to`, dan `total` diberikan, tampil juga
 * keterangan "Menampilkan x–y dari z".
 */
export default function Pagination({
    links,
    from,
    to,
    total,
}: {
    links: PaginationLink[];
    from?: number | null;
    to?: number | null;
    total?: number;
}) {
    const summary =
        total !== undefined && total > 0 && from && to
            ? `Menampilkan ${formatNumber(from)}–${formatNumber(to)} dari ${formatNumber(total)}`
            : null;

    if (links.length <= 3 && summary === null) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {summary && <p className="text-sm text-px-bayangan">{summary}</p>}
            {links.length > 3 && (
                <nav className="flex flex-wrap gap-1.5" aria-label="Halaman">
                    {links.map((link, i) => {
                        const label = link.label
                            .replace('&laquo; Previous', '‹')
                            .replace('Next &raquo;', '›');
                        const className = cn(
                            ITEM,
                            link.active
                                ? 'bg-px-kunyit shadow-[2px_2px_0_var(--color-px-tinta)]'
                                : 'bg-px-sorotan hover:bg-px-lampu',
                            !link.url &&
                                'pointer-events-none border-px-logam text-px-bayangan',
                        );

                        return link.url ? (
                            <Link
                                key={i}
                                href={link.url}
                                className={className}
                                aria-current={link.active ? 'page' : undefined}
                                preserveScroll
                            >
                                {label}
                            </Link>
                        ) : (
                            <span key={i} className={className}>
                                {label}
                            </span>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}

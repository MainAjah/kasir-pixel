import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import type { PaginationLink } from '@/types';

export default function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav className="flex flex-wrap gap-1" aria-label="Halaman">
            {links.map((link, i) => {
                const label = link.label
                    .replace('&laquo; Previous', '‹')
                    .replace('Next &raquo;', '›');
                const className = cn(
                    'rounded-md border px-3 py-1 text-sm',
                    link.active && 'bg-primary text-primary-foreground',
                    !link.url && 'pointer-events-none opacity-50',
                );

                return link.url ? (
                    <Link
                        key={i}
                        href={link.url}
                        className={className}
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
    );
}

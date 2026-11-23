import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { activeLink, menuFor } from '@/components/layout/menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

const DATE = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});
const TIME = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
});

/** Tanggal dan jam browser; dimulai setelah halaman aktif supaya sama dengan hasil render server. */
function useNow(): Date | null {
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const timer = window.setInterval(() => setNow(new Date()), 15_000);

        return () => window.clearInterval(timer);
    }, []);

    return now;
}

/**
 * Header halaman bertema pixel (Tahap 5E-1): judul halaman (dari breadcrumb
 * terakhir), keterangan singkat dari menu, serta tanggal dan jam.
 */
export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const page = usePage();
    const path = page.url.split('?')[0];
    const active = activeLink(menuFor(page.props.auth.roles), path);
    const title =
        breadcrumbs.at(-1)?.title ??
        active?.link?.title ??
        active?.group.title ??
        '';
    const subtitle =
        active?.link?.subtitle ??
        active?.group.subtitle ??
        breadcrumbs
            .slice(0, -1)
            .map((b) => b.title)
            .join(' / ');
    const now = useNow();

    return (
        <header className="flex min-h-16 shrink-0 items-center gap-3 border-b-4 border-px-tinta bg-px-sorotan px-4 py-2 md:px-6">
            <SidebarTrigger className="-ml-1 shrink-0 text-px-tinta hover:bg-px-lampu" />

            <div className="min-w-0 flex-1">
                <h1 className="truncate font-pixel text-2xl leading-tight text-px-tinta">
                    {title}
                </h1>
                {subtitle && (
                    <p className="truncate text-sm text-px-bayangan">
                        {subtitle}
                    </p>
                )}
            </div>

            <time
                dateTime={now?.toISOString()}
                className="hidden shrink-0 items-baseline gap-3 bg-px-lampu px-3 py-1 font-pixel text-px-tinta pixel-frame-sm sm:flex"
                aria-live="off"
            >
                {now ? (
                    <>
                        <span className="text-sm">{DATE.format(now)}</span>
                        <span className="text-lg">{TIME.format(now)}</span>
                    </>
                ) : (
                    <span className="text-sm">&nbsp;</span>
                )}
            </time>
        </header>
    );
}

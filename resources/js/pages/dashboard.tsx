import { Head } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';
import SideMenu from '@/components/beranda/side-menu';
import TodayCard from '@/components/beranda/today-card';
import type { TodaySummary } from '@/components/beranda/today-card';
import { useDashboardFeed } from '@/components/beranda/use-dashboard-feed';
import { useTimeOfDay } from '@/components/beranda/use-time-of-day';
import DioramaCanvas from '@/components/diorama/diorama-canvas';
import { useDiorama } from '@/components/diorama/use-diorama';
import type { FeedCursor, FeedPayload } from '@/diorama/engine/poll';
import { shelfFills } from '@/diorama/engine/shelves';
import type { ShelfLevels } from '@/diorama/engine/shelves';
import type { RenderOptions } from '@/diorama/render/placeholder-renderer';

type Props = {
    today: TodaySummary;
    shelves: ShelfLevels;
    cursor: FeedCursor;
};

/** Ganti state hanya bila isinya berubah, supaya polling tidak memicu render sia-sia. */
function keepIfSame<T>(previous: T, next: T): T {
    return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
}

/**
 * Beranda (Tahap 5D-1): diorama toko memenuhi layar, tanpa bar atas dan bawah.
 * Kartu "Hari Ini" melayang di kiri atas, menu ikon di sisi kiri. Polling tiap
 * 5 detik memutar penjualan baru dan memperbarui angka serta isi rak. Diorama
 * hanya membaca; tidak ada data yang ditulis dari halaman ini.
 */
export default function Dashboard(props: Props) {
    const [today, setToday] = useState(props.today);
    const [shelves, setShelves] = useState(props.shelves);

    // Figuran dan peristiwa acak (rombongan, kabur dikejar penjaga) hanya animasi:
    // tidak menulis data dan tidak mengubah angka total.
    const { world, feed } = useDiorama({
        autoBackground: true,
        ambient: true,
        dailyTotal: props.today.sales_total,
    });

    const onData = useCallback((payload: FeedPayload) => {
        setToday((t) => keepIfSame(t, payload.today));
        setShelves((s) => keepIfSame(s, payload.shelves));
    }, []);

    useDashboardFeed({ cursor: props.cursor, feed, world, onData });

    // Siang, senja, malam mengikuti jam browser.
    const timeOfDay = useTimeOfDay();

    // Rak dan vending terisi sesuai stok nyata.
    const options = useMemo<RenderOptions>(
        () => ({ fills: shelfFills(shelves, world.scene), timeOfDay }),
        [shelves, world, timeOfDay],
    );

    return (
        <>
            <Head title="Beranda" />

            <main className="relative h-dvh w-full overflow-hidden">
                <DioramaCanvas
                    world={world}
                    options={options}
                    fit="screen"
                    className="absolute inset-0"
                />

                <div className="pointer-events-none absolute inset-y-0 left-0 flex flex-col gap-5 p-4">
                    <div className="pointer-events-auto">
                        <TodayCard today={today} />
                    </div>
                    <div className="pointer-events-auto">
                        <SideMenu />
                    </div>
                </div>
            </main>
        </>
    );
}

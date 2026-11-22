import { useEffect, useState } from 'react';
import { timeOfDayAt, timeOverride } from '@/diorama/engine/clock';
import type { TimeOfDay } from '@/diorama/sprites/decor-sprite';

/** Waktu diorama dari jam browser, diperiksa tiap 30 detik (atau `?waktu=` untuk demo). */
export function useTimeOfDay(): TimeOfDay {
    const [time, setTime] = useState<TimeOfDay>(() =>
        typeof window === 'undefined'
            ? 'siang'
            : (timeOverride(window.location.search) ?? timeOfDayAt(new Date())),
    );

    useEffect(() => {
        if (timeOverride(window.location.search)) {
            return;
        }

        const timer = window.setInterval(
            () => setTime(timeOfDayAt(new Date())),
            30_000,
        );

        return () => window.clearInterval(timer);
    }, []);

    return time;
}

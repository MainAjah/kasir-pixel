import { useEffect, useState } from 'react';
import { timeOfDayAt, timeOverride } from '@/diorama/engine/clock';
import type { TimeOfDay } from '@/diorama/sprites/decor-sprite';

/**
 * Waktu diorama dari jam browser, diperiksa tiap 30 detik (atau `?waktu=` untuk
 * demo).
 *
 * Beranda dirender lebih dulu di server (SSR), yang tidak tahu jam browser. Agar
 * hasil server dan browser sama saat hidrasi, keduanya mulai dari "siang", lalu
 * langsung diganti ke jam browser begitu halaman aktif. Tanpa ini, warna latar
 * di sekeliling kanvas tertinggal di warna siang saat senja dan malam.
 */
export function useTimeOfDay(): TimeOfDay {
    const [time, setTime] = useState<TimeOfDay>('siang');

    useEffect(() => {
        const override = timeOverride(window.location.search);
        setTime(override ?? timeOfDayAt(new Date()));

        if (override) {
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

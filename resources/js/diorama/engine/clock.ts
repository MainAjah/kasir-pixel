/**
 * Waktu diorama menurut jam browser (Tahap 5D-1), memakai lapisan malam 5C.
 *
 * - siang: 06.00 sampai 16.59;
 * - senja: 17.00 sampai 18.59, juga fajar 05.00 sampai 05.59;
 * - malam: 19.00 sampai 04.59.
 */
import type { TimeOfDay } from '../sprites/decor-sprite';

const TIMES: readonly TimeOfDay[] = ['siang', 'senja', 'malam'];

/** Waktu diorama untuk jam setempat browser. */
export function timeOfDayAt(date: Date): TimeOfDay {
    const hour = date.getHours();

    if (hour >= 6 && hour < 17) {
        return 'siang';
    }

    if (hour === 5 || (hour >= 17 && hour < 19)) {
        return 'senja';
    }

    return 'malam';
}

/**
 * Pilihan waktu lewat alamat (`?waktu=malam`) untuk demo dan presentasi; null
 * bila tidak ada atau tidak dikenal, sehingga jam browser yang dipakai.
 */
export function timeOverride(search: string): TimeOfDay | null {
    const value = new URLSearchParams(search).get('waktu');

    return TIMES.find((t) => t === value) ?? null;
}

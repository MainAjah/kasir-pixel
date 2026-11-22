/**
 * Bunyi diorama (Tahap 5D-2): kapan berbunyi, ditentukan dari perubahan keadaan
 * dunia antara dua bingkai. Murni (tanpa Web Audio) supaya bisa dites; bunyinya
 * sendiri dibuat dari kode di components/beranda/chip-sound.ts.
 */
import type { CashierState } from '../actors/cashier';

export type SoundCue = 'bip' | 'koin' | 'batal' | 'kejar' | 'pintu';

export type SoundSnapshot = {
    cashierState: CashierState;
    /** Lama keadaan penjaga berjalan; turun berarti langkah baru dimulai. */
    cashierTime: number;
    /** Nomor pelanggan yang tampil. */
    customers: readonly number[];
};

/** Bunyi tiap awal langkah penjaga. */
const CASHIER_CUES: Partial<Record<CashierState, SoundCue>> = {
    pindai: 'bip',
    terima_koin: 'koin',
    batal: 'batal',
    mengejar: 'kejar',
};

export function soundCues(
    prev: SoundSnapshot | null,
    next: SoundSnapshot,
): SoundCue[] {
    if (prev === null) {
        return [];
    }

    const cues: SoundCue[] = [];
    const newStep =
        next.cashierState !== prev.cashierState ||
        next.cashierTime < prev.cashierTime;
    const cue = CASHIER_CUES[next.cashierState];

    if (newStep && cue) {
        cues.push(cue);
    }

    const before = new Set(prev.customers);

    if (next.customers.some((id) => !before.has(id))) {
        cues.push('pintu');
    }

    return cues;
}

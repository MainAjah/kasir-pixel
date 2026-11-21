import type { Rates, SavingsType } from '@/types';

export const SAVINGS_TYPES: { value: SavingsType; label: string }[] = [
    { value: 'pokok', label: 'Simpanan pokok' },
    { value: 'wajib', label: 'Simpanan wajib' },
    { value: 'sukarela', label: 'Simpanan sukarela' },
];

export function savingsLabel(type: SavingsType): string {
    return SAVINGS_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Pokok dan wajib bernominal tetap (tarif); sukarela diisi bebas. Null = tidak ada nominal bawaan. */
export function fixedAmount(type: SavingsType, rates: Rates): number | null {
    if (type === 'pokok') {
        return rates.pokok;
    }

    if (type === 'wajib') {
        return rates.wajib;
    }

    return null;
}

/** Pokok dan wajib hanya bisa disetor; penarikan hanya lewat proses keluar anggota. */
export function canWithdraw(type: SavingsType): boolean {
    return type === 'sukarela';
}

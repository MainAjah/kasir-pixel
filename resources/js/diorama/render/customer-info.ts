/**
 * Isi kartu "klik pelanggan" (Tahap 5D-2): siapa pelanggannya dan barang yang
 * dibelinya. Hanya membaca dunia diorama. Pembeli dari peristiwa acak ditandai
 * bukan transaksi nyata.
 */
import type { Customer } from '../actors/customer';
import type { DioramaWorld } from '../engine/world';
import { formatRupiah } from './pixel';
import { customerCharacter } from './placeholder-renderer';

export type CustomerInfo = {
    title: string;
    /** Nomor penjualan bila sudah dibayar. */
    number: string | null;
    /** Baris barang: "2 bungkus Keripik singkong". */
    items: string[];
    /** Total belanja bila sudah dibayar. */
    total: string | null;
    note: string | null;
};

export function customerInfo(
    world: DioramaWorld,
    customer: Customer,
): CustomerInfo {
    const title = customerCharacter(customer)?.title ?? 'Pelanggan';
    const sale = world.saleOf(customer);
    const empty = { title, number: null, items: [], total: null };

    if (customer.kind === 'latar' || !sale) {
        return { ...empty, note: 'Hanya melihat-lihat.' };
    }

    if (sale.pretend) {
        return {
            ...empty,
            note: sale.runAway
                ? 'Pengunjung dari peristiwa acak (bukan transaksi nyata), kabur tanpa membayar.'
                : 'Pengunjung dari peristiwa acak (bukan transaksi nyata).',
        };
    }

    const lines = sale.completed ? sale.items : sale.scanned;
    const items = lines.map((i) => `${i.qty} ${i.unit} ${i.name}`);
    const base = {
        title,
        number: sale.number,
        items,
        total:
            sale.completed && !sale.voided
                ? `Rp ${formatRupiah(sale.total)}`
                : null,
    };

    if (sale.voided) {
        return { ...base, note: 'Penjualan ini dibatalkan.' };
    }

    if (sale.abandoned) {
        return { ...base, note: 'Kabur tanpa membayar!' };
    }

    if (!sale.completed) {
        return {
            ...base,
            note:
                items.length > 0
                    ? 'Sedang dilayani.'
                    : 'Sedang memilih barang.',
        };
    }

    return { ...base, note: null };
}

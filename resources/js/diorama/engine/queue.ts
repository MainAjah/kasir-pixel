import type { Tile } from './iso';

/**
 * Manajer antrean kasir: slot 0 adalah titik dilayani, slot berikutnya ke belakang.
 * Pelanggan masuk ke slot kosong terakhir dan maju saat slot di depannya kosong.
 */
export class QueueManager {
    private readonly order: number[] = [];

    constructor(readonly slots: readonly Tile[]) {}

    get capacity(): number {
        return this.slots.length;
    }

    get size(): number {
        return this.order.length;
    }

    get members(): readonly number[] {
        return this.order;
    }

    isFull(): boolean {
        return this.order.length >= this.slots.length;
    }

    /** Bergabung di belakang. Mengembalikan indeks slot, atau -1 bila penuh. */
    join(id: number): number {
        const existing = this.order.indexOf(id);

        if (existing !== -1) {
            return existing;
        }

        if (this.isFull()) {
            return -1;
        }

        this.order.push(id);

        return this.order.length - 1;
    }

    /** Keluar dari antrean; yang di belakangnya otomatis maju satu slot. */
    leave(id: number): void {
        const index = this.order.indexOf(id);

        if (index !== -1) {
            this.order.splice(index, 1);
        }
    }

    indexOf(id: number): number {
        return this.order.indexOf(id);
    }

    slotOf(id: number): Tile | null {
        const index = this.order.indexOf(id);

        return index === -1 ? null : this.slots[index];
    }

    front(): number | null {
        return this.order[0] ?? null;
    }
}

/**
 * Penjaga kasir 1 (docs/diorama-rancangan.md bagian 4).
 *
 * Aksi diputar berurutan dari antrean kecil: menyapa, pindai lalu bungkus,
 * terima koin, batal. Kembali ke `diam` bila antrean kosong. Antrean dibatasi
 * agar animasi tidak tertinggal jauh dari kasir sungguhan.
 */
export type CashierState =
    | 'diam'
    | 'menyapa'
    | 'pindai'
    | 'bungkus'
    | 'terima_koin'
    | 'batal';

export const CASHIER_DURATION: Record<Exclude<CashierState, 'diam'>, number> = {
    menyapa: 0.6,
    pindai: 0.45,
    bungkus: 0.25,
    terima_koin: 0.9,
    batal: 1.2,
};

export const CASHIER_MAX_STEPS = 8;

type Step = { state: Exclude<CashierState, 'diam'>; duration: number };

export class Cashier {
    state: CashierState = 'diam';
    /** Lama berada di state sekarang, untuk animasi. */
    stateTime = 0;
    private timer = 0;
    private readonly steps: Step[] = [];

    get pending(): number {
        return this.steps.length;
    }

    greet(): void {
        this.enqueue('menyapa', 1);
    }

    /** Satu pindai diikuti bungkus. `speed` 3 saat kejar ketinggalan. */
    scan(speed = 1): void {
        if (this.steps.length + 2 > CASHIER_MAX_STEPS) {
            return;
        }

        this.enqueue('pindai', speed);
        this.enqueue('bungkus', speed);
    }

    receiveCoin(): void {
        this.enqueue('terima_koin', 1);
    }

    /** Pembatalan selalu diperlihatkan, langsung setelah aksi yang sedang berjalan. */
    cancel(): void {
        this.steps.unshift({
            state: 'batal',
            duration: CASHIER_DURATION.batal,
        });

        if (this.steps.length > CASHIER_MAX_STEPS) {
            this.steps.pop();
        }
    }

    update(dt: number): void {
        this.stateTime += dt;

        if (this.state !== 'diam') {
            this.timer -= dt;

            if (this.timer > 0) {
                return;
            }
        }

        const next = this.steps.shift();

        if (next) {
            this.state = next.state;
            this.timer = next.duration;
            this.stateTime = 0;
        } else if (this.state !== 'diam') {
            this.state = 'diam';
            this.stateTime = 0;
        }
    }

    private enqueue(state: Step['state'], speed: number): void {
        if (this.steps.length >= CASHIER_MAX_STEPS) {
            return;
        }

        this.steps.push({ state, duration: CASHIER_DURATION[state] / speed });
    }
}

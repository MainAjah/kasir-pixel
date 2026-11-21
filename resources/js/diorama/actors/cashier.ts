/**
 * Penjaga kasir 1 (docs/diorama-rancangan.md bagian 4).
 *
 * Di belakang meja, aksi diputar berurutan dari antrean kecil: menyapa, pindai
 * lalu bungkus, terima koin, batal. Kembali ke `diam` bila antrean kosong.
 * Antrean dibatasi agar animasi tidak tertinggal jauh dari kasir sungguhan.
 *
 * Pelanggan kabur tanpa membayar: penjaga meninggalkan meja (`mengejar`) sampai
 * pintu, berhenti sebentar (`di_pintu`), lalu berjalan pulang (`kembali`) ke
 * tempatnya dan menghadap pembeli lagi.
 */
import type { Facing, Tile } from '../engine/iso';
import { moveAlong } from '../engine/movement';
import type { Mover } from '../engine/movement';
import { STORE_SCENE } from '../scenes/store-scene';

type ActionState = 'menyapa' | 'pindai' | 'bungkus' | 'terima_koin' | 'batal';
type AwayState = 'mengejar' | 'di_pintu' | 'kembali';

export type CashierState = 'diam' | ActionState | AwayState;

export const CASHIER_DURATION: Record<ActionState, number> = {
    menyapa: 0.6,
    pindai: 0.45,
    bungkus: 0.25,
    terima_koin: 0.9,
    batal: 1.2,
};

export const CASHIER_MAX_STEPS = 8;
/** Tile per detik. Mengejar sedikit lebih lambat dari pelanggan yang kabur (5). */
export const CHASE_SPEED = 4;
export const RETURN_SPEED = 2;
/** Lama berhenti di pintu sebelum pulang ke meja. */
export const DOOR_PAUSE = 1.5;

const AWAY: readonly CashierState[] = ['mengejar', 'di_pintu', 'kembali'];

type Step = { state: ActionState; duration: number };

export class Cashier implements Mover {
    state: CashierState = 'diam';
    /** Lama berada di state sekarang, untuk animasi. */
    stateTime = 0;
    fx: number;
    fy: number;
    path: Tile[] = [];
    facing: Facing;
    private timer = 0;
    private duration = 0;
    private returnPath: Tile[] = [];
    private readonly steps: Step[] = [];

    constructor(readonly home: Tile & { facing: Facing } = STORE_SCENE.guard) {
        this.fx = home.gx;
        this.fy = home.gy;
        this.facing = home.facing;
    }

    get pending(): number {
        return this.steps.length;
    }

    /** Di belakang meja (tidak sedang mengejar atau berjalan pulang). */
    get atPost(): boolean {
        return !AWAY.includes(this.state);
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

    /**
     * Mengejar pelanggan yang kabur: `toDoor` dari meja sampai pintu, `back` dari
     * pintu pulang ke tempatnya. Diabaikan bila sedang mengejar (false).
     */
    chase(toDoor: Tile[], back: Tile[]): boolean {
        if (!this.atPost) {
            return false;
        }

        // Aksi kasir yang belum diputar dibuang: meja ditinggal.
        this.steps.length = 0;
        this.path = [...toDoor];
        this.returnPath = [...back];
        this.enterState('mengejar');

        return true;
    }

    update(dt: number): void {
        this.stateTime += dt;

        switch (this.state) {
            case 'mengejar':
                if (moveAlong(this, CHASE_SPEED * dt)) {
                    this.facing = 'nw';
                    this.enterState('di_pintu', DOOR_PAUSE);
                }

                return;

            case 'di_pintu':
                this.timer -= dt;

                if (this.timer <= 0) {
                    this.path = this.returnPath;
                    this.returnPath = [];
                    this.enterState('kembali');
                }

                return;

            case 'kembali':
                if (moveAlong(this, RETURN_SPEED * dt)) {
                    this.facing = this.home.facing;
                    this.enterState('diam');
                }

                return;

            default:
                this.updateActions(dt);
        }
    }

    private updateActions(dt: number): void {
        if (this.state !== 'diam') {
            this.timer -= dt;

            if (this.timer > 0) {
                return;
            }
        }

        const next = this.steps.shift();

        if (next) {
            this.enterState(next.state, next.duration);
        } else if (this.state !== 'diam') {
            this.enterState('diam');
        }
    }

    /** Kemajuan aksi yang sedang diputar, 0..1 (0 untuk diam dan berjalan). */
    get progress(): number {
        return this.duration > 0
            ? Math.min(1, this.stateTime / this.duration)
            : 0;
    }

    private enterState(state: CashierState, timer = 0): void {
        this.state = state;
        this.stateTime = 0;
        this.timer = timer;
        this.duration = timer;
    }

    private enqueue(state: ActionState, speed: number): void {
        if (this.steps.length >= CASHIER_MAX_STEPS) {
            return;
        }

        this.steps.push({ state, duration: CASHIER_DURATION[state] / speed });
    }
}

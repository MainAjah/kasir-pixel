/**
 * Ukuran beban per bingkai dan penjaga performa (Tahap 5H langkah a3), murni.
 *
 * Tiap bingkai dicatat: jarak antarbingkai, waktu kerja CPU merender, dan bila
 * browser mendukung, waktu GPU. Penjaga performa menurunkan tingkat kualitas
 * bila berat dan menaikkannya lagi bila ringan (rencana bagian 5):
 * - turun bila p90 beban > 28 ms selama 3 detik, atau bingkai terlewat > 25%;
 * - naik bila p90 beban < 14 ms dan hampir tanpa bingkai terlewat selama 10 detik;
 * - paling cepat satu langkah per 5 detik;
 * - tingkat 3 tetap berat selama 5 detik → sarankan pindah ke Canvas.
 */
import type { Tier } from './effects';

export type FrameSample = {
    /** Jarak dari bingkai sebelumnya (ms). */
    interval: number;
    /** Waktu kerja CPU untuk merender bingkai ini (ms). */
    cpu: number;
    /** Waktu GPU (ms) bila terukur. */
    gpu?: number;
};

/** Batas loop 30 FPS = 33 ms; lebih dari 50 ms berarti satu bingkai terlewat. */
export const MISSED_FRAME_MS = 50;

export function percentile(values: readonly number[], p: number): number {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const i = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
    );

    return sorted[i];
}

/** Catatan bingkai terakhir (cincin), untuk HUD dan penjaga performa. */
export class FrameStats {
    private samples: FrameSample[] = [];

    constructor(private readonly capacity = 120) {}

    push(sample: FrameSample): void {
        this.samples.push(sample);

        if (this.samples.length > this.capacity) {
            this.samples.shift();
        }
    }

    get count(): number {
        return this.samples.length;
    }

    /** Bingkai per detik menurut jarak antarbingkai rata-rata. */
    fps(): number {
        const n = this.samples.length;

        if (n === 0) {
            return 0;
        }

        const total = this.samples.reduce((s, x) => s + x.interval, 0);

        return total > 0 ? (1000 * n) / total : 0;
    }

    cpu(p: number): number {
        return percentile(
            this.samples.map((s) => s.cpu),
            p,
        );
    }

    gpu(p: number): number | null {
        const values = this.samples
            .map((s) => s.gpu)
            .filter((v): v is number => v !== undefined);

        return values.length > 0 ? percentile(values, p) : null;
    }

    /** Beban = waktu terbesar antara CPU dan GPU. */
    cost(p: number): number {
        return percentile(
            this.samples.map((s) => Math.max(s.cpu, s.gpu ?? 0)),
            p,
        );
    }

    missedRatio(): number {
        const n = this.samples.length;

        return n === 0
            ? 0
            : this.samples.filter((s) => s.interval > MISSED_FRAME_MS).length /
                  n;
    }

    reset(): void {
        this.samples = [];
    }
}

export const GOVERNOR = {
    heavyMs: 28,
    lightMs: 14,
    heavyFor: 3,
    lightFor: 10,
    cooldown: 5,
    fallbackFor: 5,
    missedHeavy: 0.25,
    missedLight: 0.05,
} as const;

export type GovernorState = {
    tier: Tier;
    /** Tingkat 3 tetap berat: sebaiknya pindah ke diorama Canvas. */
    fallback: boolean;
};

export class PerfGovernor {
    private tier: Tier;
    private heavySince: number | null = null;
    private lightSince: number | null = null;
    private lastChange = -Infinity;
    private fallback = false;

    constructor(initial: Tier = 0) {
        this.tier = initial;
    }

    /** Panggil berkala (mis. tiap 0,5 detik) dengan waktu sekarang (detik). */
    update(
        now: number,
        stats: Pick<FrameStats, 'cost' | 'missedRatio'>,
    ): GovernorState {
        const cost = stats.cost(90);
        const missed = stats.missedRatio();
        const heavy = cost > GOVERNOR.heavyMs || missed > GOVERNOR.missedHeavy;
        const light = cost < GOVERNOR.lightMs && missed < GOVERNOR.missedLight;

        this.heavySince = heavy ? (this.heavySince ?? now) : null;
        this.lightSince = light ? (this.lightSince ?? now) : null;
        const cooled = now - this.lastChange >= GOVERNOR.cooldown;

        if (heavy && this.heavySince !== null) {
            if (
                this.tier < 3 &&
                cooled &&
                now - this.heavySince >= GOVERNOR.heavyFor
            ) {
                this.tier = (this.tier + 1) as Tier;
                this.lastChange = now;
                this.heavySince = now;
            } else if (
                this.tier === 3 &&
                now - this.heavySince >= GOVERNOR.fallbackFor
            ) {
                this.fallback = true;
            }
        } else if (
            light &&
            this.lightSince !== null &&
            this.tier > 0 &&
            cooled &&
            now - this.lightSince >= GOVERNOR.lightFor
        ) {
            this.tier = (this.tier - 1) as Tier;
            this.lastChange = now;
            this.lightSince = now;
            this.fallback = false;
        }

        return { tier: this.tier, fallback: this.fallback };
    }
}

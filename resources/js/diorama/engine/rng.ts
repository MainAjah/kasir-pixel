/** Pembangkit acak berbenih (mulberry32) agar tes mesin diorama bisa diulang persis. */
export type Rng = () => number;

export function createRng(seed: number): Rng {
    let state = seed >>> 0;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
    return items[Math.floor(rng() * items.length)];
}

export function between(rng: Rng, min: number, max: number): number {
    return min + rng() * (max - min);
}

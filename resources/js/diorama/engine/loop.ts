/**
 * Loop diorama: dibatasi 30 FPS dan berhenti saat tab tersembunyi
 * (docs/diorama-rancangan.md bagian 10).
 */
export const TARGET_FPS = 30;
/** Langkah terpanjang yang diterima, agar aktor tidak melompat setelah jeda. */
export const MAX_STEP = 0.1;

/**
 * Jam bingkai murni: diberi waktu `now` (ms) tiap requestAnimationFrame,
 * mengembalikan dt (detik) bila sudah waktunya menggambar, atau null bila belum.
 */
export function createFrameClock(fps = TARGET_FPS) {
    const interval = 1000 / fps;
    let last: number | null = null;

    return {
        tick(now: number): number | null {
            if (last === null) {
                last = now;

                return 0;
            }

            const elapsed = now - last;

            // Toleransi 1 ms supaya layar 60 Hz tetap tepat 30 FPS.
            if (elapsed < interval - 1) {
                return null;
            }

            last = now;

            return Math.min(elapsed / 1000, MAX_STEP);
        },
        /** Dipanggil saat tab kembali terlihat: jeda tidak dihitung sebagai waktu berjalan. */
        reset(): void {
            last = null;
        },
    };
}

export type LoopHandle = { stop: () => void };

export function startLoop(
    step: (dt: number) => void,
    fps = TARGET_FPS,
): LoopHandle {
    const clock = createFrameClock(fps);
    let frame = 0;
    let stopped = false;

    const run = (now: number) => {
        if (stopped) {
            return;
        }

        const dt = clock.tick(now);

        if (dt !== null) {
            step(dt);
        }

        frame = requestAnimationFrame(run);
    };

    const onVisibility = () => {
        cancelAnimationFrame(frame);

        if (!document.hidden && !stopped) {
            clock.reset();
            frame = requestAnimationFrame(run);
        }
    };

    document.addEventListener('visibilitychange', onVisibility);

    if (!document.hidden) {
        frame = requestAnimationFrame(run);
    }

    return {
        stop() {
            stopped = true;
            cancelAnimationFrame(frame);
            document.removeEventListener('visibilitychange', onVisibility);
        },
    };
}

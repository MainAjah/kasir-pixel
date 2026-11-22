import { useCallback, useEffect, useRef } from 'react';
import { soundCues } from '@/diorama/engine/sound-cues';
import type { SoundSnapshot } from '@/diorama/engine/sound-cues';
import type { DioramaWorld } from '@/diorama/engine/world';
import { ChipSound } from './chip-sound';

function snapshotOf(world: DioramaWorld): SoundSnapshot {
    return {
        cashierState: world.cashier.state,
        cashierTime: world.cashier.stateTime,
        customers: world.customers.map((c) => c.id),
    };
}

/**
 * Bunyi Beranda (Tahap 5D-2, revisi pemilik): selalu menyala, tanpa tombol
 * senyap. Browser hanya mengizinkan suara setelah ada interaksi, jadi konteks
 * audio dibuka pada klik, sentuhan, atau tombol keyboard pertama di halaman.
 */
export function useSceneSound() {
    const chip = useRef<ChipSound | null>(null);
    const last = useRef<SoundSnapshot | null>(null);

    useEffect(() => {
        const unlock = () => {
            chip.current ??= new ChipSound();
            chip.current.unlock();
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
        };

        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);

        return () => {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
            chip.current?.close();
            chip.current = null;
        };
    }, []);

    /** Dipanggil tiap bingkai animasi: bunyikan perubahan keadaan. */
    return useCallback((world: DioramaWorld) => {
        const next = snapshotOf(world);
        const cues = soundCues(last.current, next);
        last.current = next;

        for (const cue of cues) {
            chip.current?.play(cue);
        }
    }, []);
}

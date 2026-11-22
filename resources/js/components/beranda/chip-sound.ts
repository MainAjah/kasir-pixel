/**
 * Bunyi 8-bit dari kode (Web Audio): gelombang kotak dan segitiga, tanpa berkas
 * suara luar. Konteks audio baru dibuat saat pengguna menyalakan bunyi (browser
 * hanya mengizinkannya setelah ada klik). Volume kecil.
 */
import type { SoundCue } from '@/diorama/engine/sound-cues';

type Note = {
    freq: number;
    /** Mulai (detik setelah sekarang) dan lama nada. */
    at: number;
    length: number;
    wave: OscillatorType;
    volume?: number;
};

const CUES: Record<SoundCue, Note[]> = {
    // Bip scanner.
    bip: [{ freq: 1760, at: 0, length: 0.06, wave: 'square', volume: 0.5 }],
    // Koin masuk lalu laci kasir: dua nada naik.
    koin: [
        { freq: 988, at: 0, length: 0.07, wave: 'square' },
        { freq: 1319, at: 0.07, length: 0.16, wave: 'square' },
    ],
    // Batal: dengung rendah.
    batal: [{ freq: 140, at: 0, length: 0.28, wave: 'square', volume: 0.6 }],
    // Kejar: alarm dua nada, tiga kali.
    kejar: [0, 1, 2].flatMap((k) => [
        { freq: 880, at: k * 0.24, length: 0.11, wave: 'square' as const },
        {
            freq: 660,
            at: k * 0.24 + 0.12,
            length: 0.11,
            wave: 'square' as const,
        },
    ]),
    // Lonceng pintu: pelan.
    pintu: [
        { freq: 1047, at: 0, length: 0.12, wave: 'triangle', volume: 0.6 },
        { freq: 784, at: 0.12, length: 0.2, wave: 'triangle', volume: 0.6 },
    ],
};

const MASTER = 0.07;

export class ChipSound {
    private ctx: AudioContext | null = null;

    /** Dipanggil dari klik tombol bunyi (syarat browser). */
    unlock(): void {
        try {
            this.ctx ??= new AudioContext();
            void this.ctx.resume();
        } catch {
            this.ctx = null;
        }
    }

    play(cue: SoundCue): void {
        const ctx = this.ctx;

        if (!ctx || ctx.state !== 'running') {
            return;
        }

        const now = ctx.currentTime;

        for (const note of CUES[cue]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + note.at;
            const end = start + note.length;
            const level = MASTER * (note.volume ?? 1);

            osc.type = note.wave;
            osc.frequency.setValueAtTime(note.freq, start);
            gain.gain.setValueAtTime(level, start);
            gain.gain.setValueAtTime(level, end - 0.02);
            gain.gain.linearRampToValueAtTime(0, end);
            osc.connect(gain).connect(ctx.destination);
            osc.start(start);
            osc.stop(end);
        }
    }

    close(): void {
        void this.ctx?.close();
        this.ctx = null;
    }
}

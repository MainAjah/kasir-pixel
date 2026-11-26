/**
 * Antarmuka tampilan diorama (Tahap 5H, docs/rencana-tahap-5h.md bagian 1).
 *
 * Logika (`DioramaWorld`) tidak tahu cara ia digambar. Tampilan Canvas yang
 * ada dan tampilan WebGL baru sama-sama memenuhi antarmuka ini, sehingga
 * Beranda bisa memilih atau berpindah tanpa mengubah dunia, aktor, maupun data.
 */
import type { Customer } from '../actors/customer';
import type { Point } from '../engine/iso';
import type { DioramaWorld } from '../engine/world';
import type { RenderOptions } from '../render/placeholder-renderer';

/** Titik di dunia: ubin (boleh pecahan) dan tinggi di atas lantai (satuan ubin). */
export type WorldAnchor = { gx: number; gy: number; z: number };

export interface DioramaView {
    readonly kind: 'canvas' | 'webgl';
    /** Pasang kanvas tampilan ke dalam `host`. */
    attach(host: HTMLElement): void;
    /** Ukuran wadah dalam piksel CSS dan devicePixelRatio. */
    resize(cssWidth: number, cssHeight: number, dpr: number): void;
    /** Gambar satu bingkai. `dt` detik sejak bingkai sebelumnya. */
    render(world: DioramaWorld, options: RenderOptions, dt: number): void;
    /** Titik dunia → piksel CSS relatif terhadap wadah (null bila di luar). */
    toScreen(anchor: WorldAnchor): Point | null;
    /** Pelanggan di titik layar (piksel CSS relatif wadah), atau null. */
    pick(point: Point): Customer | null;
    /** Dipanggil bila tampilan tidak bisa dipakai lagi (mis. konteks WebGL hilang). */
    onLost(callback: () => void): void;
    /** Lepas semua sumber daya (GPU, pendengar, kanvas). */
    dispose(): void;
}

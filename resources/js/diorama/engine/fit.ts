import { CANVAS_H, CANVAS_W } from './iso';

/**
 * Skala tampilan kanvas untuk Beranda (memenuhi layar): sebesar mungkin yang
 * muat di wadah. Bila kelipatan bulat piksel layar (memperhitungkan
 * devicePixelRatio) masih mengisi paling sedikit 90% ruang, dipakai kelipatan
 * bulat itu supaya piksel tetap rata; selain itu skala pecahan.
 */
export function screenScale(width: number, height: number, dpr = 1): number {
    const fit = Math.min(width / CANVAS_W, height / CANVAS_H);

    if (fit <= 0) {
        return 0;
    }

    const device = fit * dpr;
    const whole = Math.floor(device);

    return whole >= 1 && whole / device >= 0.9 ? whole / dpr : fit;
}

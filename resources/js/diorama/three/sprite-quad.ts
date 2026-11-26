/**
 * Letak sprite karakter di gambar dalam (Tahap 5H a2), murni.
 *
 * Aturan:
 * - 1 piksel gambar karakter = 1 piksel dalam (tanpa resample, tanpa diskala
 *   menurut jarak); lensa perspektif hanya menentukan letak titik pijak;
 * - titik pijak dibulatkan ke sudut piksel terdekat, lalu piksel kaki gambar
 *   (footX, footY) diletakkan tepat di bawah-kanan titik itu, sama dengan cara
 *   Canvas (`drawImage(sprite, x - footX, y - footY)`);
 * - seluruh sprite memakai kedalaman titik pijaknya (seperti berdiri tegak di
 *   sana), jadi yang di depan menutupi yang di belakang menurut kaki.
 */

export type SpriteFrame = {
    w: number;
    h: number;
    /** Piksel kaki di gambar (kolom dan baris dari atas). */
    footX: number;
    footY: number;
};

/** Kotak sprite dalam piksel dalam, y ke atas, semua bilangan bulat. */
export type PixelRect = {
    left: number;
    right: number;
    bottom: number;
    top: number;
};

/**
 * `foot` = titik pijak di gambar dalam (piksel, y ke atas, boleh pecahan).
 * `hover` = melayang di atas lantai (piksel), mis. pahlawan berzirah.
 */
export function spriteRect(
    foot: { x: number; y: number },
    frame: SpriteFrame,
    hover = 0,
): PixelRect {
    const px = Math.round(foot.x);
    const py = Math.round(foot.y);
    const left = px - frame.footX;
    const top = py + frame.footY + hover;

    return { left, right: left + frame.w, top, bottom: top - frame.h };
}

/** Kotak piksel → koordinat NDC (−1…1) gambar dalam berukuran `size`. */
export function rectToNdc(
    rect: PixelRect,
    size: { width: number; height: number },
): PixelRect {
    const nx = (x: number) => (x / size.width) * 2 - 1;
    const ny = (y: number) => (y / size.height) * 2 - 1;

    return {
        left: nx(rect.left),
        right: nx(rect.right),
        bottom: ny(rect.bottom),
        top: ny(rect.top),
    };
}

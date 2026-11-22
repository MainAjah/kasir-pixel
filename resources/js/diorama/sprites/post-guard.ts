/**
 * Penjaga pos di Beranda (Tahap 5D-2).
 *
 * - Pos Kasir: zombie dari gambar pemilik (karakter wajib).
 * - Pos Inventaris: gambar pemilik menyusul (akan diunggah). Selama belum ada,
 *   dipakai sosok pengganti sementara buatan kode (pelanggan buatan kode berbaju
 *   kunyit), hanya warna palet.
 *
 * Potret besar di panel memakai gambar yang sama, diperbesar skala bulat, tanpa
 * ekspresi tambahan. Murni kecuali `referenceMatrix` (peta gambar yang dimuat).
 */
import type { PostKey } from '../scenes/store-scene';
import { buildCustomerFrame } from './customer-sprite';
import type { CustomerVariant } from './customer-sprite';
import { mirror } from './pixels';
import type { PixelMatrix } from './pixels';
import { referenceMatrix } from './reference-loader';
import { referenceByKey } from './reference-sprite';

/** Kunci gambar pemilik untuk tiap penjaga pos (penjaga Inventaris menyusul). */
export const POST_GUARD_KEYS: Record<PostKey, string> = {
    kasir: 'zombie',
    inventaris: 'inventaris',
};

/** Sosok pengganti penjaga Inventaris: kulit terang, rambut cokelat, baju kunyit, celana biru tua. */
export const INVENTORY_PLACEHOLDER: CustomerVariant = {
    skin: 0,
    hair: 0,
    shirt: 1,
    pants: 0,
};

/** Gambar penjaga Inventaris sementara (menghadap depan, diam). */
export function inventoryPlaceholderFrame(frame = 0): PixelMatrix {
    return buildCustomerFrame(INVENTORY_PLACEHOLDER, 'depan', 'diam', frame);
}

/** Apakah penjaga pos ini masih memakai sosok pengganti. */
export function usesPlaceholder(post: PostKey): boolean {
    return referenceMatrix(POST_GUARD_KEYS[post]) === null;
}

/**
 * Potret penjaga untuk panel karakter besar: gambar asli, dicermin bila perlu
 * supaya menghadap ke kanan (ke arah kotak dialog). null bila gambar wajib
 * (zombie) belum termuat.
 */
export function guardPortrait(post: PostKey): PixelMatrix | null {
    const key = POST_GUARD_KEYS[post];
    const src = referenceMatrix(key);

    if (src) {
        return referenceByKey(key)?.natural === 'kiri' ? mirror(src) : src;
    }

    return post === 'inventaris' ? inventoryPlaceholderFrame() : null;
}

/** Batas skala bulat potret besar. */
export const PORTRAIT_SCALE: readonly [number, number] = [3, 14];

/**
 * Luas sasaran potret dibanding kotak `ukuran × ukuran`. Nilai ini membuat zombie
 * (27 × 41) tetap 9× di layar 1366 × 768, ukuran yang sudah disetujui pemilik.
 */
export const PORTRAIT_AREA = 0.68;

/**
 * Skala bulat potret, 3× sampai 14×. Disamakan menurut luas, bukan tinggi, supaya
 * semua penjaga tampak sama besar (revisi pemilik: gurita disamakan dengan
 * zombie). Karakter kurus seperti gurita (19 × 46) jadi lebih tinggi dari
 * zombie, tetapi tidak pernah melebihi `capHeight`.
 */
export function portraitScale(
    width: number,
    height: number,
    size: number,
    capHeight = Number.POSITIVE_INFINITY,
): number {
    const [min, max] = PORTRAIT_SCALE;
    const byArea = Math.floor(
        Math.sqrt((size * size * PORTRAIT_AREA) / Math.max(1, width * height)),
    );
    const byCap = Math.floor(capHeight / Math.max(1, height));

    return Math.max(min, Math.min(max, byArea, byCap));
}

/**
 * Ukuran dasar potret di panel (revisi pemilik: potret dan dialog lebih kecil,
 * potret tetap lebih tinggi dari kotak dialog). Layar lebar: sampai 380 px atau
 * 48% tinggi layar. Layar sempit: sampai 320 px, menyisakan tempat untuk kotak
 * dialog di bawah potret.
 */
export function portraitMaxHeight(width: number, height: number): number {
    return width >= 640
        ? Math.min(380, Math.round(height * 0.48))
        : Math.min(320, Math.max(120, height - 360));
}

/** Tinggi potret paling besar yang masih muat di layar (dengan sisa tempat). */
export function portraitCap(width: number, height: number): number {
    return width >= 640 ? height - 140 : portraitMaxHeight(width, height);
}

/**
 * Ukuran dunia diorama 3D (Tahap 5H). Satu satuan dunia = satu ubin denah
 * (gx → sumbu x, gy → sumbu z, tinggi → sumbu y; lantai di y = 0).
 *
 * Kepadatan dipilih supaya hasilnya sama dengan diorama Canvas sekarang:
 * - pada kemiringan 30° dan arah 45°, satu ubin tampil sebagai belah ketupat
 *   64 × 32 piksel dalam, persis ubin iso 2:1 di Canvas (PX_PER_UNIT);
 * - lantai dan arah sepanjang dinding 16 texel per ubin, sehingga tiap texel
 *   menjadi langkah 2 × 1 piksel seperti garis iso pixel art;
 * - arah tegak 1 texel = 1 piksel (TEXEL_V), sehingga dinding 80 texel setinggi
 *   80 piksel dan alas 23 texel setinggi 23 piksel, sama dengan Canvas;
 * - sprite yang menghadap kamera (karakter, langkah a2) 1 piksel = 1 texel.
 */
import { BASE_TEXELS } from '../assets/procedural/brick';
import { WALL_TEXELS } from '../assets/procedural/wall';

export const DEG = Math.PI / 180;

/** Kemiringan kamera bawaan (derajat di atas bidang datar). */
export const PITCH_DEG = 30;
/** Arah kamera: 45°, dua dinding belakang terlihat seperti denah iso. */
export const YAW_DEG = 45;

/** Piksel dalam per satuan dunia di bidang fokus (diagonal ubin = 64 px). */
export const PX_PER_UNIT = 64 / Math.SQRT2;

/** Texel tekstur lantai dan sepanjang dinding per ubin. */
export const TEXELS_PER_TILE = 16;
export const TEXEL = 1 / TEXELS_PER_TILE;

/** Tinggi satu texel tegak (satuan dunia) = 1 piksel dalam pada kemiringan bawaan. */
export const TEXEL_V = 1 / (PX_PER_UNIT * Math.cos(PITCH_DEG * DEG));

export const WALL_H = WALL_TEXELS * TEXEL_V;
export const BASE_H = BASE_TEXELS * TEXEL_V;
export const WALL_THICK_TEXELS = 4;
export const WALL_T = WALL_THICK_TEXELS * TEXEL;

/** Ruang kosong di sekeliling balok toko saat menghitung skala (piksel dalam). */
export const FRAME_MARGIN = 28;

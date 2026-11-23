/**
 * Kelas bersama halaman tabel bergaya pixel (Tahap 5E-2), mengikuti tombol dan
 * tab layar kasir 5E-1. Hanya warna palet (token px-*).
 */

const FOCUS =
    'focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none';

/** Tombol utama: kunyit berbingkai tinta dengan bayangan keras. */
export const PRIMARY_BUTTON = `inline-flex h-10 items-center gap-2 border-2 border-px-tinta bg-px-kunyit px-4 font-pixel text-base text-px-tinta shadow-[3px_3px_0_var(--color-px-tinta)] hover:bg-px-kunyit-tua active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--color-px-tinta)] disabled:cursor-not-allowed disabled:bg-px-dinding disabled:text-px-bayangan disabled:shadow-none ${FOCUS}`;

/** Tombol kedua: dinding krem berbingkai tinta. */
export const SECONDARY_BUTTON = `inline-flex h-10 items-center gap-2 border-2 border-px-tinta bg-px-dinding px-4 font-pixel text-base text-px-tinta hover:bg-px-lampu disabled:cursor-not-allowed disabled:text-px-bayangan ${FOCUS}`;

/** Tombol ikon kotak 32 px untuk kolom aksi tabel. */
export const ICON_BUTTON = `inline-grid size-8 place-items-center border-2 border-px-tinta bg-px-sorotan text-px-tinta hover:bg-px-lampu ${FOCUS}`;

/** Tombol teks kecil di kolom aksi (Aktifkan/Nonaktifkan); warna latar dari pemakai. */
export const TOGGLE_BUTTON = `inline-flex h-8 items-center border-2 border-px-tinta px-2 font-pixel text-xs text-px-tinta disabled:cursor-not-allowed disabled:bg-px-dinding disabled:text-px-bayangan ${FOCUS}`;

/** Tab: kunyit saat aktif, dinding krem saat tidak. */
export const TAB = `inline-flex h-9 items-center gap-2 border-2 border-px-tinta px-3 font-pixel text-sm text-px-tinta ${FOCUS}`;
export const TAB_ACTIVE =
    'bg-px-kunyit shadow-[2px_2px_0_var(--color-px-tinta)]';
export const TAB_IDLE = 'bg-px-dinding hover:bg-px-lampu';

/** Kolom isian bergaya pixel (kotak krem bertepi tinta). */
export const FIELD = `h-10 border-2 border-px-tinta bg-px-sorotan px-3 text-sm text-px-tinta placeholder:text-px-bayangan ${FOCUS}`;

/** Kepala dan baris tabel di dalam PixelTable. */
export const THEAD = 'bg-px-dinding text-left text-px-tinta';
export const TBODY = 'bg-px-sorotan';
export const ROW = 'border-t-2 border-dashed border-px-lantai';

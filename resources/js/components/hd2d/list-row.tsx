import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import '../../../css/hd2d.css';

type ListProps = ComponentPropsWithRef<'div'> & {
    /** Nama daftar untuk pembaca layar, mis. "Daftar barang". */
    label: string;
};

/**
 * Wadah daftar pilihan (role listbox). Pola yang dianjurkan untuk kasir:
 * fokus tetap di kolom cari, baris aktif ditunjuk lewat
 * `aria-activedescendant` di kolom itu, panah atas/bawah memindah, Enter menambah.
 */
export function HdList({ label, className, children, ...rest }: ListProps) {
    return (
        <div
            role="listbox"
            aria-label={label}
            className={cn('hd-daftar', className)}
            {...rest}
        >
            {children}
        </div>
    );
}

type RowProps = {
    /** Id unik (dipakai aria-activedescendant). */
    id: string;
    /** Nama barang asli dari data. */
    name: ReactNode;
    /** Nama bergaya RPG: hiasan kecil miring emas, tidak mengubah data. */
    rpgName?: ReactNode;
    price: ReactNode;
    stock?: ReactNode;
    /** Stok habis: teks stok merah lembut. */
    stockOut?: boolean;
    /** Gambar atau ikon 40 px (gambar piksel tetap tajam). */
    icon?: ReactNode;
    /** Baris aktif: kursor berlian emas berkedip. */
    selected?: boolean;
    /** Tidak bisa ditambah (mis. stok habis): baris redup, kursor dilarang. */
    disabled?: boolean;
    onActivate?: () => void;
    onPointerEnter?: () => void;
    className?: string;
};

/**
 * Baris daftar HD-2D (Tahap B1): ikon, nama, nama RPG, harga tabular, stok.
 * Hover memberi gradasi emas tipis; baris terpilih memberi kursor berlian.
 * Klik selalu menjalankan `onActivate`, juga di baris nonaktif, supaya
 * pemanggil bisa menjelaskan alasannya (mis. stok habis); pemanggil yang
 * menolak penambahan. Papan ketik ditangani wadahnya (lihat HdList), jadi baris
 * tidak masuk urutan Tab sendiri.
 */
export default function HdListRow({
    id,
    name,
    rpgName,
    price,
    stock,
    stockOut = false,
    icon,
    selected = false,
    disabled = false,
    onActivate,
    onPointerEnter,
    className,
}: RowProps) {
    return (
        // Pilihan di dalam listbox: papan ketik lewat aria-activedescendant di wadah.
        // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
        <div
            role="option"
            id={id}
            aria-selected={selected}
            aria-disabled={disabled || undefined}
            className={cn('hd-baris', className)}
            onClick={onActivate}
            onPointerEnter={onPointerEnter}
        >
            <span className="hd-baris__ikon" aria-hidden="true">
                {icon}
            </span>
            <span className="min-w-0">
                <span className="hd-baris__nama block">{name}</span>
                {rpgName && (
                    <span className="hd-baris__rpg block">{rpgName}</span>
                )}
            </span>
            <span className="hd-baris__kanan">
                <span className="hd-baris__harga block">{price}</span>
                {stock !== undefined && (
                    <span
                        className={cn(
                            'hd-baris__stok block',
                            stockOut && 'hd-baris__stok--habis',
                        )}
                    >
                        {stock}
                    </span>
                )}
            </span>
        </div>
    );
}

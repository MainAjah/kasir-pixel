import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils';
import '../../../css/hd2d.css';

type Props = Omit<ComponentPropsWithRef<'button'>, 'type'> & {
    /** Primer: emas (Bayar, Simpan). Sekunder: garis emas (Batal, Tutup). */
    variant?: 'primer' | 'sekunder';
    size?: 'kecil' | 'sedang' | 'besar';
    /** Selebar wadahnya. */
    block?: boolean;
    /** Kirim form. Bawaan tombol biasa agar tidak mengirim form tanpa sengaja. */
    submit?: boolean;
};

/** Tombol HD-2D (Tahap B1). Fokus keyboard ditandai garis emas. */
export default function HdButton({
    variant = 'primer',
    size = 'sedang',
    block = false,
    submit = false,
    className,
    ...rest
}: Props) {
    const classes = cn(
        'hd-tombol',
        `hd-tombol--${variant}`,
        size !== 'sedang' && `hd-tombol--${size}`,
        block && 'hd-tombol--penuh',
        className,
    );

    return submit ? (
        <button type="submit" className={classes} {...rest} />
    ) : (
        <button type="button" className={classes} {...rest} />
    );
}

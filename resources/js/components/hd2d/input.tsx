import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import '../../../css/hd2d.css';

type Props = Omit<ComponentPropsWithRef<'input'>, 'prefix'> & {
    label: ReactNode;
    /** Sembunyikan label secara visual (tetap dibaca pembaca layar). */
    hideLabel?: boolean;
    hint?: ReactNode;
    error?: ReactNode;
    /** Teks kecil emas di kiri isian, mis. "Rp". Sebut juga satuannya di label. */
    leading?: ReactNode;
    /** Angka uang: rata kanan, tabular, papan ketik angka di HP. */
    numeric?: boolean;
};

/**
 * Isian HD-2D (Tahap B1): kolom gelap bergaris bawah emas, label Spectral,
 * pesan galat merah lembut yang terhubung lewat aria-describedby.
 */
export default function HdInput({
    label,
    hideLabel = false,
    hint,
    error,
    leading,
    numeric = false,
    className,
    id,
    disabled,
    ...rest
}: Props) {
    const auto = useId();
    const inputId = id ?? `${auto}-isian`;
    const hintId = hint ? `${inputId}-petunjuk` : undefined;
    const errorId = error ? `${inputId}-galat` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ');

    return (
        <div className={cn('hd-isian', className)}>
            <label
                htmlFor={inputId}
                className={cn('hd-label', hideLabel && 'sr-only')}
            >
                {label}
            </label>
            <div
                className={cn('hd-kolom', numeric && 'hd-kolom--angka')}
                data-galat={error ? '' : undefined}
                data-nonaktif={disabled ? '' : undefined}
            >
                {leading && (
                    <span className="hd-kolom__awalan" aria-hidden="true">
                        {leading}
                    </span>
                )}
                <input
                    id={inputId}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy || undefined}
                    inputMode={numeric ? 'numeric' : undefined}
                    {...rest}
                />
            </div>
            {hint && (
                <p id={hintId} className="hd-pesan">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} className="hd-pesan hd-pesan--galat">
                    {error}
                </p>
            )}
        </div>
    );
}

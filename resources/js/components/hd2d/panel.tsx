import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import '../../../css/hd2d.css';

const CORNERS = ['kiri-atas', 'kanan-atas', 'kiri-bawah', 'kanan-bawah'];

/** Empat berlian emas di sudut garis dalam (hiasan, disembunyikan dari pembaca layar). */
export function HdCorners() {
    return (
        <>
            {CORNERS.map((corner) => (
                <span
                    key={corner}
                    aria-hidden="true"
                    className={`hd-berlian hd-berlian--${corner}`}
                />
            ))}
        </>
    );
}

type Props = Omit<ComponentPropsWithRef<'section'>, 'title'> & {
    title?: ReactNode;
    description?: ReactNode;
    /** Tombol atau keterangan kecil di kanan kepala panel. */
    actions?: ReactNode;
    /** Latar lebih pekat (modal, dialog di atas adegan ramai). */
    solid?: boolean;
};

/**
 * Panel HD-2D (Tahap B1): latar gelap kebiruan setengah tembus, garis emas
 * tipis ganda, berlian kecil di keempat sudut, judul Cinzel.
 */
export default function HdPanel({
    title,
    description,
    actions,
    solid = false,
    className,
    children,
    ...rest
}: Props) {
    const id = useId();
    const titleId = title ? `${id}-judul` : undefined;

    return (
        <section
            aria-labelledby={titleId}
            className={cn('hd-panel', solid && 'hd-panel--pekat', className)}
            {...rest}
        >
            <HdCorners />
            {(title || description || actions) && (
                <header className="hd-panel__kepala">
                    <div className="min-w-0">
                        {title && (
                            <h2
                                id={titleId}
                                className="hd-judul hd-panel__judul"
                            >
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p className="hd-panel__keterangan">
                                {description}
                            </p>
                        )}
                    </div>
                    {actions}
                </header>
            )}
            {children}
        </section>
    );
}

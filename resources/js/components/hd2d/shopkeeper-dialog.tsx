import { useEffect, useState } from 'react';
import BigPortrait from '@/components/beranda/big-portrait';
import { cn } from '@/lib/utils';
import { sliceChars, typedLength } from './logic';
import { HdCorners } from './panel';
import { HD_TYPING_CPS } from './tokens';
import { useReducedMotion } from './use-reduced-motion';
import '../../../css/hd2d.css';

export type HdTone = 'normal' | 'galat' | 'sukses';

type Props = {
    /** Kalimat penjaga toko. Kalimat baru mulai diketik dari awal. */
    message: string;
    /** Galat merah lembut (mis. uang kurang), sukses hijau lembut. */
    tone?: HdTone;
    /** Papan nama di atas kalimat. */
    name?: string;
    className?: string;
};

/**
 * Dialog penjaga toko (Tahap B1): potret zombie (gambar pemilik, tidak
 * digambar ulang) dan kalimat yang muncul seperti diketik. Pembaca layar
 * menerima kalimat utuh sekali lewat wilayah status; teks yang diketik
 * disembunyikan dari mereka. Gerak dikurangi: kalimat langsung utuh.
 */
export default function HdShopkeeperDialog({
    message,
    tone = 'normal',
    name = 'Penjaga Toko',
    className,
}: Props) {
    const reducedMotion = useReducedMotion();
    const total = Array.from(message).length;
    const [typing, setTyping] = useState({ message, count: 0 });

    // Kalimat baru: mulai lagi dari huruf pertama (penyesuaian saat render).
    if (typing.message !== message) {
        setTyping({ message, count: 0 });
    }

    useEffect(() => {
        if (reducedMotion || total === 0) {
            return;
        }

        const started = performance.now();
        let frame = requestAnimationFrame(function tick(now) {
            const count = typedLength(total, now - started, HD_TYPING_CPS);
            setTyping((t) => (t.count === count ? t : { ...t, count }));

            if (count < total) {
                frame = requestAnimationFrame(tick);
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [message, total, reducedMotion]);

    const shown = reducedMotion ? total : Math.min(typing.count, total);
    const done = shown >= total;

    return (
        <div
            className={cn('hd-panel hd-panel--pekat hd-penjaga', className)}
            data-nada={tone}
        >
            <HdCorners />
            <div className="hd-penjaga__potret" aria-hidden="true">
                <BigPortrait post="kasir" size={60} capHeight={84} flip />
            </div>
            <div className="min-w-0">
                <p className="hd-judul hd-penjaga__nama">{name}</p>
                <p className="hd-penjaga__teks" aria-hidden="true">
                    {sliceChars(message, shown)}
                    {done && <span className="hd-penjaga__lanjut" />}
                </p>
                <p className="sr-only" role="status" aria-live="polite">
                    {message}
                </p>
            </div>
        </div>
    );
}

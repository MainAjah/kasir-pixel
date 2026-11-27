import { useEffect, useEffectEvent, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HD_MOTION } from './tokens';
import '../../../css/hd2d.css';

export type HdBannerDetail = { label: ReactNode; value: ReactNode };

type Props = {
    open: boolean;
    title: ReactNode;
    /** Rincian di bawah judul, mis. total dan kembalian. */
    details?: readonly HdBannerDetail[];
    tone?: 'sukses' | 'galat';
    /** Lama tampil (ms) sebelum memudar dan memanggil onClose. */
    duration?: number;
    onClose?: () => void;
};

/**
 * Banner besar di tengah layar (Tahap B1), mis. "Transaksi Selesai" beserta
 * jumlah dan kembalian. Tidak menangkap klik dan tidak menunda input;
 * diumumkan lewat wilayah status yang selalu ada.
 */
export default function HdBanner({
    open,
    title,
    details,
    tone = 'sukses',
    duration = 2600,
    onClose,
}: Props) {
    const [leaving, setLeaving] = useState(false);
    const [wasOpen, setWasOpen] = useState(open);

    // Dibuka lagi: mulai dari keadaan masuk (penyesuaian saat render).
    if (open !== wasOpen) {
        setWasOpen(open);
        setLeaving(false);
    }

    const close = useEffectEvent(() => onClose?.());

    useEffect(() => {
        if (!open) {
            return;
        }

        const fade = setTimeout(() => setLeaving(true), duration);
        const end = setTimeout(() => close(), duration + HD_MOTION.sedang);

        return () => {
            clearTimeout(fade);
            clearTimeout(end);
        };
    }, [open, duration]);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            className="hd-banner-lapis hd-akar"
            role="status"
            aria-live="polite"
        >
            {open && (
                <div
                    className="hd-banner"
                    data-nada={tone}
                    data-keluar={leaving ? '' : undefined}
                >
                    <p className="hd-banner__judul">{title}</p>
                    {details && details.length > 0 && (
                        <dl className="hd-banner__rincian">
                            {details.map((detail, index) => (
                                <div key={index}>
                                    <dt>{detail.label}</dt>
                                    <dd>{detail.value}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>
            )}
        </div>,
        document.body,
    );
}

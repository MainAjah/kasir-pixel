import { useEffect } from 'react';
import type { Point } from '@/diorama/engine/iso';
import type { CustomerInfo } from '@/diorama/render/customer-info';

type Props = {
    info: CustomerInfo;
    /** Kepala pelanggan di kanvas dasar; kartu muncul di atasnya. */
    anchor: Point;
    scale: number;
    onClose: () => void;
};

/**
 * Kartu kecil saat pelanggan diklik (Tahap 5D-2): siapa dan barang yang
 * dibelinya. Ditutup dengan Esc, tombol ×, atau klik di tempat lain.
 */
export default function CustomerCard({ info, anchor, scale, onClose }: Props) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            role="status"
            className="pointer-events-auto absolute w-56 -translate-x-1/2 -translate-y-full border-[3px] border-[#2b2a33] bg-[#f7f1e3] p-2.5 text-xs text-[#2b2a33] shadow-[3px_3px_0_#2b2a33]"
            style={{ left: anchor.x * scale, top: anchor.y * scale - 6 }}
        >
            <div className="mb-1 flex items-start justify-between gap-2">
                <span className="font-bold">{info.title}</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup kartu pelanggan"
                    className="-mt-0.5 border-2 border-[#2b2a33] bg-[#fdf8f0] px-1 leading-none font-bold hover:bg-[#ffe9a8] focus-visible:outline-2 focus-visible:outline-[#6a9fc4]"
                >
                    ×
                </button>
            </div>
            {info.number && <div className="text-[#5b5470]">{info.number}</div>}
            {info.items.length > 0 && (
                <ul className="mt-1 list-none space-y-0.5">
                    {info.items.map((line, i) => (
                        <li key={i}>• {line}</li>
                    ))}
                </ul>
            )}
            {info.total && (
                <div className="mt-1 border-t-2 border-dashed border-[#d9c7a3] pt-1 font-bold">
                    Total {info.total}
                </div>
            )}
            {info.note && (
                <div className="mt-1 text-[#5b5470]">{info.note}</div>
            )}
        </div>
    );
}

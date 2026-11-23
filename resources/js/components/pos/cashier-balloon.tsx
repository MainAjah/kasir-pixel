import BigPortrait from '@/components/beranda/big-portrait';
import { formatRupiah } from '@/lib/format';

/** Ekor balon ucapan bertangga, menunjuk ke kiri (5 × 5 sel, 2px per sel). */
const TAIL = ['..kkk', '.kwww', 'kwwww', '.kwww', '..kkk'];

/**
 * Potret kasir (zombie, karakter wajib) di kiri bawah layar kasir dengan balon
 * total belanja (Tahap 5E-1). Hanya tampilan; total berasal dari keranjang.
 */
export default function CashierBalloon({
    total,
    count,
}: {
    total: number;
    count: number;
}) {
    return (
        <div className="hidden shrink-0 items-end gap-4 sm:flex">
            <BigPortrait post="kasir" size={130} capHeight={130} />

            <div className="relative mb-4 border-2 border-px-tinta bg-px-sorotan px-4 py-2 shadow-[3px_3px_0_var(--color-px-tinta)]">
                <svg
                    aria-hidden="true"
                    viewBox="0 0 5 5"
                    width={10}
                    height={10}
                    shapeRendering="crispEdges"
                    className="absolute bottom-3 -left-[10px]"
                >
                    {TAIL.flatMap((row, y) =>
                        row
                            .split('')
                            .map((ch, x) =>
                                ch === '.' ? null : (
                                    <rect
                                        key={`${x},${y}`}
                                        x={x}
                                        y={y}
                                        width={1}
                                        height={1}
                                        fill={
                                            ch === 'k'
                                                ? 'var(--color-px-tinta)'
                                                : 'var(--color-px-sorotan)'
                                        }
                                    />
                                ),
                            ),
                    )}
                </svg>

                <p className="text-xs text-px-bayangan">Total belanja</p>
                <p
                    className="font-pixel text-2xl leading-tight text-px-tinta"
                    aria-live="polite"
                >
                    {formatRupiah(total)}
                </p>
                <p className="text-xs text-px-tinta">
                    {count > 0
                        ? `${count} barang. Lanjut pembayaran?`
                        : 'Pindai atau pilih barang dulu.'}
                </p>
            </div>
        </div>
    );
}

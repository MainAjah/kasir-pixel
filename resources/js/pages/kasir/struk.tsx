import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import PosController from '@/actions/App/Http/Controllers/Pos/PosController';
import SaleController from '@/actions/App/Http/Controllers/Pos/SaleController';
import BigPortrait from '@/components/beranda/big-portrait';
import { formatNumber, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

type Item = {
    name: string;
    unit: string;
    qty: number;
    unit_price: number;
    line_total: number;
};

type Receipt = {
    number: string;
    time: string;
    cashier: string | null;
    member: { number: string; name: string } | null;
    total: number;
    tendered: number | null;
    change: number | null;
    method: string | null;
    is_voided: boolean;
    void_reason: string | null;
    items: Item[];
};

type StoreEventFlash = {
    name?: string;
    detail?: { number?: string };
};

/** Tanda centang 8 × 8 (tinta). */
const CHECK = [
    '........',
    '.......#',
    '......##',
    '#....##.',
    '##..##..',
    '.####...',
    '..##....',
    '........',
];

const BUTTON =
    'flex h-12 w-full items-center justify-center border-2 border-px-tinta font-pixel text-lg text-px-tinta shadow-[3px_3px_0_var(--color-px-tinta)] focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--color-px-tinta)]';

/*
 * Ukuran kertas termal 80 mm. Saat mencetak, hanya kertas struk yang tampil
 * (kerangka aplikasi dan kartu berhasil disembunyikan).
 */
const PRINT_CSS = `
@page { size: 80mm auto; margin: 4mm; }
@media print {
    body * { visibility: hidden !important; }
    #struk, #struk * { visibility: visible !important; }
    #struk { position: absolute; inset: 0 auto auto 0; width: 100%; max-width: none; box-shadow: none; border: 0; padding: 0; }
}`;

function CheckBadge() {
    return (
        <span className="mx-auto grid size-14 place-items-center border-2 border-px-tinta bg-px-daun shadow-[3px_3px_0_var(--color-px-tinta)]">
            <svg
                aria-hidden="true"
                viewBox="0 0 8 8"
                width={32}
                height={32}
                shapeRendering="crispEdges"
                className="text-px-tinta"
            >
                {CHECK.flatMap((row, y) =>
                    row
                        .split('')
                        .map((ch, x) =>
                            ch === '#' ? (
                                <rect
                                    key={`${x},${y}`}
                                    x={x}
                                    y={y}
                                    width={1}
                                    height={1}
                                    fill="currentColor"
                                />
                            ) : null,
                        ),
                )}
            </svg>
        </span>
    );
}

/** Kertas struk: tampil di layar dengan warna palet, dicetak hitam di atas putih. */
function Paper({ store, sale }: { store: string; sale: Receipt }) {
    return (
        <div
            id="struk"
            className="w-full max-w-[80mm] border-2 border-px-lantai bg-px-sorotan p-4 font-mono text-xs leading-5 text-px-tinta shadow-[3px_3px_0_var(--color-px-lantai)] print:bg-white print:text-black"
        >
            <div className="text-center">
                <div className="text-sm font-bold">{store}</div>
                <div>{sale.number}</div>
                <div>{sale.time}</div>
                <div>Kasir: {sale.cashier ?? '-'}</div>
                {sale.member && (
                    <div>
                        Anggota: {sale.member.name} ({sale.member.number})
                    </div>
                )}
            </div>

            {sale.is_voided && (
                <div className="my-2 border border-current p-1 text-center font-bold">
                    DIBATALKAN
                    {sale.void_reason && (
                        <div className="font-normal">{sale.void_reason}</div>
                    )}
                </div>
            )}

            <hr className="my-2 border-dashed border-current" />

            {sale.items.map((item, i) => (
                <div key={i} className="mb-1">
                    <div>{item.name}</div>
                    <div className="flex justify-between">
                        <span>
                            {formatNumber(item.qty)} {item.unit} ×{' '}
                            {formatNumber(item.unit_price)}
                        </span>
                        <span>{formatRupiah(item.line_total)}</span>
                    </div>
                </div>
            ))}

            <hr className="my-2 border-dashed border-current" />

            <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>{formatRupiah(sale.total)}</span>
            </div>
            <div className="flex justify-between">
                <span>{sale.method ?? 'Bayar'}</span>
                <span>{formatRupiah(sale.tendered)}</span>
            </div>
            <div className="flex justify-between">
                <span>Kembali</span>
                <span>{formatRupiah(sale.change)}</span>
            </div>

            <hr className="my-2 border-dashed border-current" />
            <div className="text-center">Terima kasih</div>
        </div>
    );
}

/**
 * Struk penjualan (Tahap 5E-1). Tepat setelah bayar (flash sale.completed untuk
 * nota ini) tampil kartu "Transaksi Berhasil" dengan Cetak Struk dan Transaksi
 * Baru; bila dibuka dari riwayat, hanya struk dengan tombol cetak.
 */
export default function Struk({
    store_name,
    sale,
}: {
    store_name: string;
    sale: Receipt;
}) {
    const flash = usePage().flash as { store_event?: StoreEventFlash };
    const justPaid =
        flash.store_event?.name === 'sale.completed' &&
        flash.store_event.detail?.number === sale.number;
    const nextRef = useRef<HTMLAnchorElement>(null);

    // Enter langsung membuka transaksi baru (autoFocus React tidak berlaku untuk tautan).
    useEffect(() => {
        if (justPaid) {
            nextRef.current?.focus();
        }
    }, [justPaid]);

    return (
        <>
            <Head
                title={justPaid ? 'Transaksi berhasil' : `Struk ${sale.number}`}
            />
            <style>{PRINT_CSS}</style>

            {justPaid ? (
                <div className="flex flex-wrap items-start justify-center gap-8 p-4 lg:p-8">
                    <section
                        aria-labelledby="berhasil"
                        className="w-full max-w-sm"
                    >
                        <div className="-mb-1 flex justify-center">
                            <BigPortrait
                                post="kasir"
                                size={200}
                                capHeight={170}
                            />
                        </div>
                        <div className="space-y-4 bg-px-sorotan p-6 text-center pixel-frame">
                            <CheckBadge />
                            <h2
                                id="berhasil"
                                className="font-pixel text-3xl text-px-tinta"
                            >
                                Transaksi Berhasil!
                            </h2>
                            <div>
                                <p className="text-sm text-px-bayangan">
                                    Total pembayaran
                                </p>
                                <p className="font-pixel text-4xl text-px-tinta">
                                    {formatRupiah(sale.total)}
                                </p>
                            </div>
                            <dl className="grid grid-cols-2 gap-2 border-y-2 border-dashed border-px-lantai py-3 text-sm">
                                <div>
                                    <dt className="text-px-bayangan">
                                        {sale.method ?? 'Dibayar'}
                                    </dt>
                                    <dd className="font-pixel text-lg text-px-tinta">
                                        {formatRupiah(sale.tendered)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-px-bayangan">
                                        Kembalian
                                    </dt>
                                    <dd className="font-pixel text-lg text-px-tinta">
                                        {formatRupiah(sale.change)}
                                    </dd>
                                </div>
                            </dl>
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className={cn(
                                        BUTTON,
                                        'bg-px-dinding hover:bg-px-lampu',
                                    )}
                                >
                                    Cetak Struk
                                </button>
                                <Link
                                    href={PosController.index()}
                                    ref={nextRef}
                                    className={cn(
                                        BUTTON,
                                        'bg-px-kunyit hover:bg-px-kunyit-tua',
                                    )}
                                >
                                    Transaksi Baru
                                </Link>
                            </div>
                            <p className="text-xs text-px-bayangan">
                                Nota {sale.number}.{' '}
                                <Link
                                    href={SaleController.index()}
                                    className="font-semibold text-px-tinta underline"
                                >
                                    Lihat riwayat
                                </Link>
                            </p>
                        </div>
                    </section>

                    <Paper store={store_name} sale={sale} />
                </div>
            ) : (
                <div className="space-y-4 p-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className={cn(
                                BUTTON,
                                'h-10 w-auto bg-px-kunyit px-4 text-base hover:bg-px-kunyit-tua',
                            )}
                        >
                            Cetak Struk
                        </button>
                        <Link
                            href={SaleController.index()}
                            className={cn(
                                BUTTON,
                                'h-10 w-auto bg-px-dinding px-4 text-base hover:bg-px-lampu',
                            )}
                        >
                            Kembali ke riwayat
                        </Link>
                    </div>
                    <Paper store={store_name} sale={sale} />
                </div>
            )}
        </>
    );
}

Struk.layout = {
    breadcrumbs: [
        { title: 'Kasir', href: '/kasir' },
        { title: 'Struk penjualan', href: '/kasir/penjualan' },
    ],
};

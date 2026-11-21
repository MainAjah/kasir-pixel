import { Head, Link } from '@inertiajs/react';
import PosController from '@/actions/App/Http/Controllers/Pos/PosController';
import SaleController from '@/actions/App/Http/Controllers/Pos/SaleController';
import { Button } from '@/components/ui/button';
import { formatNumber, formatRupiah } from '@/lib/format';

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
    total: number;
    tendered: number | null;
    change: number | null;
    method: string | null;
    is_voided: boolean;
    void_reason: string | null;
    items: Item[];
};

/** Struk untuk dicetak dari browser (lebar 80 mm). Tanpa layout aplikasi. */
export default function Struk({
    store_name,
    sale,
}: {
    store_name: string;
    sale: Receipt;
}) {
    return (
        <>
            <Head title={`Struk ${sale.number}`} />

            {/* Ukuran kertas termal. Hanya berlaku saat mencetak. */}
            <style>{'@page { size: 80mm auto; margin: 4mm; }'}</style>

            <div className="min-h-screen bg-muted p-4 print:min-h-0 print:bg-white print:p-0">
                <div className="mx-auto mb-4 flex max-w-[80mm] flex-wrap gap-2 print:hidden">
                    <Button onClick={() => window.print()}>Cetak struk</Button>
                    <Button variant="secondary" asChild>
                        <Link href={PosController.index()}>Transaksi baru</Link>
                    </Button>
                    <Button variant="ghost" asChild>
                        <Link href={SaleController.index()}>Riwayat</Link>
                    </Button>
                </div>

                <div className="mx-auto max-w-[80mm] bg-white p-4 font-mono text-xs leading-5 text-black shadow print:max-w-none print:p-0 print:shadow-none">
                    <div className="text-center">
                        <div className="text-sm font-bold">{store_name}</div>
                        <div>{sale.number}</div>
                        <div>{sale.time}</div>
                        <div>Kasir: {sale.cashier ?? '-'}</div>
                    </div>

                    {sale.is_voided && (
                        <div className="my-2 border border-black p-1 text-center font-bold">
                            DIBATALKAN
                            {sale.void_reason && (
                                <div className="font-normal">
                                    {sale.void_reason}
                                </div>
                            )}
                        </div>
                    )}

                    <hr className="my-2 border-dashed border-black" />

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

                    <hr className="my-2 border-dashed border-black" />

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

                    <hr className="my-2 border-dashed border-black" />
                    <div className="text-center">Terima kasih</div>
                </div>
            </div>
        </>
    );
}

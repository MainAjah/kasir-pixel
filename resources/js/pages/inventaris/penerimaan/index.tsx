import { Head, Link } from '@inertiajs/react';
import StockReceiptController from '@/actions/App/Http/Controllers/Inventory/StockReceiptController';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import type { Paginated } from '@/types';

type Entry = {
    id: number;
    number: string;
    supplier_name: string | null;
    /** Tahap 6B: pemasok dari data master supplier. */
    from_master: boolean;
    note: string | null;
    occurred_at: string;
    lines: number;
    by: string | null;
};

export default function PenerimaanIndex({
    entries,
}: {
    entries: Paginated<Entry>;
}) {
    return (
        <>
            <Head title="Penerimaan barang" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Penerimaan barang"
                        description="Catatan barang masuk dari pemasok. Stok ada di kartu stok tiap produk."
                    />
                    <Button asChild>
                        <Link href={StockReceiptController.create()}>
                            Catat penerimaan
                        </Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Nomor</th>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Pemasok</th>
                                <th className="p-3 text-right">Baris</th>
                                <th className="p-3">Catatan</th>
                                <th className="p-3">Oleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        Belum ada penerimaan.
                                    </td>
                                </tr>
                            )}
                            {entries.data.map((e) => (
                                <tr key={e.id} className="border-t">
                                    <td className="p-3 font-mono">
                                        {e.number}
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {e.occurred_at}
                                    </td>
                                    <td className="p-3">
                                        {e.supplier_name ?? '-'}
                                        {e.from_master && (
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                (supplier terdaftar)
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {e.lines}
                                    </td>
                                    <td className="p-3">{e.note ?? '-'}</td>
                                    <td className="p-3">{e.by ?? '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination links={entries.links} />
            </div>
        </>
    );
}

PenerimaanIndex.layout = {
    breadcrumbs: [
        { title: 'Penerimaan barang', href: StockReceiptController.index() },
    ],
};

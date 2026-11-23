import { Head, Link } from '@inertiajs/react';
import StockReceiptController from '@/actions/App/Http/Controllers/Inventory/StockReceiptController';
import PixelTable, { Badge } from '@/components/admin/pixel-table';
import ProductThumb from '@/components/inventory/product-thumb';
import GuardCorner from '@/components/pixel/guard-corner';
import PixelPanel from '@/components/pixel/pixel-panel';
import { ROW, SECONDARY_BUTTON, TBODY, THEAD } from '@/components/pixel/styles';
import { formatNumber, formatRupiah } from '@/lib/format';

type Line = {
    id: number;
    product: string | null;
    sku: string | null;
    image_url: string | null;
    input_qty: number;
    input_unit: string | null;
    conversion: number | null;
    qty: number;
    base_unit: string | null;
    cost_total: number | null;
};

type Entry = {
    id: number;
    number: string;
    occurred_at: string;
    supplier_name: string | null;
    supplier: {
        name: string;
        contact: string | null;
        address: string | null;
    } | null;
    note: string | null;
    by: string | null;
    lines: Line[];
    total_cost: number;
    has_missing_cost: boolean;
};

/**
 * Detail penerimaan barang (Tahap 5E-2): pemasok, tanggal, catatan, lalu
 * daftar barang yang diterima. Hanya membaca dokumen dan mutasinya.
 */
export default function PenerimaanShow({ entry }: { entry: Entry }) {
    const info: [string, string][] = [
        ['Pemasok', entry.supplier?.name ?? entry.supplier_name ?? '-'],
        ['Tanggal terima', entry.occurred_at],
        ['Jenis barang', formatNumber(entry.lines.length)],
        [
            'Nilai pembelian',
            entry.total_cost > 0 ? formatRupiah(entry.total_cost) : '-',
        ],
    ];

    return (
        <>
            <Head title={`Penerimaan ${entry.number}`} />

            <div className="space-y-4 p-4">
                <PixelPanel
                    title={
                        <span className="flex flex-wrap items-center gap-3">
                            Penerimaan {entry.number}
                            <Badge tone="hijau">Diterima</Badge>
                        </span>
                    }
                    description={`Dicatat oleh ${entry.by ?? '-'}.`}
                    actions={
                        <Link
                            href={StockReceiptController.index()}
                            className={SECONDARY_BUTTON}
                        >
                            Kembali ke Stok Masuk
                        </Link>
                    }
                >
                    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                        {info.map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-xs text-px-bayangan">
                                    {label}
                                </dt>
                                <dd className="font-pixel text-lg leading-tight">
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    {(entry.supplier?.contact ||
                        entry.supplier?.address ||
                        entry.note) && (
                        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                            {entry.supplier?.contact && (
                                <div>
                                    <dt className="text-xs text-px-bayangan">
                                        Kontak pemasok
                                    </dt>
                                    <dd>{entry.supplier.contact}</dd>
                                </div>
                            )}
                            {entry.supplier?.address && (
                                <div>
                                    <dt className="text-xs text-px-bayangan">
                                        Alamat pemasok
                                    </dt>
                                    <dd>{entry.supplier.address}</dd>
                                </div>
                            )}
                            {entry.note && (
                                <div>
                                    <dt className="text-xs text-px-bayangan">
                                        Catatan
                                    </dt>
                                    <dd>{entry.note}</dd>
                                </div>
                            )}
                        </dl>
                    )}
                </PixelPanel>

                <PixelTable>
                    <thead className={THEAD}>
                        <tr>
                            <th className="p-3">Barang</th>
                            <th className="p-3 text-right">Jumlah diterima</th>
                            <th className="p-3 text-right">
                                Masuk stok (satuan dasar)
                            </th>
                            <th className="p-3 text-right">Harga beli</th>
                        </tr>
                    </thead>
                    <tbody className={TBODY}>
                        {entry.lines.map((l) => (
                            <tr key={l.id} className={ROW}>
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <ProductThumb url={l.image_url} />
                                        <div className="min-w-0">
                                            <div className="font-semibold">
                                                {l.product ?? '-'}
                                            </div>
                                            <div className="font-mono text-xs text-px-bayangan">
                                                {l.sku}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    <span className="font-pixel">
                                        {formatNumber(l.input_qty)}
                                    </span>{' '}
                                    <span className="text-xs text-px-bayangan">
                                        {l.input_unit}
                                        {l.conversion && l.conversion > 1
                                            ? ` (isi ${l.conversion})`
                                            : ''}
                                    </span>
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    <span className="font-pixel">
                                        +{formatNumber(l.qty)}
                                    </span>{' '}
                                    <span className="text-xs text-px-bayangan">
                                        {l.base_unit}
                                    </span>
                                </td>
                                <td className="p-3 text-right font-pixel whitespace-nowrap">
                                    {l.cost_total === null
                                        ? '-'
                                        : formatRupiah(l.cost_total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </PixelTable>

                <div className="flex items-end justify-between gap-4">
                    <p className="text-sm text-px-bayangan">
                        {entry.has_missing_cost
                            ? 'Baris tanpa harga beli tidak dihitung di nilai pembelian.'
                            : ''}
                    </p>
                    <GuardCorner post="inventaris" />
                </div>
            </div>
        </>
    );
}

PenerimaanShow.layout = {
    breadcrumbs: [
        { title: 'Barang masuk', href: StockReceiptController.index() },
        { title: 'Detail penerimaan', href: StockReceiptController.index() },
    ],
};

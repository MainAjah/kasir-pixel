import { Head } from '@inertiajs/react';
import StockOutController from '@/actions/App/Http/Controllers/Inventory/StockOutController';
import PixelTable, { Badge } from '@/components/admin/pixel-table';
import InventoryHeader from '@/components/inventory/inventory-header';
import type { InventoryStats } from '@/components/inventory/inventory-header';
import ProductThumb from '@/components/inventory/product-thumb';
import Pagination from '@/components/pagination';
import GuardCorner from '@/components/pixel/guard-corner';
import { ROW, TBODY, THEAD } from '@/components/pixel/styles';
import { formatNumber } from '@/lib/format';
import type { Paginated } from '@/types';

type Movement = {
    id: number;
    occurred_at: string;
    type: 'sale' | 'adjustment';
    type_label: string;
    product: string | null;
    sku: string | null;
    image_url: string | null;
    qty: number;
    base_unit: string | null;
    input_qty: number;
    input_unit: string | null;
    document: string | null;
    note: string | null;
    by: string | null;
    is_reversed: boolean;
};

/**
 * Inventaris, tab Stok Keluar (Tahap 5E-2): mutasi ledger yang mengurangi
 * stok (penjualan dan koreksi minus). Hanya membaca, khusus admin.
 */
export default function StokKeluar({
    stats,
    movements,
}: {
    stats: InventoryStats;
    movements: Paginated<Movement>;
}) {
    return (
        <>
            <Head title="Stok keluar" />

            <div className="space-y-4 p-4">
                <InventoryHeader stats={stats} active="keluar" />

                <p className="max-w-prose text-sm text-px-bayangan">
                    Barang yang keluar dari stok: penjualan dan koreksi minus.
                    Penjualan yang dibatalkan tetap tercatat, stoknya sudah
                    dikembalikan lewat mutasi pembalik.
                </p>

                <PixelTable>
                    <thead className={THEAD}>
                        <tr>
                            <th className="p-3">Waktu</th>
                            <th className="p-3">Barang</th>
                            <th className="p-3">Jenis</th>
                            <th className="p-3 text-right">Jumlah</th>
                            <th className="p-3">Keterangan</th>
                            <th className="p-3">Oleh</th>
                        </tr>
                    </thead>
                    <tbody className={TBODY}>
                        {movements.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-8 text-center text-px-bayangan"
                                >
                                    Belum ada barang keluar.
                                </td>
                            </tr>
                        )}
                        {movements.data.map((m) => (
                            <tr key={m.id} className={ROW}>
                                <td className="p-3 whitespace-nowrap">
                                    {m.occurred_at}
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <ProductThumb url={m.image_url} />
                                        <div className="min-w-0">
                                            <div className="font-semibold">
                                                {m.product ?? '-'}
                                            </div>
                                            <div className="font-mono text-xs text-px-bayangan">
                                                {m.sku}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <Badge
                                        tone={
                                            m.type === 'sale'
                                                ? 'biru'
                                                : 'kunyit'
                                        }
                                    >
                                        {m.type_label}
                                    </Badge>
                                    {m.is_reversed && (
                                        <span className="ml-1.5 align-middle">
                                            <Badge tone="bata">Batal</Badge>
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    <span className="font-pixel">
                                        {formatNumber(m.qty)}
                                    </span>{' '}
                                    <span className="text-xs text-px-bayangan">
                                        {m.base_unit}
                                    </span>
                                    {m.input_unit &&
                                        m.input_unit !== m.base_unit && (
                                            <div className="text-xs text-px-bayangan">
                                                ({formatNumber(m.input_qty)}{' '}
                                                {m.input_unit})
                                            </div>
                                        )}
                                </td>
                                <td className="p-3">
                                    {m.document && (
                                        <span className="font-mono">
                                            {m.document}
                                        </span>
                                    )}
                                    {m.note && (
                                        <span className="block text-xs text-px-bayangan">
                                            {m.note}
                                        </span>
                                    )}
                                    {!m.document && !m.note && '-'}
                                </td>
                                <td className="p-3">{m.by ?? '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </PixelTable>

                <div className="flex items-end justify-between gap-4">
                    <Pagination
                        links={movements.links}
                        from={movements.from}
                        to={movements.to}
                        total={movements.total}
                    />
                    <GuardCorner post="inventaris" />
                </div>
            </div>
        </>
    );
}

StokKeluar.layout = {
    breadcrumbs: [{ title: 'Stok keluar', href: StockOutController.index() }],
};

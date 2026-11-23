import { Head, Link } from '@inertiajs/react';
import StockReceiptController from '@/actions/App/Http/Controllers/Inventory/StockReceiptController';
import PixelTable, { Badge } from '@/components/admin/pixel-table';
import InventoryHeader from '@/components/inventory/inventory-header';
import type { InventoryStats } from '@/components/inventory/inventory-header';
import Pagination from '@/components/pagination';
import GuardCorner from '@/components/pixel/guard-corner';
import PixelGlyph, { GLYPHS } from '@/components/pixel/pixel-glyph';
import { PRIMARY_BUTTON, ROW, TBODY, THEAD } from '@/components/pixel/styles';
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

/**
 * Inventaris, tab Stok Masuk (Tahap 5E-2): daftar penerimaan barang dari
 * pemasok. Hanya admin (rute dijaga role:admin).
 */
export default function PenerimaanIndex({
    stats,
    entries,
}: {
    stats: InventoryStats;
    entries: Paginated<Entry>;
}) {
    return (
        <>
            <Head title="Penerimaan barang" />

            <div className="space-y-4 p-4">
                <InventoryHeader stats={stats} active="masuk" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-prose text-sm text-px-bayangan">
                        Barang masuk dari pemasok. Stok tiap barang ada di kartu
                        stoknya.
                    </p>
                    <Link
                        href={StockReceiptController.create()}
                        className={PRIMARY_BUTTON}
                    >
                        <PixelGlyph rows={GLYPHS.tambah} />
                        Catat penerimaan
                    </Link>
                </div>

                <PixelTable>
                    <thead className={THEAD}>
                        <tr>
                            <th className="p-3">Nomor</th>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">Pemasok</th>
                            <th className="p-3 text-right">Jenis barang</th>
                            <th className="p-3">Catatan</th>
                            <th className="p-3">Oleh</th>
                        </tr>
                    </thead>
                    <tbody className={TBODY}>
                        {entries.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-8 text-center text-px-bayangan"
                                >
                                    Belum ada penerimaan. Catat barang masuk
                                    pertama.
                                </td>
                            </tr>
                        )}
                        {entries.data.map((e) => (
                            <tr key={e.id} className={ROW}>
                                <td className="p-3 font-mono font-semibold">
                                    <Link
                                        href={StockReceiptController.show(e.id)}
                                        className="underline decoration-2 underline-offset-2 hover:text-px-bayangan"
                                    >
                                        {e.number}
                                    </Link>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                    {e.occurred_at}
                                </td>
                                <td className="p-3">
                                    {e.supplier_name ?? '-'}
                                    {e.from_master && (
                                        <span className="ml-2 align-middle">
                                            <Badge tone="biru">Terdaftar</Badge>
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-right font-pixel">
                                    {e.lines}
                                </td>
                                <td className="p-3">{e.note ?? '-'}</td>
                                <td className="p-3">{e.by ?? '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </PixelTable>

                <div className="flex items-end justify-between gap-4">
                    <Pagination
                        links={entries.links}
                        from={entries.from}
                        to={entries.to}
                        total={entries.total}
                    />
                    <GuardCorner post="inventaris" />
                </div>
            </div>
        </>
    );
}

PenerimaanIndex.layout = {
    breadcrumbs: [
        { title: 'Barang masuk', href: StockReceiptController.index() },
    ],
};

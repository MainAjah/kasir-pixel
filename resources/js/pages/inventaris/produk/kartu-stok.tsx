import { Head, Link } from '@inertiajs/react';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import StockAdjustmentController from '@/actions/App/Http/Controllers/Inventory/StockAdjustmentController';
import PixelTable, { Badge } from '@/components/admin/pixel-table';
import ProductThumb from '@/components/inventory/product-thumb';
import Pagination from '@/components/pagination';
import GuardCorner from '@/components/pixel/guard-corner';
import PixelPanel from '@/components/pixel/pixel-panel';
import {
    PRIMARY_BUTTON,
    ROW,
    SECONDARY_BUTTON,
    TBODY,
    THEAD,
} from '@/components/pixel/styles';
import { stockStatus } from '@/components/pos/catalog';
import { formatNumber } from '@/lib/format';
import type { Paginated } from '@/types';

type Movement = {
    id: number;
    occurred_at: string;
    type: string;
    qty: number;
    input_qty: number;
    unit: string | null;
    balance_after: number;
    note: string | null;
    document: string | null;
    by: string | null;
    is_reversal: boolean;
    is_reversed: boolean;
};

const STATUS = {
    aman: { tone: 'hijau', label: 'Aman' },
    menipis: { tone: 'kunyit', label: 'Menipis' },
    habis: { tone: 'bata', label: 'Habis' },
} as const;

/** Kartu stok satu barang (gaya pixel 5E-2): semua mutasi ledger, terbaru di atas. */
export default function KartuStok({
    product,
    movements,
}: {
    product: {
        id: number;
        sku: string;
        name: string;
        image_url: string | null;
        min_stock: number;
        stock: number;
        base_unit: string | null;
    };
    movements: Paginated<Movement>;
}) {
    const status = STATUS[stockStatus(product.stock, product.min_stock)];

    return (
        <>
            <Head title={`Kartu stok ${product.name}`} />

            <div className="space-y-4 p-4">
                <PixelPanel
                    title={
                        <span className="flex flex-wrap items-center gap-3">
                            <ProductThumb url={product.image_url} />
                            {product.name}
                            <Badge tone={status.tone}>{status.label}</Badge>
                        </span>
                    }
                    description={`SKU ${product.sku}. Stok dihitung dari ledger; koreksi menambah mutasi baru.`}
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={ProductController.index()}
                                className={SECONDARY_BUTTON}
                            >
                                Daftar barang
                            </Link>
                            <Link
                                href={StockAdjustmentController.create({
                                    query: { produk: product.id },
                                })}
                                className={PRIMARY_BUTTON}
                            >
                                Koreksi stok
                            </Link>
                        </div>
                    }
                >
                    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
                        <div>
                            <dt className="text-xs text-px-bayangan">
                                Stok sekarang
                            </dt>
                            <dd className="font-pixel text-2xl leading-tight">
                                {formatNumber(product.stock)}{' '}
                                <span className="font-sans text-sm text-px-bayangan">
                                    {product.base_unit}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-px-bayangan">
                                Stok minimum
                            </dt>
                            <dd className="font-pixel text-2xl leading-tight">
                                {formatNumber(product.min_stock)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-px-bayangan">
                                Jumlah mutasi
                            </dt>
                            <dd className="font-pixel text-2xl leading-tight">
                                {formatNumber(movements.total)}
                            </dd>
                        </div>
                    </dl>
                </PixelPanel>

                <PixelTable>
                    <thead className={THEAD}>
                        <tr>
                            <th className="p-3">Waktu</th>
                            <th className="p-3">Jenis</th>
                            <th className="p-3 text-right">Jumlah</th>
                            <th className="p-3 text-right">Saldo</th>
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
                                    Belum ada mutasi.
                                </td>
                            </tr>
                        )}
                        {movements.data.map((m) => (
                            <tr key={m.id} className={ROW}>
                                <td className="p-3 whitespace-nowrap">
                                    {m.occurred_at}
                                </td>
                                <td className="p-3">
                                    {m.type}
                                    {m.is_reversal && (
                                        <span className="ml-2 align-middle">
                                            <Badge tone="lavender">
                                                Pembalik
                                            </Badge>
                                        </span>
                                    )}
                                    {m.is_reversed && (
                                        <span className="ml-2 align-middle">
                                            <Badge tone="bata">
                                                Sudah dibalik
                                            </Badge>
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    <span className="font-pixel">
                                        {m.qty > 0 ? '+' : ''}
                                        {formatNumber(m.qty)}
                                    </span>
                                    {m.unit && m.input_qty !== m.qty && (
                                        <span className="block text-xs text-px-bayangan">
                                            ({m.input_qty > 0 ? '+' : ''}
                                            {formatNumber(m.input_qty)} {m.unit}
                                            )
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-right font-pixel">
                                    {formatNumber(m.balance_after)}
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

KartuStok.layout = {
    breadcrumbs: [
        { title: 'Produk', href: ProductController.index() },
        { title: 'Kartu stok', href: ProductController.index() },
    ],
};

import { Head, Link } from '@inertiajs/react';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import StockAdjustmentController from '@/actions/App/Http/Controllers/Inventory/StockAdjustmentController';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function KartuStok({
    product,
    movements,
}: {
    product: {
        id: number;
        sku: string;
        name: string;
        min_stock: number;
        stock: number;
        base_unit: string | null;
    };
    movements: Paginated<Movement>;
}) {
    return (
        <>
            <Head title={`Kartu stok ${product.name}`} />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title={`Kartu stok: ${product.name}`}
                        description={`SKU ${product.sku}. Stok sekarang ${formatNumber(product.stock)} ${product.base_unit ?? ''} (minimum ${formatNumber(product.min_stock)}).`}
                    />
                    <Button asChild>
                        <Link
                            href={StockAdjustmentController.create({
                                query: { produk: product.id },
                            })}
                        >
                            Koreksi stok
                        </Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Waktu</th>
                                <th className="p-3">Jenis</th>
                                <th className="p-3 text-right">Jumlah</th>
                                <th className="p-3 text-right">Saldo</th>
                                <th className="p-3">Keterangan</th>
                                <th className="p-3">Oleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        Belum ada mutasi.
                                    </td>
                                </tr>
                            )}
                            {movements.data.map((m) => (
                                <tr key={m.id} className="border-t">
                                    <td className="p-3 whitespace-nowrap">
                                        {m.occurred_at}
                                    </td>
                                    <td className="p-3">
                                        {m.type}
                                        {m.is_reversal && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-2"
                                            >
                                                Pembalik
                                            </Badge>
                                        )}
                                        {m.is_reversed && (
                                            <Badge
                                                variant="outline"
                                                className="ml-2"
                                            >
                                                Sudah dibalik
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        {m.qty > 0 ? '+' : ''}
                                        {formatNumber(m.qty)}
                                        {m.unit && m.input_qty !== m.qty && (
                                            <span className="block text-xs text-muted-foreground">
                                                ({m.input_qty > 0 ? '+' : ''}
                                                {formatNumber(m.input_qty)}{' '}
                                                {m.unit})
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                        {formatNumber(m.balance_after)}
                                    </td>
                                    <td className="p-3">
                                        {[m.document, m.note]
                                            .filter(Boolean)
                                            .join(' · ') || '-'}
                                    </td>
                                    <td className="p-3">{m.by ?? '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination links={movements.links} />
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

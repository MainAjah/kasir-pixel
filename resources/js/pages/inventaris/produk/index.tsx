import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import StockCardController from '@/actions/App/Http/Controllers/Inventory/StockCardController';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNumber, formatRupiah } from '@/lib/format';
import type { Paginated } from '@/types';

type Row = {
    id: number;
    sku: string;
    name: string;
    category: string | null;
    stock: number;
    min_stock: number;
    is_active: boolean;
    base_unit: string | null;
    base_price: number | null;
    is_low: boolean;
};

export default function ProdukIndex({
    products,
    filters,
}: {
    products: Paginated<Row>;
    filters: { q: string; menipis: boolean };
}) {
    const [q, setQ] = useState(filters.q);
    const [low, setLow] = useState(filters.menipis);

    function search(nextQ = q, nextLow = low) {
        router.get(
            ProductController.index.url({
                query: {
                    q: nextQ || undefined,
                    menipis: nextLow ? 1 : undefined,
                },
            }),
            {},
            { preserveState: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Produk" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Produk"
                        description="Stok dihitung dari ledger mutasi, bukan kolom yang ditimpa."
                    />
                    <Button asChild>
                        <Link href={ProductController.create()}>
                            Tambah produk
                        </Link>
                    </Button>
                </div>

                <form
                    className="flex flex-wrap items-center gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        search();
                    }}
                >
                    <Input
                        className="max-w-xs"
                        placeholder="Cari nama, SKU, atau barcode"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={low}
                            onChange={(e) => {
                                setLow(e.target.checked);
                                search(q, e.target.checked);
                            }}
                        />
                        Hanya stok menipis
                    </label>
                    <Button type="submit" variant="secondary">
                        Cari
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">SKU</th>
                                <th className="p-3">Nama</th>
                                <th className="p-3">Kategori</th>
                                <th className="p-3 text-right">Stok</th>
                                <th className="p-3 text-right">Minimum</th>
                                <th className="p-3 text-right">Harga dasar</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {products.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        Belum ada produk.
                                    </td>
                                </tr>
                            )}
                            {products.data.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="p-3 font-mono">{p.sku}</td>
                                    <td className="p-3">
                                        {p.name}
                                        {!p.is_active && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-2"
                                            >
                                                Nonaktif
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-3">{p.category ?? '-'}</td>
                                    <td className="p-3 text-right">
                                        {formatNumber(p.stock)} {p.base_unit}
                                        {p.is_low && (
                                            <Badge
                                                variant="destructive"
                                                className="ml-2"
                                            >
                                                Menipis
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {formatNumber(p.min_stock)}
                                    </td>
                                    <td className="p-3 text-right">
                                        {formatRupiah(p.base_price)}
                                    </td>
                                    <td className="space-x-3 p-3 text-right whitespace-nowrap">
                                        <Link
                                            className="underline"
                                            href={StockCardController.show(
                                                p.id,
                                            )}
                                        >
                                            Kartu stok
                                        </Link>
                                        <Link
                                            className="underline"
                                            href={ProductController.edit(p.id)}
                                        >
                                            Ubah
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination links={products.links} />
            </div>
        </>
    );
}

ProdukIndex.layout = {
    breadcrumbs: [{ title: 'Produk', href: ProductController.index() }],
};

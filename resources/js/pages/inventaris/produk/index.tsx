import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import StockCardController from '@/actions/App/Http/Controllers/Inventory/StockCardController';
import PixelTable, { Badge } from '@/components/admin/pixel-table';
import InventoryHeader from '@/components/inventory/inventory-header';
import type { InventoryStats } from '@/components/inventory/inventory-header';
import ProductThumb from '@/components/inventory/product-thumb';
import Pagination from '@/components/pagination';
import GuardCorner from '@/components/pixel/guard-corner';
import PixelGlyph, { GLYPHS } from '@/components/pixel/pixel-glyph';
import {
    FIELD,
    ICON_BUTTON,
    PRIMARY_BUTTON,
    ROW,
    SECONDARY_BUTTON,
    TBODY,
    THEAD,
} from '@/components/pixel/styles';
import { stockStatus } from '@/components/pos/catalog';
import { formatNumber, formatRupiah } from '@/lib/format';
import type { Paginated } from '@/types';

type Row = {
    id: number;
    sku: string;
    name: string;
    image_url: string | null;
    category: string | null;
    stock: number;
    min_stock: number;
    is_active: boolean;
    base_unit: string | null;
    base_price: number | null;
    is_low: boolean;
};

const STATUS = {
    aman: { tone: 'hijau', label: 'Aman' },
    menipis: { tone: 'kunyit', label: 'Menipis' },
    habis: { tone: 'bata', label: 'Habis' },
} as const;

/**
 * Inventaris, tab Daftar Barang (Tahap 5E-2): kartu angka, tab, cari, tabel
 * dengan gambar barang dan lencana status, ikon aksi (admin), dan penjaga
 * Inventaris di kanan bawah. Kasir hanya membaca.
 */
export default function ProdukIndex({
    stats,
    products,
    filters,
}: {
    stats: InventoryStats;
    products: Paginated<Row>;
    filters: { q: string; menipis: boolean };
}) {
    // Kasir hanya membaca; mengelola produk khusus admin.
    const isAdmin = usePage().props.auth.roles.includes('admin');
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

            <div className="space-y-4 p-4">
                <InventoryHeader stats={stats} active="barang" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <form
                        className="flex flex-wrap items-center gap-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            search();
                        }}
                    >
                        <label className="relative">
                            <span className="sr-only">
                                Cari nama, SKU, atau barcode
                            </span>
                            <PixelGlyph
                                rows={GLYPHS.cari}
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-px-tinta"
                            />
                            <input
                                className={`${FIELD} w-64 pl-9`}
                                placeholder="Cari nama, SKU, atau barcode"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />
                        </label>
                        <label className="flex items-center gap-2 text-sm text-px-tinta">
                            <input
                                type="checkbox"
                                className="size-4 accent-px-kunyit"
                                checked={low}
                                onChange={(e) => {
                                    setLow(e.target.checked);
                                    search(q, e.target.checked);
                                }}
                            />
                            Hanya stok menipis
                        </label>
                        <button type="submit" className={SECONDARY_BUTTON}>
                            Cari
                        </button>
                    </form>

                    {isAdmin && (
                        <Link
                            href={ProductController.create()}
                            className={PRIMARY_BUTTON}
                        >
                            <PixelGlyph rows={GLYPHS.tambah} />
                            Tambah Produk
                        </Link>
                    )}
                </div>

                <PixelTable>
                    <thead className={THEAD}>
                        <tr>
                            <th className="p-3">Barang</th>
                            <th className="p-3">Kategori</th>
                            <th className="p-3 text-right">Stok</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Minimum</th>
                            <th className="p-3 text-right">Harga jual</th>
                            {isAdmin && (
                                <th className="p-3 text-right">Aksi</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className={TBODY}>
                        {products.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={isAdmin ? 7 : 6}
                                    className="p-8 text-center text-px-bayangan"
                                >
                                    {filters.q || filters.menipis
                                        ? 'Tidak ada barang yang cocok dengan pencarian.'
                                        : 'Belum ada produk. Tambahkan barang pertama.'}
                                </td>
                            </tr>
                        )}
                        {products.data.map((p) => {
                            const status =
                                STATUS[stockStatus(p.stock, p.min_stock)];

                            return (
                                <tr key={p.id} className={ROW}>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <ProductThumb url={p.image_url} />
                                            <div className="min-w-0">
                                                <div className="font-semibold">
                                                    {p.name}
                                                    {!p.is_active && (
                                                        <span className="ml-2 align-middle">
                                                            <Badge tone="lavender">
                                                                Nonaktif
                                                            </Badge>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="font-mono text-xs text-px-bayangan">
                                                    {p.sku}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">{p.category ?? '-'}</td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        <span className="font-pixel">
                                            {formatNumber(p.stock)}
                                        </span>{' '}
                                        <span className="text-xs text-px-bayangan">
                                            {p.base_unit}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <Badge tone={status.tone}>
                                            {status.label}
                                        </Badge>
                                    </td>
                                    <td className="p-3 text-right">
                                        {formatNumber(p.min_stock)}
                                    </td>
                                    <td className="p-3 text-right font-pixel whitespace-nowrap">
                                        {formatRupiah(p.base_price)}
                                    </td>
                                    {isAdmin && (
                                        <td className="p-3 text-right">
                                            <span className="inline-flex gap-1.5">
                                                <Link
                                                    href={StockCardController.show(
                                                        p.id,
                                                    )}
                                                    className={ICON_BUTTON}
                                                    aria-label={`Kartu stok ${p.name}`}
                                                    title="Kartu stok"
                                                >
                                                    <PixelGlyph
                                                        rows={GLYPHS.kartu}
                                                    />
                                                </Link>
                                                <Link
                                                    href={ProductController.edit(
                                                        p.id,
                                                    )}
                                                    className={ICON_BUTTON}
                                                    aria-label={`Ubah ${p.name}`}
                                                    title="Ubah"
                                                >
                                                    <PixelGlyph
                                                        rows={GLYPHS.ubah}
                                                    />
                                                </Link>
                                            </span>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </PixelTable>

                <div className="flex items-end justify-between gap-4">
                    <Pagination
                        links={products.links}
                        from={products.from}
                        to={products.to}
                        total={products.total}
                    />
                    <GuardCorner post="inventaris" />
                </div>
            </div>
        </>
    );
}

ProdukIndex.layout = {
    breadcrumbs: [{ title: 'Produk', href: ProductController.index() }],
};

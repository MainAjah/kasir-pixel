import type { FormEvent, RefObject } from 'react';
import PixelIcon from '@/components/beranda/pixel-icon';
import { formatNumber, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { categoryTabs, filterCatalog, stockStatus } from './catalog';
import type { CatalogProduct, StockStatus, UnitHit } from './catalog';

const STATUS_BG: Record<StockStatus, string> = {
    aman: 'bg-px-daun',
    menipis: 'bg-px-kunyit',
    habis: 'bg-px-bata',
};

/** Kaca pembesar 8 × 8 (tinta). */
const LOUPE = [
    '.####...',
    '#....#..',
    '#....#..',
    '#....#..',
    '#....#..',
    '.####...',
    '.....##.',
    '......##',
];

/** Garis barcode 10 × 8 (tinta). */
const BARS = [
    '#.##.#.###',
    '#.##.#.###',
    '#.##.#.###',
    '#.##.#.###',
    '#.##.#.###',
    '#.##.#.###',
    '..........',
    '#.##.#.###',
];

function Glyph({ rows, scale = 2 }: { rows: string[]; scale?: number }) {
    return (
        <svg
            aria-hidden="true"
            viewBox={`0 0 ${rows[0].length} ${rows.length}`}
            width={rows[0].length * scale}
            height={rows.length * scale}
            shapeRendering="crispEdges"
            className="shrink-0 text-px-tinta"
        >
            {rows.flatMap((row, y) =>
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
    );
}

export function StockBadge({
    stock,
    status,
}: {
    stock: number;
    status: StockStatus;
}) {
    return (
        <span
            className={cn(
                'inline-block border-2 border-px-tinta px-1.5 font-pixel text-xs leading-5 text-px-tinta',
                STATUS_BG[status],
            )}
        >
            {status === 'habis' ? 'Habis' : `Stok ${formatNumber(stock)}`}
        </span>
    );
}

function ProductCard({
    product,
    onAdd,
}: {
    product: CatalogProduct;
    onAdd: (unit: UnitHit) => void;
}) {
    const [base, ...others] = product.units;
    const status = stockStatus(product.stock, product.min_stock);
    const out = status === 'habis';

    return (
        <li className="flex flex-col border-2 border-px-tinta bg-px-sorotan shadow-[3px_3px_0_var(--color-px-tinta)]">
            <button
                type="button"
                disabled={out}
                onClick={() => onAdd(base)}
                aria-label={`Tambah ${product.name}, ${base.unit_name}, ${formatRupiah(base.price)}`}
                className="flex flex-1 flex-col items-center gap-1.5 px-2 pt-3 pb-2.5 text-center outline-none hover:bg-px-lampu focus-visible:bg-px-lampu focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:ring-inset active:bg-px-kunyit disabled:cursor-not-allowed disabled:bg-px-dinding"
            >
                <span className="grid size-12 place-items-center">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt=""
                            aria-hidden="true"
                            className="max-h-12 max-w-12 object-contain [image-rendering:pixelated]"
                        />
                    ) : (
                        <PixelIcon name="produk" scale={3} />
                    )}
                </span>
                <span className="line-clamp-2 min-h-[2lh] text-sm leading-tight font-semibold text-px-tinta">
                    {product.name}
                </span>
                <span className="font-pixel text-base leading-none text-px-tinta">
                    {formatRupiah(base.price)}
                    <span className="ml-1 font-sans text-xs text-px-bayangan">
                        /{base.unit_name}
                    </span>
                </span>
                <StockBadge stock={product.stock} status={status} />
            </button>

            {others.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 border-t-2 border-dashed border-px-lantai p-1.5">
                    {others.map((u) => (
                        <button
                            key={u.product_unit_id}
                            type="button"
                            disabled={u.stock_units <= 0}
                            onClick={() => onAdd(u)}
                            aria-label={`Tambah ${product.name}, ${u.unit_name} isi ${u.conversion}, ${formatRupiah(u.price)}`}
                            title={`${u.unit_name} isi ${u.conversion}: ${formatRupiah(u.price)}`}
                            className="border-2 border-px-tinta bg-px-dinding px-1.5 font-pixel text-xs leading-5 text-px-tinta hover:bg-px-lampu focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none disabled:cursor-not-allowed disabled:border-px-logam disabled:text-px-bayangan"
                        >
                            + {u.unit_name}
                        </button>
                    ))}
                </div>
            )}
        </li>
    );
}

/**
 * Kolom cari (juga tempat scanner USB mengetik lalu Enter), tab kategori, dan grid
 * produk dengan lencana stok (Tahap 5E-1).
 */
export default function ProductGrid({
    catalog,
    query,
    onQueryChange,
    onSubmit,
    onClear,
    inputRef,
    tab,
    onTabChange,
    onAdd,
}: {
    catalog: CatalogProduct[];
    query: string;
    onQueryChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
    onClear: () => void;
    inputRef: RefObject<HTMLInputElement | null>;
    tab: string;
    onTabChange: (tab: string) => void;
    onAdd: (unit: UnitHit) => void;
}) {
    const tabs = categoryTabs(catalog);
    const shown = filterCatalog(catalog, query, tab);

    return (
        <section
            aria-label="Pilih barang"
            className="flex min-h-0 flex-1 flex-col gap-3"
        >
            <form
                onSubmit={onSubmit}
                className="flex items-center gap-3 border-2 border-px-tinta bg-px-sorotan px-3 shadow-[3px_3px_0_var(--color-px-tinta)] focus-within:ring-2 focus-within:ring-px-biru-tua"
            >
                <Glyph rows={LOUPE} />
                <label htmlFor="scan" className="sr-only">
                    Cari barang atau pindai barcode
                </label>
                <input
                    id="scan"
                    ref={inputRef}
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            onClear();
                        }
                    }}
                    autoComplete="off"
                    autoFocus
                    placeholder="Cari nama atau SKU, atau pindai barcode lalu Enter"
                    className="h-11 min-w-0 flex-1 bg-transparent text-base text-px-tinta outline-none placeholder:text-px-bayangan"
                />
                <Glyph rows={BARS} />
            </form>

            <div
                role="tablist"
                aria-label="Kategori barang"
                className="flex flex-wrap gap-2"
            >
                {tabs.map((t) => (
                    <button
                        key={t}
                        type="button"
                        role="tab"
                        aria-selected={t === tab}
                        onClick={() => onTabChange(t)}
                        className={cn(
                            'h-9 border-2 border-px-tinta px-3 font-pixel text-sm text-px-tinta focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none',
                            t === tab
                                ? 'bg-px-kunyit shadow-[2px_2px_0_var(--color-px-tinta)]'
                                : 'bg-px-dinding hover:bg-px-lampu',
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-px-lantai)_transparent] overflow-y-auto pr-1 pb-1">
                {shown.length > 0 ? (
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
                        {shown.map((p) => (
                            <ProductCard key={p.id} product={p} onAdd={onAdd} />
                        ))}
                    </ul>
                ) : (
                    <div className="grid place-items-center gap-2 border-2 border-dashed border-px-lantai p-8 text-center text-sm text-px-bayangan">
                        <p>
                            {query.trim() === ''
                                ? 'Belum ada barang di kategori ini.'
                                : `Tidak ada barang yang cocok dengan "${query.trim()}".`}
                        </p>
                        {query.trim() !== '' && (
                            <button
                                type="button"
                                onClick={onClear}
                                className="font-semibold text-px-tinta underline"
                            >
                                Hapus pencarian
                            </button>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

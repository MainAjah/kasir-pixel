import { Link, usePage } from '@inertiajs/react';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import StockOutController from '@/actions/App/Http/Controllers/Inventory/StockOutController';
import StockReceiptController from '@/actions/App/Http/Controllers/Inventory/StockReceiptController';
import PixelIcon from '@/components/beranda/pixel-icon';
import PixelGlyph, { GLYPHS } from '@/components/pixel/pixel-glyph';
import { TAB, TAB_ACTIVE, TAB_IDLE } from '@/components/pixel/styles';
import { StatCard } from '@/components/reports/period-filter';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export type InventoryStats = {
    products: number;
    units: number;
    low: number;
    empty: number;
};

export type InventoryTab = 'barang' | 'masuk' | 'keluar';

/**
 * Kepala halaman Inventaris (Tahap 5E-2): empat kartu angka dan tab Daftar
 * Barang, Stok Masuk, Stok Keluar. Tab Stok Masuk dan Stok Keluar hanya untuk
 * admin (halamannya dijaga role:admin di server).
 */
export default function InventoryHeader({
    stats,
    active,
}: {
    stats: InventoryStats;
    active: InventoryTab;
}) {
    const isAdmin = usePage().props.auth.roles.includes('admin');

    const tabs: {
        key: InventoryTab;
        label: string;
        href: string;
        glyph: readonly string[];
    }[] = [
        {
            key: 'barang',
            label: 'Daftar Barang',
            href: ProductController.index.url(),
            glyph: GLYPHS.kartu,
        },
        ...(isAdmin
            ? [
                  {
                      key: 'masuk' as const,
                      label: 'Stok Masuk',
                      href: StockReceiptController.index.url(),
                      glyph: GLYPHS.masuk,
                  },
                  {
                      key: 'keluar' as const,
                      label: 'Stok Keluar',
                      href: StockOutController.index.url(),
                      glyph: GLYPHS.keluar,
                  },
              ]
            : []),
    ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="Total produk"
                    value={formatNumber(stats.products)}
                    hint="produk aktif"
                    icon={<PixelIcon name="produk" scale={2} />}
                    tone="kunyit"
                />
                <StatCard
                    label="Stok tersedia"
                    value={formatNumber(stats.units)}
                    hint="satuan dasar"
                    icon={<PixelIcon name="stok" scale={2} />}
                    tone="daun"
                />
                <StatCard
                    label="Stok menipis"
                    value={formatNumber(stats.low)}
                    hint="sama atau di bawah minimum"
                    icon={
                        <PixelGlyph
                            rows={GLYPHS.awas}
                            scale={3}
                            className="text-px-tinta"
                        />
                    }
                    tone="lampu"
                />
                <StatCard
                    label="Stok habis"
                    value={formatNumber(stats.empty)}
                    hint="stok 0"
                    icon={
                        <PixelGlyph
                            rows={GLYPHS.habis}
                            scale={3}
                            className="text-px-tinta"
                        />
                    }
                    tone="bata"
                />
            </div>

            <nav
                aria-label="Bagian inventaris"
                className="flex flex-wrap gap-2"
            >
                {tabs.map((t) => (
                    <Link
                        key={t.key}
                        href={t.href}
                        aria-current={t.key === active ? 'page' : undefined}
                        className={cn(
                            TAB,
                            t.key === active ? TAB_ACTIVE : TAB_IDLE,
                        )}
                    >
                        <PixelGlyph rows={t.glyph} scale={2} />
                        {t.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}

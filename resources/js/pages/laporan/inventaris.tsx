import { Head, usePage } from '@inertiajs/react';
import InventoryReportController from '@/actions/App/Http/Controllers/Reports/InventoryReportController';
import PixelTable, { Badge } from '@/components/admin/pixel-table';
import Heading from '@/components/heading';
import PeriodFilter, { StatCard } from '@/components/reports/period-filter';
import type { ReportFilters } from '@/components/reports/period-filter';
import { formatNumber, formatRupiah } from '@/lib/format';

type Row = {
    id: number;
    sku: string;
    name: string;
    category: string | null;
    unit: string | null;
    stock: number;
    min_stock: number;
    status: 'aman' | 'menipis' | 'kosong';
    price: number;
    value: number;
    opening: number;
    in: number;
    out: number;
    adjust: number;
    closing: number;
};

type Report = {
    summary: {
        products: number;
        aman: number;
        menipis: number;
        kosong: number;
        low: number;
        value: number;
    };
    products: Row[];
    movements: { in: number; out: number; adjust: number };
};

function StatusBadge({ status }: { status: Row['status'] }) {
    const tone = { aman: 'hijau', menipis: 'kunyit', kosong: 'bata' } as const;
    const label = { aman: 'Aman', menipis: 'Menipis', kosong: 'Kosong' };

    return <Badge tone={tone[status]}>{label[status]}</Badge>;
}

function signed(n: number): string {
    return n > 0 ? `+${formatNumber(n)}` : formatNumber(n);
}

function tanggal(date: string): string {
    const [y, m, d] = date.split('-');

    return `${d}/${m}/${y}`;
}

/**
 * Laporan inventaris (Tahap 6C, admin). Semua angka stok dari ledger
 * stock_movements; stok menipis (termasuk kosong) sama dengan kartu Beranda.
 */
export default function LaporanInventaris({
    filters,
    report,
}: {
    filters: ReportFilters;
    report: Report;
}) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const restock = report.products.filter((p) => p.status !== 'aman');

    return (
        <>
            <Head title="Laporan inventaris" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Laporan inventaris"
                    description="Stok saat ini dari ledger stok, produk aktif saja. Nilai stok memakai harga jual. Periode hanya berlaku untuk tabel mutasi."
                />

                <PeriodFilter
                    url={InventoryReportController.index.url()}
                    csvUrl={InventoryReportController.csv.url()}
                    filters={filters}
                    errors={errors}
                />

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <StatCard
                        label="Produk aktif"
                        value={formatNumber(report.summary.products)}
                    />
                    <StatCard
                        label="Aman"
                        value={formatNumber(report.summary.aman)}
                    />
                    <StatCard
                        label="Stok menipis (termasuk kosong)"
                        value={formatNumber(report.summary.low)}
                        hint={`${report.summary.menipis} menipis, ${report.summary.kosong} kosong`}
                    />
                    <StatCard
                        label="Kosong"
                        value={formatNumber(report.summary.kosong)}
                    />
                    <StatCard
                        label="Nilai stok (harga jual)"
                        value={formatRupiah(report.summary.value)}
                    />
                </section>

                <section className="space-y-2">
                    <h3 className="font-semibold">Perlu diisi</h3>
                    <PixelTable>
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Produk</th>
                                <th className="p-3 text-right">Stok</th>
                                <th className="p-3 text-right">Minimum</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {restock.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="p-4 text-center text-muted-foreground"
                                    >
                                        Semua stok aman.
                                    </td>
                                </tr>
                            )}
                            {restock.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="p-3">{p.name}</td>
                                    <td className="p-3 text-right">
                                        {formatNumber(p.stock)} {p.unit}
                                    </td>
                                    <td className="p-3 text-right">
                                        {formatNumber(p.min_stock)}
                                    </td>
                                    <td className="p-3">
                                        <StatusBadge status={p.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </PixelTable>
                </section>

                <section className="space-y-2">
                    <h3 className="font-semibold">Semua produk</h3>
                    <PixelTable>
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">SKU</th>
                                <th className="p-3">Produk</th>
                                <th className="p-3">Kategori</th>
                                <th className="p-3 text-right">Stok</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Harga jual</th>
                                <th className="p-3 text-right">Nilai stok</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.products.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="p-3 font-mono text-xs">
                                        {p.sku}
                                    </td>
                                    <td className="p-3">{p.name}</td>
                                    <td className="p-3">{p.category ?? '-'}</td>
                                    <td className="p-3 text-right">
                                        {formatNumber(p.stock)} {p.unit}
                                    </td>
                                    <td className="p-3">
                                        <StatusBadge status={p.status} />
                                    </td>
                                    <td className="p-3 text-right">
                                        {formatRupiah(p.price)}
                                    </td>
                                    <td className="p-3 text-right">
                                        {formatRupiah(p.value)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </PixelTable>
                </section>

                <section className="space-y-2">
                    <h3 className="font-semibold">
                        Mutasi stok {tanggal(filters.from)} sampai{' '}
                        {tanggal(filters.to)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Satuan dasar. Masuk = saldo awal dan penerimaan; keluar
                        = penjualan dikurangi pembatalan; saldo awal + masuk +
                        keluar + penyesuaian = saldo akhir.
                    </p>
                    <PixelTable>
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Produk</th>
                                <th className="p-3 text-right">Saldo awal</th>
                                <th className="p-3 text-right">Masuk</th>
                                <th className="p-3 text-right">Keluar</th>
                                <th className="p-3 text-right">Penyesuaian</th>
                                <th className="p-3 text-right">Saldo akhir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.products.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="p-3">{p.name}</td>
                                    <td className="p-3 text-right">
                                        {formatNumber(p.opening)}
                                    </td>
                                    <td className="p-3 text-right">
                                        {signed(p.in)}
                                    </td>
                                    <td className="p-3 text-right">
                                        {signed(p.out)}
                                    </td>
                                    <td className="p-3 text-right">
                                        {signed(p.adjust)}
                                    </td>
                                    <td className="p-3 text-right font-semibold">
                                        {formatNumber(p.closing)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t-[3px] border-current font-semibold">
                                <td className="p-3">Jumlah</td>
                                <td className="p-3" />
                                <td className="p-3 text-right">
                                    {signed(report.movements.in)}
                                </td>
                                <td className="p-3 text-right">
                                    {signed(report.movements.out)}
                                </td>
                                <td className="p-3 text-right">
                                    {signed(report.movements.adjust)}
                                </td>
                                <td className="p-3" />
                            </tr>
                        </tbody>
                    </PixelTable>
                </section>
            </div>
        </>
    );
}

LaporanInventaris.layout = {
    breadcrumbs: [
        {
            title: 'Laporan inventaris',
            href: InventoryReportController.index(),
        },
    ],
};

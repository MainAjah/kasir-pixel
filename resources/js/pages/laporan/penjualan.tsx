import { Head, usePage } from '@inertiajs/react';
import SalesReportController from '@/actions/App/Http/Controllers/Reports/SalesReportController';
import PixelTable from '@/components/admin/pixel-table';
import Heading from '@/components/heading';
import PeriodFilter, { StatCard } from '@/components/reports/period-filter';
import type { ReportFilters } from '@/components/reports/period-filter';
import { formatNumber, formatRupiah } from '@/lib/format';

type Report = {
    summary: { total: number; count: number; average: number };
    daily: { date: string; total: number; count: number }[];
    top_products: {
        product_id: number;
        name: string;
        unit: string | null;
        qty: number;
        revenue: number;
        sales: number;
    }[];
    cashiers: { user_id: number; name: string; count: number; total: number }[];
    voided: {
        count: number;
        total: number;
        rows: {
            number: string;
            sold_at: string;
            cashier: string | null;
            total: number;
            reason: string;
            voided_by: string | null;
            voided_at: string | null;
        }[];
    };
};

function tanggal(date: string): string {
    const [y, m, d] = date.split('-');

    return `${d}/${m}/${y}`;
}

/** Laporan penjualan (Tahap 6C, admin). Penjualan dibatalkan tidak dihitung dan tampil terpisah. */
export default function LaporanPenjualan({
    filters,
    cashiers,
    report,
}: {
    filters: ReportFilters;
    cashiers: { id: number; name: string }[];
    report: Report;
}) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const max = Math.max(1, ...report.daily.map((d) => d.total));

    return (
        <>
            <Head title="Laporan penjualan" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Laporan penjualan"
                    description={`${tanggal(filters.from)} sampai ${tanggal(filters.to)}. Penjualan yang dibatalkan tidak dihitung dan tampil terpisah di bawah.`}
                />

                <PeriodFilter
                    url={SalesReportController.index.url()}
                    csvUrl={SalesReportController.csv.url()}
                    filters={filters}
                    cashiers={cashiers}
                    errors={errors}
                />

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Total penjualan"
                        value={formatRupiah(report.summary.total)}
                    />
                    <StatCard
                        label="Jumlah transaksi"
                        value={formatNumber(report.summary.count)}
                    />
                    <StatCard
                        label="Rata-rata per transaksi"
                        value={formatRupiah(report.summary.average)}
                    />
                    <StatCard
                        label="Dibatalkan (tidak dihitung)"
                        value={formatNumber(report.voided.count)}
                        hint={formatRupiah(report.voided.total)}
                    />
                </section>

                <section className="space-y-2">
                    <h3 className="font-semibold">Penjualan per hari</h3>
                    <PixelTable>
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3 text-right">Transaksi</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="w-1/3 p-3" aria-hidden="true" />
                            </tr>
                        </thead>
                        <tbody>
                            {report.daily.map((d) => (
                                <tr key={d.date} className="border-t">
                                    <td className="p-2 px-3">
                                        {tanggal(d.date)}
                                    </td>
                                    <td className="p-2 px-3 text-right">
                                        {d.count}
                                    </td>
                                    <td className="p-2 px-3 text-right">
                                        {formatRupiah(d.total)}
                                    </td>
                                    <td className="p-2 px-3" aria-hidden="true">
                                        <div
                                            className="h-3 border-2 border-[#2b2a33] bg-[#f6c56b]"
                                            style={{
                                                width: `${(d.total / max) * 100}%`,
                                                minWidth: d.total > 0 ? 6 : 0,
                                                display:
                                                    d.total > 0
                                                        ? undefined
                                                        : 'none',
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </PixelTable>
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="space-y-2">
                        <h3 className="font-semibold">Produk terlaris</h3>
                        <PixelTable>
                            <thead className="bg-muted/50 text-left">
                                <tr>
                                    <th className="p-3">Produk</th>
                                    <th className="p-3 text-right">Terjual</th>
                                    <th className="p-3 text-right">
                                        Pendapatan
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.top_products.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="p-4 text-center text-muted-foreground"
                                        >
                                            Belum ada penjualan.
                                        </td>
                                    </tr>
                                )}
                                {report.top_products.map((p) => (
                                    <tr key={p.product_id} className="border-t">
                                        <td className="p-3">{p.name}</td>
                                        <td className="p-3 text-right">
                                            {formatNumber(p.qty)} {p.unit}
                                        </td>
                                        <td className="p-3 text-right">
                                            {formatRupiah(p.revenue)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </PixelTable>
                    </section>

                    <section className="space-y-2">
                        <h3 className="font-semibold">Penjualan per kasir</h3>
                        <PixelTable>
                            <thead className="bg-muted/50 text-left">
                                <tr>
                                    <th className="p-3">Kasir</th>
                                    <th className="p-3 text-right">
                                        Transaksi
                                    </th>
                                    <th className="p-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.cashiers.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="p-4 text-center text-muted-foreground"
                                        >
                                            Belum ada penjualan.
                                        </td>
                                    </tr>
                                )}
                                {report.cashiers.map((c) => (
                                    <tr key={c.user_id} className="border-t">
                                        <td className="p-3">{c.name}</td>
                                        <td className="p-3 text-right">
                                            {c.count}
                                        </td>
                                        <td className="p-3 text-right">
                                            {formatRupiah(c.total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </PixelTable>
                    </section>
                </div>

                <section className="space-y-2">
                    <h3 className="font-semibold">Penjualan dibatalkan</h3>
                    <p className="text-sm text-muted-foreground">
                        Tidak termasuk dalam angka di atas. Stoknya sudah
                        dikembalikan lewat mutasi pembatalan.
                    </p>
                    <PixelTable>
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Nomor</th>
                                <th className="p-3">Waktu jual</th>
                                <th className="p-3">Kasir</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3">Alasan</th>
                                <th className="p-3">Dibatalkan oleh</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.voided.rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-4 text-center text-muted-foreground"
                                    >
                                        Tidak ada penjualan yang dibatalkan.
                                    </td>
                                </tr>
                            )}
                            {report.voided.rows.map((v) => (
                                <tr key={v.number} className="border-t">
                                    <td className="p-3 font-mono">
                                        {v.number}
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {v.sold_at}
                                    </td>
                                    <td className="p-3">{v.cashier ?? '-'}</td>
                                    <td className="p-3 text-right">
                                        {formatRupiah(v.total)}
                                    </td>
                                    <td className="p-3">{v.reason}</td>
                                    <td className="p-3">
                                        {v.voided_by ?? '-'}
                                        {v.voided_at && (
                                            <span className="block text-xs text-muted-foreground">
                                                {v.voided_at}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </PixelTable>
                </section>
            </div>
        </>
    );
}

LaporanPenjualan.layout = {
    breadcrumbs: [
        { title: 'Laporan penjualan', href: SalesReportController.index() },
    ],
};

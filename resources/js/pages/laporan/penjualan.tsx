import { Head, usePage } from '@inertiajs/react';
import ApiSalesReportController from '@/actions/App/Http/Controllers/Api/Reports/SalesReportController';
import SalesReportController from '@/actions/App/Http/Controllers/Reports/SalesReportController';
import PixelTable from '@/components/admin/pixel-table';
import { ApiErrorPanel, ApiLoading } from '@/components/api-status';
import PixelIcon from '@/components/beranda/pixel-icon';
import GuardCorner from '@/components/pixel/guard-corner';
import PixelGlyph, { GLYPHS } from '@/components/pixel/pixel-glyph';
import PeriodFilter, {
    StatCard,
    filtersFromQuery,
} from '@/components/reports/period-filter';
import type { ReportFilters } from '@/components/reports/period-filter';
import { useApi } from '@/hooks/use-api';
import { pageQuery } from '@/lib/api';
import { formatNumber, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

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

type Payload = {
    data: {
        filters: ReportFilters;
        cashiers: { id: number; name: string }[];
        report: Report;
    };
};

/**
 * Laporan penjualan (Tahap 6C, admin). Penjualan dibatalkan tidak dihitung dan
 * tampil terpisah. Sejak Tahap 11A halaman ini hanya kerangka: datanya dibaca
 * dari `GET /api/v1/laporan/penjualan` dengan filter dari query alamat halaman.
 */
export default function LaporanPenjualan() {
    const { url } = usePage();
    const query = pageQuery(url);
    const { data, error, loading, reload } = useApi<Payload>(
        ApiSalesReportController.index.url(),
        query,
    );
    const body = data?.data ?? null;
    const filters = body?.filters ?? filtersFromQuery(query);
    const invalid = error?.status === 422;

    return (
        <>
            <Head title="Laporan penjualan" />

            <div className="space-y-5 p-4">
                <p className="max-w-prose text-sm text-px-bayangan">
                    {body
                        ? `${tanggal(filters.from)} sampai ${tanggal(filters.to)}. `
                        : ''}
                    Penjualan yang dibatalkan tidak dihitung dan tampil terpisah
                    di bawah.
                </p>

                {(body || invalid) && (
                    <PeriodFilter
                        key={`${filters.preset}|${filters.from}|${filters.to}`}
                        url={SalesReportController.index.url()}
                        csvUrl={ApiSalesReportController.csv.url()}
                        filters={filters}
                        cashiers={body?.cashiers}
                        errors={invalid ? error.errors : {}}
                    />
                )}

                {error && !invalid && (
                    <ApiErrorPanel error={error} onRetry={reload} />
                )}
                {!body && loading && (
                    <ApiLoading label="Memuat laporan penjualan" />
                )}
                {body && (
                    <SalesReportBody report={body.report} busy={loading} />
                )}

                <div className="flex justify-end">
                    <GuardCorner post="kasir" />
                </div>
            </div>
        </>
    );
}

function SalesReportBody({ report, busy }: { report: Report; busy: boolean }) {
    const max = Math.max(1, ...report.daily.map((d) => d.total));

    return (
        <div
            className={cn('space-y-5 transition-opacity', busy && 'opacity-60')}
            aria-busy={busy}
        >
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total penjualan"
                    value={formatRupiah(report.summary.total)}
                    icon={<PixelIcon name="laporan" scale={2} />}
                    tone="kunyit"
                />
                <StatCard
                    label="Jumlah transaksi"
                    value={formatNumber(report.summary.count)}
                    icon={<PixelIcon name="kasir" scale={2} />}
                    tone="langit"
                />
                <StatCard
                    label="Rata-rata per transaksi"
                    value={formatRupiah(report.summary.average)}
                    icon={<PixelIcon name="stok" scale={2} />}
                    tone="daun"
                />
                <StatCard
                    label="Dibatalkan (tidak dihitung)"
                    value={formatNumber(report.voided.count)}
                    hint={formatRupiah(report.voided.total)}
                    icon={
                        <PixelGlyph
                            rows={GLYPHS.habis}
                            scale={3}
                            className="text-px-tinta"
                        />
                    }
                    tone="bata"
                />
            </section>

            <section className="space-y-2">
                <h3 className="font-pixel text-lg text-px-tinta">
                    Penjualan per hari
                </h3>
                <PixelTable>
                    <thead className="bg-px-dinding text-left text-px-tinta">
                        <tr>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3 text-right">Transaksi</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="w-1/3 p-3" aria-hidden="true" />
                        </tr>
                    </thead>
                    <tbody className="bg-px-sorotan">
                        {report.daily.map((d) => (
                            <tr
                                key={d.date}
                                className="border-t-2 border-dashed border-px-lantai"
                            >
                                <td className="p-2 px-3">{tanggal(d.date)}</td>
                                <td className="p-2 px-3 text-right">
                                    {d.count}
                                </td>
                                <td className="p-2 px-3 text-right">
                                    {formatRupiah(d.total)}
                                </td>
                                <td className="p-2 px-3" aria-hidden="true">
                                    <div
                                        className="h-3 border-2 border-px-tinta bg-px-kunyit"
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
                    <h3 className="font-pixel text-lg text-px-tinta">
                        Produk terlaris
                    </h3>
                    <PixelTable>
                        <thead className="bg-px-dinding text-left text-px-tinta">
                            <tr>
                                <th className="p-3">Produk</th>
                                <th className="p-3 text-right">Terjual</th>
                                <th className="p-3 text-right">Pendapatan</th>
                            </tr>
                        </thead>
                        <tbody className="bg-px-sorotan">
                            {report.top_products.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="p-4 text-center text-px-bayangan"
                                    >
                                        Belum ada penjualan.
                                    </td>
                                </tr>
                            )}
                            {report.top_products.map((p) => (
                                <tr
                                    key={p.product_id}
                                    className="border-t-2 border-dashed border-px-lantai"
                                >
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
                    <h3 className="font-pixel text-lg text-px-tinta">
                        Penjualan per kasir
                    </h3>
                    <PixelTable>
                        <thead className="bg-px-dinding text-left text-px-tinta">
                            <tr>
                                <th className="p-3">Kasir</th>
                                <th className="p-3 text-right">Transaksi</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-px-sorotan">
                            {report.cashiers.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="p-4 text-center text-px-bayangan"
                                    >
                                        Belum ada penjualan.
                                    </td>
                                </tr>
                            )}
                            {report.cashiers.map((c) => (
                                <tr
                                    key={c.user_id}
                                    className="border-t-2 border-dashed border-px-lantai"
                                >
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
                <h3 className="font-pixel text-lg text-px-tinta">
                    Penjualan dibatalkan
                </h3>
                <p className="text-sm text-px-bayangan">
                    Tidak termasuk dalam angka di atas. Stoknya sudah
                    dikembalikan lewat mutasi pembatalan.
                </p>
                <PixelTable>
                    <thead className="bg-px-dinding text-left text-px-tinta">
                        <tr>
                            <th className="p-3">Nomor</th>
                            <th className="p-3">Waktu jual</th>
                            <th className="p-3">Kasir</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3">Alasan</th>
                            <th className="p-3">Dibatalkan oleh</th>
                        </tr>
                    </thead>
                    <tbody className="bg-px-sorotan">
                        {report.voided.rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-4 text-center text-px-bayangan"
                                >
                                    Tidak ada penjualan yang dibatalkan.
                                </td>
                            </tr>
                        )}
                        {report.voided.rows.map((v) => (
                            <tr
                                key={v.number}
                                className="border-t-2 border-dashed border-px-lantai"
                            >
                                <td className="p-3 font-mono">{v.number}</td>
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
                                        <span className="block text-xs text-px-bayangan">
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
    );
}

LaporanPenjualan.layout = {
    breadcrumbs: [
        { title: 'Laporan penjualan', href: SalesReportController.index() },
    ],
};

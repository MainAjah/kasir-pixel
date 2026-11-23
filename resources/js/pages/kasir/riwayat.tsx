import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import PosController from '@/actions/App/Http/Controllers/Pos/PosController';
import SaleController from '@/actions/App/Http/Controllers/Pos/SaleController';
import PixelTable, { Badge } from '@/components/admin/pixel-table';
import InputError from '@/components/input-error';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

type Row = {
    id: number;
    number: string;
    time: string;
    total: number;
    items_count: number;
    cashier: string | null;
    is_voided: boolean;
    void_reason: string | null;
    can_void: boolean;
};

type Period = 'semua' | 'hari-ini' | '7-hari' | 'bulan-ini';

const TABS: { value: Period; label: string; empty: string }[] = [
    { value: 'semua', label: 'Semua', empty: 'Belum ada penjualan.' },
    {
        value: 'hari-ini',
        label: 'Hari Ini',
        empty: 'Belum ada penjualan hari ini.',
    },
    {
        value: '7-hari',
        label: '7 Hari',
        empty: 'Tidak ada penjualan dalam 7 hari terakhir.',
    },
    {
        value: 'bulan-ini',
        label: 'Bulanan',
        empty: 'Belum ada penjualan bulan ini.',
    },
];

const ACTION =
    'inline-block border-2 border-px-tinta px-2 py-0.5 font-pixel text-xs text-px-tinta focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none';

/** Ikon nota kecil 8 × 10 (tinta). */
const NOTA = [
    '#######.',
    '#.....##',
    '#.###..#',
    '#......#',
    '#.####.#',
    '#......#',
    '#.###..#',
    '#......#',
    '#......#',
    '########',
];

function NotaIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 8 10"
            width={16}
            height={20}
            shapeRendering="crispEdges"
            className="shrink-0 text-px-tinta"
        >
            {NOTA.flatMap((row, y) =>
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

/**
 * Riwayat transaksi bertema pixel (Tahap 5E-1): tab periode, tabel dengan
 * lencana Selesai/Batal, dan pembatalan khusus admin di shift yang masih
 * terbuka (aturan tidak berubah).
 */
export default function Riwayat({
    sales,
    scope,
    period,
}: {
    sales: Paginated<Row>;
    scope: 'admin' | 'kasir';
    period: Period;
}) {
    const [target, setTarget] = useState<Row | null>(null);
    const [open, setOpen] = useState(false);
    const form = useForm({ reason: '' });
    const current = TABS.find((t) => t.value === period) ?? TABS[0];

    function close() {
        // target dibiarkan agar judul tidak kosong selama animasi menutup.
        setOpen(false);
        form.reset();
        form.clearErrors();
    }

    return (
        <>
            <Head title="Riwayat transaksi" />

            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-prose text-sm text-px-bayangan">
                        {scope === 'admin'
                            ? 'Penjualan di shift yang masih terbuka. Pembatalan hanya bisa selama shift belum ditutup.'
                            : 'Penjualan yang Anda layani.'}
                    </p>
                    <Link
                        href={PosController.index()}
                        className="border-2 border-px-tinta bg-px-kunyit px-3 py-1.5 font-pixel text-sm text-px-tinta shadow-[2px_2px_0_var(--color-px-tinta)] hover:bg-px-kunyit-tua focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none"
                    >
                        Ke kasir
                    </Link>
                </div>

                <nav aria-label="Periode" className="flex flex-wrap gap-2">
                    {TABS.map((t) => (
                        <Link
                            key={t.value}
                            href={SaleController.index({
                                query:
                                    t.value === 'semua'
                                        ? {}
                                        : { periode: t.value },
                            })}
                            preserveScroll
                            aria-current={
                                t.value === period ? 'page' : undefined
                            }
                            className={cn(
                                'h-9 border-2 border-px-tinta px-3 font-pixel text-sm leading-[2rem] text-px-tinta focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none',
                                t.value === period
                                    ? 'bg-px-kunyit shadow-[2px_2px_0_var(--color-px-tinta)]'
                                    : 'bg-px-dinding hover:bg-px-lampu',
                            )}
                        >
                            {t.label}
                        </Link>
                    ))}
                </nav>

                <PixelTable>
                    <thead className="bg-px-dinding text-left">
                        <tr>
                            <th className="p-3">Transaksi</th>
                            <th className="p-3">Kasir</th>
                            <th className="p-3 text-right">Barang</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-px-sorotan">
                        {sales.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-8 text-center text-px-bayangan"
                                >
                                    {current.empty}
                                </td>
                            </tr>
                        )}
                        {sales.data.map((s) => (
                            <tr
                                key={s.id}
                                className="border-t-2 border-dashed border-px-lantai"
                            >
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <NotaIcon />
                                        <div>
                                            <div className="font-mono font-semibold">
                                                {s.number}
                                            </div>
                                            <div className="text-xs whitespace-nowrap text-px-bayangan">
                                                {s.time}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">{s.cashier ?? '-'}</td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    {s.items_count} item
                                </td>
                                <td className="p-3 text-right font-pixel whitespace-nowrap">
                                    {formatRupiah(s.total)}
                                </td>
                                <td className="p-3">
                                    {s.is_voided ? (
                                        <Badge tone="bata">Batal</Badge>
                                    ) : (
                                        <Badge tone="hijau">Selesai</Badge>
                                    )}
                                    {s.void_reason && (
                                        <span className="mt-1 block text-xs text-px-bayangan">
                                            {s.void_reason}
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    <span className="inline-flex gap-2">
                                        <Link
                                            className={cn(
                                                ACTION,
                                                'bg-px-dinding hover:bg-px-lampu',
                                            )}
                                            href={SaleController.receipt(s.id)}
                                        >
                                            Struk
                                        </Link>
                                        {s.can_void && (
                                            <button
                                                type="button"
                                                className={cn(
                                                    ACTION,
                                                    'bg-px-sorotan hover:bg-px-bata',
                                                )}
                                                onClick={() => {
                                                    setTarget(s);
                                                    setOpen(true);
                                                }}
                                            >
                                                Batalkan
                                            </button>
                                        )}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </PixelTable>

                <Pagination links={sales.links} />
            </div>

            <Dialog open={open} onOpenChange={(o) => !o && close()}>
                <DialogContent>
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (!target) {
                                return;
                            }
                            form.submit(SaleController.void(target.id), {
                                preserveScroll: true,
                                onSuccess: close,
                            });
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>
                                Batalkan {target?.number}?
                            </DialogTitle>
                            <DialogDescription>
                                Stok barang dikembalikan lewat mutasi pembalik.
                                Penjualan asli tidak diubah.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Alasan</Label>
                            <Input
                                id="reason"
                                autoFocus
                                value={form.data.reason}
                                onChange={(e) =>
                                    form.setData('reason', e.target.value)
                                }
                            />
                            <InputError message={form.errors.reason} />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={close}
                            >
                                Tidak jadi
                            </Button>
                            <Button
                                variant="destructive"
                                disabled={
                                    form.processing ||
                                    form.data.reason.trim() === ''
                                }
                            >
                                Batalkan penjualan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Riwayat.layout = {
    breadcrumbs: [
        { title: 'Kasir', href: '/kasir' },
        { title: 'Riwayat transaksi', href: '/kasir/penjualan' },
    ],
};

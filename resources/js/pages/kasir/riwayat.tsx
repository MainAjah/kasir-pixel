import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import PosController from '@/actions/App/Http/Controllers/Pos/PosController';
import SaleController from '@/actions/App/Http/Controllers/Pos/SaleController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
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

export default function Riwayat({
    sales,
    scope,
}: {
    sales: Paginated<Row>;
    scope: 'admin' | 'kasir';
}) {
    const [target, setTarget] = useState<Row | null>(null);
    const [open, setOpen] = useState(false);
    const form = useForm({ reason: '' });

    function close() {
        // target dibiarkan agar judul tidak kosong selama animasi menutup.
        setOpen(false);
        form.reset();
        form.clearErrors();
    }

    return (
        <>
            <Head title="Riwayat penjualan" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Riwayat penjualan"
                        description={
                            scope === 'admin'
                                ? 'Penjualan di shift yang masih terbuka. Pembatalan hanya bisa selama shift belum ditutup.'
                                : 'Penjualan Anda.'
                        }
                    />
                    <Button variant="secondary" asChild>
                        <Link href={PosController.index()}>Ke kasir</Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Nomor</th>
                                <th className="p-3">Waktu</th>
                                <th className="p-3">Kasir</th>
                                <th className="p-3 text-right">Barang</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {sales.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        Belum ada penjualan.
                                    </td>
                                </tr>
                            )}
                            {sales.data.map((s) => (
                                <tr key={s.id} className="border-t">
                                    <td className="p-3 font-mono">
                                        {s.number}
                                        {s.is_voided && (
                                            <Badge
                                                variant="destructive"
                                                className="ml-2"
                                            >
                                                Dibatalkan
                                            </Badge>
                                        )}
                                        {s.void_reason && (
                                            <span className="block font-sans text-xs text-muted-foreground">
                                                {s.void_reason}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {s.time}
                                    </td>
                                    <td className="p-3">{s.cashier ?? '-'}</td>
                                    <td className="p-3 text-right">
                                        {s.items_count}
                                    </td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        {formatRupiah(s.total)}
                                    </td>
                                    <td className="space-x-3 p-3 text-right whitespace-nowrap">
                                        <Link
                                            className="underline"
                                            href={SaleController.receipt(s.id)}
                                        >
                                            Struk
                                        </Link>
                                        {s.can_void && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setTarget(s);
                                                    setOpen(true);
                                                }}
                                            >
                                                Batalkan
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

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
        { title: 'Riwayat penjualan', href: '/kasir/penjualan' },
    ],
};

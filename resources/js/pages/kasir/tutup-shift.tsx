import { Head, Link, useForm } from '@inertiajs/react';
import PosController from '@/actions/App/Http/Controllers/Pos/PosController';
import ShiftController from '@/actions/App/Http/Controllers/Pos/ShiftController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/format';

type Summary = {
    id: number;
    opened_at: string;
    opening_cash: number;
    sales_count: number;
    cash_sales: number;
    voided_count: number;
};

export default function TutupShift({ shift }: { shift: Summary }) {
    const form = useForm({ counted_cash: '', closing_note: '' });

    return (
        <>
            <Head title="Tutup shift" />

            <form
                className="max-w-lg space-y-6 p-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.submit(ShiftController.close());
                }}
            >
                <Heading
                    title="Tutup shift"
                    description="Hitung uang di laci, isi jumlahnya, lalu sistem membandingkannya dengan yang seharusnya ada."
                />

                <dl className="grid grid-cols-2 gap-2 rounded-md border p-4 text-sm">
                    <dt className="text-muted-foreground">Dibuka</dt>
                    <dd className="text-right">{shift.opened_at}</dd>
                    <dt className="text-muted-foreground">Kas awal</dt>
                    <dd className="text-right">
                        {formatRupiah(shift.opening_cash)}
                    </dd>
                    <dt className="text-muted-foreground">
                        Penjualan (tidak dibatalkan)
                    </dt>
                    <dd className="text-right">{shift.sales_count}</dd>
                    <dt className="text-muted-foreground">Penjualan tunai</dt>
                    <dd className="text-right">
                        {formatRupiah(shift.cash_sales)}
                    </dd>
                    <dt className="text-muted-foreground">Dibatalkan</dt>
                    <dd className="text-right">{shift.voided_count}</dd>
                </dl>

                <div className="grid gap-2">
                    <Label htmlFor="counted_cash">
                        Uang di laci setelah dihitung (Rp)
                    </Label>
                    <Input
                        id="counted_cash"
                        type="number"
                        min={0}
                        autoFocus
                        value={form.data.counted_cash}
                        onChange={(e) =>
                            form.setData('counted_cash', e.target.value)
                        }
                    />
                    <InputError message={form.errors.counted_cash} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="closing_note">
                        Catatan (wajib bila ada selisih)
                    </Label>
                    <Input
                        id="closing_note"
                        value={form.data.closing_note}
                        onChange={(e) =>
                            form.setData('closing_note', e.target.value)
                        }
                    />
                    <InputError message={form.errors.closing_note} />
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        disabled={
                            form.processing || form.data.counted_cash === ''
                        }
                    >
                        Tutup shift
                    </Button>
                    <Button variant="ghost" asChild>
                        <Link href={PosController.index()}>Batal</Link>
                    </Button>
                </div>
            </form>
        </>
    );
}

TutupShift.layout = {
    breadcrumbs: [
        { title: 'Kasir', href: '/kasir' },
        { title: 'Tutup shift', href: '/kasir/shift/tutup' },
    ],
};

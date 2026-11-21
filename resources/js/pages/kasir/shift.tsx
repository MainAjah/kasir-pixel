import { Head, Link } from '@inertiajs/react';
import PosController from '@/actions/App/Http/Controllers/Pos/PosController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/format';

type ShiftData = {
    id: number;
    cashier: string;
    opened_at: string;
    closed_at: string | null;
    opening_cash: number;
    expected_cash: number | null;
    counted_cash: number | null;
    difference: number | null;
    closing_note: string | null;
};

export default function ShiftHasil({ shift }: { shift: ShiftData }) {
    const closed = shift.closed_at !== null;
    const diff = shift.difference ?? 0;

    return (
        <>
            <Head title="Hasil shift" />

            <div className="max-w-lg space-y-6 p-4">
                <Heading
                    title={closed ? 'Shift ditutup' : 'Shift berjalan'}
                    description={`Kasir ${shift.cashier}`}
                />

                <dl className="grid grid-cols-2 gap-2 rounded-md border p-4 text-sm">
                    <dt className="text-muted-foreground">Dibuka</dt>
                    <dd className="text-right">{shift.opened_at}</dd>
                    <dt className="text-muted-foreground">Ditutup</dt>
                    <dd className="text-right">{shift.closed_at ?? '-'}</dd>
                    <dt className="text-muted-foreground">Kas awal</dt>
                    <dd className="text-right">
                        {formatRupiah(shift.opening_cash)}
                    </dd>
                    <dt className="text-muted-foreground">Seharusnya ada</dt>
                    <dd className="text-right">
                        {formatRupiah(shift.expected_cash)}
                    </dd>
                    <dt className="text-muted-foreground">Dihitung</dt>
                    <dd className="text-right">
                        {formatRupiah(shift.counted_cash)}
                    </dd>
                    <dt className="text-muted-foreground">Selisih</dt>
                    <dd className="text-right">
                        {closed ? (
                            <Badge
                                variant={
                                    diff === 0 ? 'secondary' : 'destructive'
                                }
                            >
                                {diff > 0 ? '+' : ''}
                                {formatRupiah(diff)}
                            </Badge>
                        ) : (
                            '-'
                        )}
                    </dd>
                    <dt className="text-muted-foreground">Catatan</dt>
                    <dd className="text-right">{shift.closing_note ?? '-'}</dd>
                </dl>

                <Button asChild>
                    <Link href={PosController.index()}>Kembali ke kasir</Link>
                </Button>
            </div>
        </>
    );
}

ShiftHasil.layout = {
    breadcrumbs: [
        { title: 'Kasir', href: '/kasir' },
        { title: 'Hasil shift', href: '/kasir' },
    ],
};

import { Head, useForm } from '@inertiajs/react';
import ShiftController from '@/actions/App/Http/Controllers/Pos/ShiftController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PosScreen from '@/components/pos/pos-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PosShift } from '@/components/pos/pos-screen';

export default function KasirIndex({
    shift,
    cashier,
}: {
    shift: PosShift | null;
    cashier: { id: number; name: string };
}) {
    return (
        <>
            <Head title="Kasir" />
            {shift ? (
                <PosScreen shift={shift} cashier={cashier} />
            ) : (
                <OpenShiftForm />
            )}
        </>
    );
}

function OpenShiftForm() {
    const form = useForm({ opening_cash: '' });

    return (
        <form
            className="max-w-md space-y-6 p-4"
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(ShiftController.store());
            }}
        >
            <Heading
                title="Buka shift"
                description="Hitung uang di laci, lalu isi kas awal sebelum mulai menjual."
            />
            <div className="grid gap-2">
                <Label htmlFor="opening_cash">Kas awal (Rp)</Label>
                <Input
                    id="opening_cash"
                    type="number"
                    min={0}
                    autoFocus
                    value={form.data.opening_cash}
                    onChange={(e) =>
                        form.setData('opening_cash', e.target.value)
                    }
                />
                <InputError message={form.errors.opening_cash} />
            </div>
            <Button disabled={form.processing || form.data.opening_cash === ''}>
                Buka shift
            </Button>
        </form>
    );
}

KasirIndex.layout = {
    breadcrumbs: [{ title: 'Kasir', href: '/kasir' }],
};

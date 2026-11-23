import { Head, useForm } from '@inertiajs/react';
import ShiftController from '@/actions/App/Http/Controllers/Pos/ShiftController';
import InputError from '@/components/input-error';
import type { CatalogProduct, PosShift } from '@/components/pos/catalog';
import PosScreen from '@/components/pos/pos-screen';
import { Input } from '@/components/ui/input';

export default function KasirIndex({
    shift,
    cashier,
    catalog,
}: {
    shift: PosShift | null;
    cashier: { id: number; name: string };
    catalog: CatalogProduct[];
}) {
    return (
        <>
            <Head title="Kasir" />
            {shift ? (
                <PosScreen shift={shift} cashier={cashier} catalog={catalog} />
            ) : (
                <OpenShiftForm />
            )}
        </>
    );
}

function OpenShiftForm() {
    const form = useForm({ opening_cash: '' });

    return (
        <div className="p-4">
            <form
                className="max-w-md space-y-5 bg-px-sorotan p-6 pixel-frame"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.submit(ShiftController.store());
                }}
            >
                <div className="space-y-1">
                    <h2 className="font-pixel text-2xl text-px-tinta">
                        Buka shift
                    </h2>
                    <p className="text-sm text-px-bayangan">
                        Hitung uang di laci, lalu isi kas awal sebelum mulai
                        menjual.
                    </p>
                </div>
                <div className="grid gap-2">
                    <label
                        htmlFor="opening_cash"
                        className="text-sm font-semibold text-px-tinta"
                    >
                        Kas awal (Rp)
                    </label>
                    <Input
                        id="opening_cash"
                        type="number"
                        min={0}
                        autoFocus
                        value={form.data.opening_cash}
                        onChange={(e) =>
                            form.setData('opening_cash', e.target.value)
                        }
                        className="h-11 border-2 border-px-tinta bg-px-sorotan font-pixel text-lg"
                    />
                    <InputError message={form.errors.opening_cash} />
                </div>
                <button
                    disabled={form.processing || form.data.opening_cash === ''}
                    className="h-12 w-full bg-px-kunyit font-pixel text-lg text-px-tinta pixel-frame hover:bg-px-kunyit-tua focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-px-dinding disabled:text-px-bayangan disabled:shadow-none"
                >
                    Buka shift
                </button>
            </form>
        </div>
    );
}

KasirIndex.layout = {
    breadcrumbs: [{ title: 'Kasir', href: '/kasir' }],
};

import { useForm } from '@inertiajs/react';
import SavingsController from '@/actions/App/Http/Controllers/Members/SavingsController';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { canWithdraw, fixedAmount, SAVINGS_TYPES } from '@/lib/savings';
import { formatRupiah } from '@/lib/format';
import type { MonthOption, Rates, SavingsType } from '@/types';

/**
 * Form setor/tarik. Aturan sebenarnya ada di server (PostSaving); form ini hanya
 * mengisi nominal tarif otomatis dan menyembunyikan pilihan yang pasti ditolak.
 */
export default function SavingsForm({
    memberId,
    rates,
    months,
}: {
    memberId: number;
    rates: Rates;
    months: MonthOption[];
}) {
    const firstUnpaid = months.find((m) => !m.paid);
    const form = useForm({
        kind: 'deposit',
        savings_type: 'sukarela' as SavingsType,
        amount: '',
        period: firstUnpaid?.value ?? months[0]?.value ?? '',
        note: '',
    });

    const type = form.data.savings_type;
    const fixed = fixedAmount(type, rates);
    const withdrawBlocked =
        form.data.kind === 'withdrawal' && !canWithdraw(type);

    function setType(next: SavingsType) {
        const nominal = fixedAmount(next, rates);

        form.setData((d) => ({
            ...d,
            savings_type: next,
            // Pokok dan wajib tidak bisa ditarik: kembali ke setoran.
            kind: canWithdraw(next) ? d.kind : 'deposit',
            amount: nominal === null ? '' : String(nominal),
        }));
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            period:
                d.savings_type === 'wajib' && d.kind === 'deposit'
                    ? d.period
                    : null,
        }));
        form.submit(SavingsController.store(memberId), {
            preserveScroll: true,
            onSuccess: () => form.reset('amount', 'note'),
        });
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-md border p-4">
            <h3 className="font-medium">Setor atau tarik</h3>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="savings_type">Jenis simpanan</Label>
                    <NativeSelect
                        id="savings_type"
                        value={type}
                        onChange={(e) => setType(e.target.value as SavingsType)}
                    >
                        {SAVINGS_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </NativeSelect>
                    <InputError message={form.errors.savings_type} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="kind">Transaksi</Label>
                    <NativeSelect
                        id="kind"
                        value={form.data.kind}
                        onChange={(e) => form.setData('kind', e.target.value)}
                    >
                        <option value="deposit">Setor</option>
                        <option
                            value="withdrawal"
                            disabled={!canWithdraw(type)}
                        >
                            Tarik
                            {!canWithdraw(type) ? ' (hanya saat keluar)' : ''}
                        </option>
                    </NativeSelect>
                    <InputError message={form.errors.kind} />
                </div>
            </div>

            {type === 'wajib' && form.data.kind === 'deposit' && (
                <div className="grid gap-2">
                    <Label htmlFor="period">Bulan yang dibayar</Label>
                    <NativeSelect
                        id="period"
                        value={form.data.period}
                        onChange={(e) => form.setData('period', e.target.value)}
                    >
                        {months.map((m) => (
                            <option
                                key={m.value}
                                value={m.value}
                                disabled={m.paid}
                            >
                                {m.label}
                                {m.paid ? ' (sudah dibayar)' : ''}
                            </option>
                        ))}
                    </NativeSelect>
                    <InputError message={form.errors.period} />
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input
                    id="amount"
                    type="number"
                    min={1}
                    value={form.data.amount}
                    onChange={(e) => form.setData('amount', e.target.value)}
                />
                {fixed !== null && (
                    <p className="text-xs text-muted-foreground">
                        Tarif {formatRupiah(fixed)}
                        {type === 'wajib' ? ' per bulan' : ', dibayar sekali'}.
                    </p>
                )}
                {type === 'sukarela' && form.data.kind === 'deposit' && (
                    <p className="text-xs text-muted-foreground">
                        Minimal {formatRupiah(rates.sukarela_min)}.
                    </p>
                )}
                <InputError message={form.errors.amount} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="note">Catatan (opsional)</Label>
                <Input
                    id="note"
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                />
                <InputError message={form.errors.note} />
            </div>

            <Button
                disabled={
                    form.processing ||
                    form.data.amount === '' ||
                    withdrawBlocked
                }
            >
                {form.data.kind === 'deposit'
                    ? 'Catat setoran'
                    : 'Catat penarikan'}
            </Button>
        </form>
    );
}

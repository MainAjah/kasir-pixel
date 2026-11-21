import { SAVINGS_TYPES } from '@/lib/savings';
import { formatRupiah } from '@/lib/format';
import type { Balances } from '@/types';

/** Saldo per jenis simpanan. Hanya tampilan. */
export default function SaldoCards({ balances }: { balances: Balances }) {
    const total = balances.pokok + balances.wajib + balances.sukarela;

    return (
        <div className="grid gap-3 sm:grid-cols-4">
            {SAVINGS_TYPES.map((t) => (
                <div key={t.value} className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">
                        {t.label}
                    </div>
                    <div className="text-xl font-semibold">
                        {formatRupiah(balances[t.value])}
                    </div>
                </div>
            ))}
            <div className="rounded-md border bg-muted/40 p-4">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-xl font-semibold">
                    {formatRupiah(total)}
                </div>
            </div>
        </div>
    );
}

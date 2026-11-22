import { router } from '@inertiajs/react';
import { useState } from 'react';
import NativeSelect from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ReportFilters = {
    preset: string;
    from: string;
    to: string;
    kasir?: number | null;
};

const PRESETS = [
    { value: 'hari-ini', label: 'Hari ini' },
    { value: '7-hari', label: '7 hari' },
    { value: 'bulan-ini', label: 'Bulan ini' },
    { value: 'rentang', label: 'Rentang' },
];

type Props = {
    /** Alamat halaman laporan (tanpa query). */
    url: string;
    /** Alamat ekspor CSV (tanpa query). */
    csvUrl: string;
    filters: ReportFilters;
    cashiers?: { id: number; name: string }[];
    errors?: Record<string, string | undefined>;
};

/** Query string filter laporan, sama untuk halaman dan CSV. */
export function filterQuery(f: {
    preset: string;
    from?: string;
    to?: string;
    kasir?: number | string | null;
}): Record<string, string> {
    const q: Record<string, string> = { periode: f.preset };

    if (f.preset === 'rentang') {
        q.dari = f.from ?? '';
        q.sampai = f.to ?? '';
    }

    if (f.kasir) {
        q.kasir = String(f.kasir);
    }

    return q;
}

/**
 * Filter periode laporan (Tahap 6C): Hari ini, 7 hari, Bulan ini, atau rentang
 * bebas; pilihan kasir (opsional); dan tombol Ekspor CSV dengan filter yang sama.
 */
export default function PeriodFilter({
    url,
    csvUrl,
    filters,
    cashiers,
    errors = {},
}: Props) {
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [rangeOpen, setRangeOpen] = useState(filters.preset === 'rentang');
    const kasir = filters.kasir ? String(filters.kasir) : '';

    const go = (next: { preset: string; kasir?: string }) =>
        router.get(
            url,
            filterQuery({
                preset: next.preset,
                from,
                to,
                kasir: next.kasir ?? kasir,
            }),
            { preserveScroll: true, preserveState: true },
        );

    const csvHref = `${csvUrl}?${new URLSearchParams(filterQuery({ ...filters, kasir }))}`;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
                <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Periode"
                >
                    {PRESETS.map((p) => {
                        const active =
                            p.value === 'rentang'
                                ? rangeOpen
                                : !rangeOpen && filters.preset === p.value;

                        return (
                            <Button
                                key={p.value}
                                size="sm"
                                variant={active ? 'default' : 'outline'}
                                aria-pressed={active}
                                onClick={() => {
                                    if (p.value === 'rentang') {
                                        setRangeOpen(true);

                                        return;
                                    }

                                    setRangeOpen(false);
                                    go({ preset: p.value });
                                }}
                            >
                                {p.label}
                            </Button>
                        );
                    })}
                </div>

                {cashiers && (
                    <div className="grid gap-1">
                        <Label htmlFor="kasir" className="text-xs">
                            Kasir
                        </Label>
                        <NativeSelect
                            id="kasir"
                            className="h-8 w-44"
                            value={kasir}
                            onChange={(e) =>
                                go({
                                    preset: rangeOpen
                                        ? 'rentang'
                                        : filters.preset,
                                    kasir: e.target.value,
                                })
                            }
                        >
                            <option value="">Semua kasir</option>
                            {cashiers.map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                    {c.name}
                                </option>
                            ))}
                        </NativeSelect>
                    </div>
                )}

                <Button
                    size="sm"
                    variant="secondary"
                    asChild
                    className="ml-auto"
                >
                    <a href={csvHref} download>
                        Ekspor CSV
                    </a>
                </Button>
            </div>

            {rangeOpen && (
                <div className="flex flex-wrap items-end gap-2">
                    <div className="grid gap-1">
                        <Label htmlFor="dari" className="text-xs">
                            Dari
                        </Label>
                        <Input
                            id="dari"
                            type="date"
                            className="h-8 w-40"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="sampai" className="text-xs">
                            Sampai
                        </Label>
                        <Input
                            id="sampai"
                            type="date"
                            className="h-8 w-40"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>
                    <Button size="sm" onClick={() => go({ preset: 'rentang' })}>
                        Terapkan
                    </Button>
                </div>
            )}

            {(errors.dari || errors.sampai || errors.periode) && (
                <p className="text-sm text-destructive">
                    {errors.dari ?? errors.sampai ?? errors.periode}
                </p>
            )}
        </div>
    );
}

/** Kartu angka berbingkai pixel sederhana. */
export function StatCard({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="border-[3px] border-current p-3 text-foreground shadow-[3px_3px_0_currentColor]">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold break-words">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

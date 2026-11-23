import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import NativeSelect from '@/components/native-select';
import {
    PRIMARY_BUTTON,
    SECONDARY_BUTTON,
    TAB,
    TAB_ACTIVE,
    TAB_IDLE,
} from '@/components/pixel/styles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
        <div className="pixel-form space-y-3">
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
                            <button
                                key={p.value}
                                type="button"
                                className={cn(
                                    TAB,
                                    active ? TAB_ACTIVE : TAB_IDLE,
                                )}
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
                            </button>
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

                <a
                    href={csvHref}
                    download
                    className={cn(SECONDARY_BUTTON, 'ml-auto h-9 text-sm')}
                >
                    Ekspor CSV
                </a>
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
                    <button
                        type="button"
                        className={cn(PRIMARY_BUTTON, 'h-9 text-sm')}
                        onClick={() => go({ preset: 'rentang' })}
                    >
                        Terapkan
                    </button>
                </div>
            )}

            {(errors.dari || errors.sampai || errors.periode) && (
                <p className="inline-block bg-px-bata px-1.5 text-sm text-px-tinta">
                    {errors.dari ?? errors.sampai ?? errors.periode}
                </p>
            )}
        </div>
    );
}

/** Warna kotak ikon kartu angka (palet diorama). */
const STAT_TONES = {
    kunyit: 'bg-px-kunyit',
    daun: 'bg-px-daun',
    lampu: 'bg-px-lampu',
    bata: 'bg-px-bata',
    langit: 'bg-px-langit',
} as const;

/**
 * Kartu angka berbingkai pixel (gaya 5E): kertas krem, bingkai tinta tebal,
 * angka besar dengan font pixel, dan kotak ikon berwarna palet bila ada.
 */
export function StatCard({
    label,
    value,
    hint,
    icon,
    tone = 'kunyit',
}: {
    label: string;
    value: string;
    hint?: string;
    icon?: ReactNode;
    tone?: keyof typeof STAT_TONES;
}) {
    return (
        <div className="flex items-center gap-3 bg-px-sorotan p-3 text-px-tinta pixel-frame">
            {icon && (
                <span
                    className={`grid size-11 shrink-0 place-items-center border-2 border-px-tinta ${STAT_TONES[tone]}`}
                >
                    {icon}
                </span>
            )}
            <div className="min-w-0">
                <p className="text-xs text-px-bayangan">{label}</p>
                <p className="font-pixel text-2xl leading-tight break-words">
                    {value}
                </p>
                {hint && <p className="text-xs text-px-bayangan">{hint}</p>}
            </div>
        </div>
    );
}

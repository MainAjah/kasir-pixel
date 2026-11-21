import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import MemberController from '@/actions/App/Http/Controllers/Members/MemberController';
import Heading from '@/components/heading';
import ExitMemberDialog from '@/components/members/exit-member-dialog';
import LedgerTable from '@/components/members/ledger-table';
import ReverseDialog from '@/components/members/reverse-dialog';
import SaldoCards from '@/components/members/saldo-cards';
import SavingsForm from '@/components/members/savings-form';
import NativeSelect from '@/components/native-select';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SAVINGS_TYPES } from '@/lib/savings';
import type {
    Balances,
    LedgerEntry,
    MemberSummary,
    MonthOption,
    Paginated,
    Rates,
} from '@/types';

/** Buku simpanan satu anggota: data, saldo per jenis, form setor/tarik, dan riwayat. */
export default function Buku({
    member,
    balances,
    rates,
    months,
    entries,
    filter,
}: {
    member: MemberSummary;
    balances: Balances;
    rates: Rates;
    months: MonthOption[];
    entries: Paginated<LedgerEntry>;
    filter: string | null;
}) {
    const [target, setTarget] = useState<LedgerEntry | null>(null);
    const [open, setOpen] = useState(false);
    const total = balances.pokok + balances.wajib + balances.sukarela;

    return (
        <>
            <Head title={`Buku simpanan ${member.name}`} />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title={member.name}
                        description={`${member.number} · bergabung ${member.joined_at}${member.exited_at ? ` · keluar ${member.exited_at}` : ''}`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant={
                                member.is_active ? 'secondary' : 'destructive'
                            }
                        >
                            {member.status_label}
                        </Badge>
                        <Button variant="secondary" asChild>
                            <Link href={MemberController.edit(member.id)}>
                                Ubah data
                            </Link>
                        </Button>
                        {member.is_active && (
                            <ExitMemberDialog
                                memberId={member.id}
                                memberName={member.name}
                                total={total}
                            />
                        )}
                    </div>
                </div>

                <p className="text-sm text-muted-foreground">
                    {[member.phone, member.address]
                        .filter(Boolean)
                        .join(' · ') || 'Tanpa kontak'}
                </p>

                <SaldoCards balances={balances} />

                {member.is_active ? (
                    <SavingsForm
                        memberId={member.id}
                        rates={rates}
                        months={months}
                    />
                ) : (
                    <p className="rounded-md border p-4 text-sm text-muted-foreground">
                        Anggota sudah keluar: tidak ada setoran atau penarikan
                        baru. Koreksi tetap bisa lewat tombol Balik pada
                        riwayat.
                    </p>
                )}

                <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-medium">Riwayat</h3>
                        <NativeSelect
                            className="w-48"
                            aria-label="Saring jenis"
                            value={filter ?? ''}
                            onChange={(e) =>
                                router.get(
                                    MemberController.show.url(member.id, {
                                        query: {
                                            jenis: e.target.value || undefined,
                                        },
                                    }),
                                    {},
                                    {
                                        preserveScroll: true,
                                        preserveState: true,
                                    },
                                )
                            }
                        >
                            <option value="">Semua jenis</option>
                            {SAVINGS_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </NativeSelect>
                    </div>

                    <LedgerTable
                        entries={entries.data}
                        onReverse={(e) => {
                            setTarget(e);
                            setOpen(true);
                        }}
                    />
                    <Pagination links={entries.links} />
                </section>
            </div>

            <ReverseDialog
                entry={target}
                open={open}
                onClose={() => setOpen(false)}
            />
        </>
    );
}

Buku.layout = {
    breadcrumbs: [
        { title: 'Anggota', href: MemberController.index() },
        { title: 'Buku simpanan', href: MemberController.index() },
    ],
};

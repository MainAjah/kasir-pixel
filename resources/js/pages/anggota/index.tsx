import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import MemberController from '@/actions/App/Http/Controllers/Members/MemberController';
import Heading from '@/components/heading';
import NativeSelect from '@/components/native-select';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/format';
import type { Balances, Paginated } from '@/types';

type Row = {
    id: number;
    number: string;
    name: string;
    phone: string | null;
    status: 'active' | 'exited';
    status_label: string;
    joined_at: string;
    balances: Balances;
    pokok_unpaid: boolean;
};

export default function AnggotaIndex({
    members,
    filters,
}: {
    members: Paginated<Row>;
    filters: { q: string; status: string };
}) {
    const [q, setQ] = useState(filters.q);
    const [status, setStatus] = useState(filters.status);

    function search(nextQ = q, nextStatus = status) {
        router.get(
            MemberController.index.url({
                query: {
                    q: nextQ || undefined,
                    status: nextStatus === 'all' ? undefined : nextStatus,
                },
            }),
            {},
            { preserveState: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Anggota" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Anggota"
                        description="Saldo simpanan dihitung dari ledger, bukan kolom yang ditimpa."
                    />
                    <Button asChild>
                        <Link href={MemberController.create()}>
                            Daftarkan anggota
                        </Link>
                    </Button>
                </div>

                <form
                    className="flex flex-wrap items-center gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        search();
                    }}
                >
                    <Input
                        className="max-w-xs"
                        placeholder="Cari nomor atau nama"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <NativeSelect
                        className="w-40"
                        aria-label="Status"
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            search(q, e.target.value);
                        }}
                    >
                        <option value="all">Semua status</option>
                        <option value="active">Aktif</option>
                        <option value="exited">Keluar</option>
                    </NativeSelect>
                    <Button type="submit" variant="secondary">
                        Cari
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Nomor</th>
                                <th className="p-3">Nama</th>
                                <th className="p-3">Bergabung</th>
                                <th className="p-3 text-right">Pokok</th>
                                <th className="p-3 text-right">Wajib</th>
                                <th className="p-3 text-right">Sukarela</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {members.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        Belum ada anggota.
                                    </td>
                                </tr>
                            )}
                            {members.data.map((m) => (
                                <tr key={m.id} className="border-t">
                                    <td className="p-3 font-mono">
                                        {m.number}
                                    </td>
                                    <td className="p-3">
                                        {m.name}
                                        {m.status === 'exited' && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-2"
                                            >
                                                {m.status_label}
                                            </Badge>
                                        )}
                                        {m.pokok_unpaid && (
                                            <Badge
                                                variant="outline"
                                                className="ml-2"
                                            >
                                                Pokok belum dibayar
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-3 whitespace-nowrap">
                                        {m.joined_at}
                                    </td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        {formatRupiah(m.balances.pokok)}
                                    </td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        {formatRupiah(m.balances.wajib)}
                                    </td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        {formatRupiah(m.balances.sukarela)}
                                    </td>
                                    <td className="p-3 text-right">
                                        <Link
                                            className="underline"
                                            href={MemberController.show(m.id)}
                                        >
                                            Buku
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination links={members.links} />
            </div>
        </>
    );
}

AnggotaIndex.layout = {
    breadcrumbs: [{ title: 'Anggota', href: MemberController.index() }],
};

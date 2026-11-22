import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AccessController from '@/actions/App/Http/Controllers/Admin/AccessController';
import PixelTable, {
    ActiveBadge,
    ROLE_LABELS,
    RoleBadge,
} from '@/components/admin/pixel-table';
import Heading from '@/components/heading';
import NativeSelect from '@/components/native-select';
import { Button } from '@/components/ui/button';

type RoleCard = {
    value: string;
    label: string;
    users: number;
    active_users: number;
};

type AccessRow = { key: string; label: string; roles: string[] };

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    is_active: boolean;
    is_self: boolean;
};

function RoleSelect({ user }: { user: UserRow }) {
    const [role, setRole] = useState(user.role ?? '');
    const [saving, setSaving] = useState(false);
    const changed = role !== (user.role ?? '');

    return (
        <div className="flex items-center justify-end gap-2">
            <NativeSelect
                aria-label={`Peran ${user.name}`}
                className="w-36"
                value={role}
                disabled={user.is_self}
                onChange={(e) => setRole(e.target.value)}
            >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </NativeSelect>
            <Button
                size="sm"
                disabled={!changed || saving || user.is_self}
                onClick={() =>
                    router.put(
                        AccessController.update.url(user.id),
                        { role },
                        {
                            preserveScroll: true,
                            onStart: () => setSaving(true),
                            onFinish: () => setSaving(false),
                            // Ditolak server: kembalikan pilihan ke peran semula.
                            onSuccess: (page) => {
                                const fresh = (
                                    page.props.users as UserRow[]
                                ).find((u) => u.id === user.id);
                                setRole(fresh?.role ?? '');
                            },
                        },
                    )
                }
            >
                Simpan
            </Button>
        </div>
    );
}

/**
 * Hak akses (Tahap 6B, admin): peran yang ada, peta apa yang bisa dibuka tiap
 * peran (hanya baca, dari kode), dan mengganti peran pengguna.
 */
export default function HakAksesIndex({
    roles,
    rows,
    users,
}: {
    roles: RoleCard[];
    rows: AccessRow[];
    users: UserRow[];
}) {
    return (
        <>
            <Head title="Hak akses" />

            <div className="space-y-8 p-4">
                <Heading
                    title="Hak akses"
                    description="Tiga peran tetap: Admin, Kasir, Bendahara. Tabel di bawah menunjukkan halaman yang bisa dibuka tiap peran; penjagaannya ada di server."
                />

                <section className="grid gap-4 sm:grid-cols-3">
                    {roles.map((r) => (
                        <div
                            key={r.value}
                            className="border-[3px] border-current p-4 text-foreground shadow-[3px_3px_0_currentColor]"
                        >
                            <RoleBadge role={r.value} label={r.label} />
                            <p className="mt-3 text-2xl font-bold">{r.users}</p>
                            <p className="text-sm text-muted-foreground">
                                pengguna ({r.active_users} aktif)
                            </p>
                        </div>
                    ))}
                </section>

                <section className="space-y-3">
                    <h3 className="font-semibold">Apa yang bisa dibuka</h3>
                    <PixelTable>
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Fitur</th>
                                {roles.map((r) => (
                                    <th
                                        key={r.value}
                                        className="p-3 text-center"
                                    >
                                        {r.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.key} className="border-t">
                                    <td className="p-3">{row.label}</td>
                                    {roles.map((r) => {
                                        const ok = row.roles.includes(r.value);

                                        return (
                                            <td
                                                key={r.value}
                                                className="p-3 text-center"
                                            >
                                                <span
                                                    aria-label={
                                                        ok ? 'Boleh' : 'Tidak'
                                                    }
                                                    className={
                                                        ok
                                                            ? 'font-bold text-[#6fae7b]'
                                                            : 'text-muted-foreground'
                                                    }
                                                >
                                                    {ok ? '✓' : '–'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </PixelTable>
                </section>

                <section className="space-y-3">
                    <h3 className="font-semibold">Peran tiap pengguna</h3>
                    <p className="text-sm text-muted-foreground">
                        Anda tidak bisa mengubah peran sendiri, dan harus selalu
                        ada minimal satu admin aktif.
                    </p>
                    <PixelTable>
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Nama</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Peran</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-t">
                                    <td className="p-3 font-medium">
                                        {u.name}
                                        {u.is_self && (
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                (Anda)
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">{u.email}</td>
                                    <td className="p-3">
                                        <ActiveBadge active={u.is_active} />
                                    </td>
                                    <td className="p-3">
                                        <RoleSelect
                                            key={`${u.id}-${u.role}`}
                                            user={u}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </PixelTable>
                </section>
            </div>
        </>
    );
}

HakAksesIndex.layout = {
    breadcrumbs: [{ title: 'Hak akses', href: AccessController.index() }],
};

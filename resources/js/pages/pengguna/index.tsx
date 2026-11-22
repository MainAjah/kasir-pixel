import { Head, Link, router } from '@inertiajs/react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import PixelTable, {
    ActiveBadge,
    RoleBadge,
} from '@/components/admin/pixel-table';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import type { Paginated } from '@/types';

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    role_label: string;
    is_active: boolean;
    is_self: boolean;
};

/** Kelola pengguna (Tahap 6B, admin). Pengguna dinonaktifkan, tidak dihapus. */
export default function PenggunaIndex({
    users,
}: {
    users: Paginated<UserRow>;
}) {
    function toggle(user: UserRow) {
        if (
            user.is_active &&
            !window.confirm(
                `Nonaktifkan ${user.name}? Ia tidak bisa masuk sampai diaktifkan lagi.`,
            )
        ) {
            return;
        }

        router.post(
            user.is_active
                ? UserController.deactivate.url(user.id)
                : UserController.activate.url(user.id),
            {},
            { preserveScroll: true },
        );
    }

    return (
        <>
            <Head title="Pengguna" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Pengguna"
                        description="Akun yang bisa masuk ke aplikasi. Pengguna dinonaktifkan, tidak dihapus; selalu harus ada minimal satu admin aktif."
                    />
                    <Button asChild>
                        <Link href={UserController.create()}>
                            Tambah pengguna
                        </Link>
                    </Button>
                </div>

                <PixelTable>
                    <thead className="bg-muted/50 text-left">
                        <tr>
                            <th className="p-3">Nama</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Peran</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.data.map((u) => (
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
                                    <RoleBadge
                                        role={u.role}
                                        label={u.role_label}
                                    />
                                </td>
                                <td className="p-3">
                                    <ActiveBadge active={u.is_active} />
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link
                                                href={UserController.edit(u.id)}
                                            >
                                                Ubah
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={
                                                u.is_active
                                                    ? 'outline'
                                                    : 'secondary'
                                            }
                                            disabled={u.is_self}
                                            title={
                                                u.is_self
                                                    ? 'Anda tidak bisa menonaktifkan akun sendiri.'
                                                    : undefined
                                            }
                                            onClick={() => toggle(u)}
                                        >
                                            {u.is_active
                                                ? 'Nonaktifkan'
                                                : 'Aktifkan'}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </PixelTable>

                <Pagination links={users.links} />
            </div>
        </>
    );
}

PenggunaIndex.layout = {
    breadcrumbs: [{ title: 'Pengguna', href: UserController.index() }],
};

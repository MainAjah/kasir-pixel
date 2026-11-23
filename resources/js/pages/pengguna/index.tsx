import { Head, Link, router } from '@inertiajs/react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import PixelTable, {
    ActiveBadge,
    RoleBadge,
} from '@/components/admin/pixel-table';
import Pagination from '@/components/pagination';
import PixelGlyph, { GLYPHS } from '@/components/pixel/pixel-glyph';
import {
    ICON_BUTTON,
    PRIMARY_BUTTON,
    ROW,
    TBODY,
    THEAD,
    TOGGLE_BUTTON,
} from '@/components/pixel/styles';
import { cn } from '@/lib/utils';
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

/**
 * Kelola pengguna (Tahap 6B, admin; gaya pixel 5E-2). Pengguna dinonaktifkan,
 * tidak dihapus.
 */
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

            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-prose text-sm text-px-bayangan">
                        Akun yang bisa masuk ke aplikasi. Pengguna
                        dinonaktifkan, tidak dihapus; selalu harus ada minimal
                        satu admin aktif.
                    </p>
                    <Link
                        href={UserController.create()}
                        className={PRIMARY_BUTTON}
                    >
                        <PixelGlyph rows={GLYPHS.tambah} />
                        Tambah pengguna
                    </Link>
                </div>

                <PixelTable>
                    <thead className={THEAD}>
                        <tr>
                            <th className="p-3">Nama</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Peran</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className={TBODY}>
                        {users.data.map((u) => (
                            <tr key={u.id} className={ROW}>
                                <td className="p-3 font-semibold">
                                    {u.name}
                                    {u.is_self && (
                                        <span className="ml-2 text-xs font-normal text-px-bayangan">
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
                                    <div className="flex justify-end gap-1.5">
                                        <Link
                                            href={UserController.edit(u.id)}
                                            className={ICON_BUTTON}
                                            aria-label={`Ubah ${u.name}`}
                                            title="Ubah"
                                        >
                                            <PixelGlyph rows={GLYPHS.ubah} />
                                        </Link>
                                        <button
                                            type="button"
                                            className={cn(
                                                TOGGLE_BUTTON,
                                                u.is_active
                                                    ? 'bg-px-sorotan hover:bg-px-bata'
                                                    : 'bg-px-daun hover:bg-px-lampu',
                                            )}
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
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </PixelTable>

                <Pagination
                    links={users.links}
                    from={users.from}
                    to={users.to}
                    total={users.total}
                />
            </div>
        </>
    );
}

PenggunaIndex.layout = {
    breadcrumbs: [{ title: 'Pengguna', href: UserController.index() }],
};

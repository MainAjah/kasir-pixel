import { Head, Link, useForm } from '@inertiajs/react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UserData = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    is_self: boolean;
};

type RoleOption = { value: string; label: string };

/** Tambah atau ubah pengguna (Tahap 6B, admin). */
export default function PenggunaForm({
    user,
    roles,
}: {
    user: UserData | null;
    roles: RoleOption[];
}) {
    const form = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'kasir',
        password: '',
        password_confirmation: '',
    });

    return (
        <>
            <Head title={user ? 'Ubah pengguna' : 'Tambah pengguna'} />

            <div className="space-y-6 p-4">
                <Heading
                    title={user ? `Ubah ${user.name}` : 'Tambah pengguna'}
                    description={
                        user
                            ? 'Kosongkan kata sandi bila tidak ingin menggantinya.'
                            : 'Pengguna baru langsung aktif dan bisa masuk dengan email dan kata sandi ini.'
                    }
                />

                <form
                    className="max-w-xl space-y-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.submit(
                            user
                                ? UserController.update(user.id)
                                : UserController.store(),
                        );
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama</Label>
                        <Input
                            id="name"
                            autoFocus
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                        />
                        <InputError message={form.errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={form.data.email}
                            onChange={(e) =>
                                form.setData('email', e.target.value)
                            }
                        />
                        <InputError message={form.errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="role">Peran</Label>
                        <NativeSelect
                            id="role"
                            value={form.data.role}
                            disabled={user?.is_self}
                            onChange={(e) =>
                                form.setData('role', e.target.value)
                            }
                        >
                            {roles.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </NativeSelect>
                        {user?.is_self && (
                            <p className="text-xs text-muted-foreground">
                                Anda tidak bisa mengubah peran sendiri.
                            </p>
                        )}
                        <InputError message={form.errors.role} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                {user ? 'Kata sandi baru' : 'Kata sandi'}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password}
                                onChange={(e) =>
                                    form.setData('password', e.target.value)
                                }
                            />
                            <InputError message={form.errors.password} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Ulangi kata sandi
                            </Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password_confirmation}
                                onChange={(e) =>
                                    form.setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button disabled={form.processing}>Simpan</Button>
                        <Button variant="ghost" asChild>
                            <Link href={UserController.index()}>Batal</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

PenggunaForm.layout = {
    breadcrumbs: [
        { title: 'Pengguna', href: UserController.index() },
        { title: 'Formulir', href: UserController.index() },
    ],
};

import { Link, useForm } from '@inertiajs/react';
import MemberController from '@/actions/App/Http/Controllers/Members/MemberController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MemberData = {
    id: number;
    number: string;
    name: string;
    phone: string | null;
    address: string | null;
    joined_at: string;
};

/** Form buat dan ubah anggota. Nomor dan status tidak bisa diisi dari sini. */
export default function MemberForm({ member }: { member: MemberData | null }) {
    const form = useForm({
        name: member?.name ?? '',
        phone: member?.phone ?? '',
        address: member?.address ?? '',
        joined_at: member?.joined_at ?? '',
    });

    return (
        <form
            className="max-w-xl space-y-6"
            onSubmit={(e) => {
                e.preventDefault();
                form.submit(
                    member
                        ? MemberController.update(member.id)
                        : MemberController.store(),
                );
            }}
        >
            {member && (
                <p className="text-sm text-muted-foreground">
                    Nomor anggota{' '}
                    <span className="font-mono">{member.number}</span> tidak
                    bisa diubah.
                </p>
            )}

            <div className="grid gap-2">
                <Label htmlFor="name">Nama</Label>
                <Input
                    id="name"
                    autoFocus
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                />
                <InputError message={form.errors.name} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="phone">Telepon</Label>
                    <Input
                        id="phone"
                        value={form.data.phone}
                        onChange={(e) => form.setData('phone', e.target.value)}
                    />
                    <InputError message={form.errors.phone} />
                </div>
                {!member && (
                    <div className="grid gap-2">
                        <Label htmlFor="joined_at">Tanggal bergabung</Label>
                        <Input
                            id="joined_at"
                            type="date"
                            value={form.data.joined_at}
                            onChange={(e) =>
                                form.setData('joined_at', e.target.value)
                            }
                        />
                        <p className="text-xs text-muted-foreground">
                            Kosongkan untuk hari ini.
                        </p>
                        <InputError message={form.errors.joined_at} />
                    </div>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="address">Alamat</Label>
                <Input
                    id="address"
                    value={form.data.address}
                    onChange={(e) => form.setData('address', e.target.value)}
                />
                <InputError message={form.errors.address} />
            </div>

            <div className="flex items-center gap-3">
                <Button disabled={form.processing}>Simpan</Button>
                <Button variant="ghost" asChild>
                    <Link
                        href={
                            member
                                ? MemberController.show(member.id)
                                : MemberController.index()
                        }
                    >
                        Batal
                    </Link>
                </Button>
            </div>
        </form>
    );
}

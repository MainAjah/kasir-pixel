import { Head, Link, useForm } from '@inertiajs/react';
import SupplierController from '@/actions/App/Http/Controllers/Inventory/SupplierController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SupplierData = {
    id: number;
    name: string;
    contact: string | null;
    address: string | null;
    note: string | null;
};

/** Tambah atau ubah supplier (Tahap 6B, admin). */
export default function SupplierForm({
    supplier,
}: {
    supplier: SupplierData | null;
}) {
    const form = useForm({
        name: supplier?.name ?? '',
        contact: supplier?.contact ?? '',
        address: supplier?.address ?? '',
        note: supplier?.note ?? '',
    });

    return (
        <>
            <Head title={supplier ? 'Ubah supplier' : 'Tambah supplier'} />

            <div className="space-y-6 p-4">
                <Heading
                    title={
                        supplier ? `Ubah ${supplier.name}` : 'Tambah supplier'
                    }
                    description="Nama wajib; kontak, alamat, dan catatan boleh dikosongkan."
                />

                <form
                    className="max-w-xl space-y-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.submit(
                            supplier
                                ? SupplierController.update(supplier.id)
                                : SupplierController.store(),
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
                        <Label htmlFor="contact">Kontak</Label>
                        <Input
                            id="contact"
                            placeholder="Telepon atau nama orang yang dihubungi"
                            value={form.data.contact}
                            onChange={(e) =>
                                form.setData('contact', e.target.value)
                            }
                        />
                        <InputError message={form.errors.contact} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="address">Alamat</Label>
                        <Input
                            id="address"
                            value={form.data.address}
                            onChange={(e) =>
                                form.setData('address', e.target.value)
                            }
                        />
                        <InputError message={form.errors.address} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="note">Catatan</Label>
                        <Input
                            id="note"
                            value={form.data.note}
                            onChange={(e) =>
                                form.setData('note', e.target.value)
                            }
                        />
                        <InputError message={form.errors.note} />
                    </div>

                    <div className="flex items-center gap-3">
                        <Button disabled={form.processing}>Simpan</Button>
                        <Button variant="ghost" asChild>
                            <Link href={SupplierController.index()}>Batal</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

SupplierForm.layout = {
    breadcrumbs: [
        { title: 'Supplier', href: SupplierController.index() },
        { title: 'Formulir', href: SupplierController.index() },
    ],
};

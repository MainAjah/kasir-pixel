import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import CategoryController from '@/actions/App/Http/Controllers/Inventory/CategoryController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Category = { id: number; name: string; products_count: number };

export default function KategoriIndex({
    categories,
}: {
    categories: Category[];
}) {
    const create = useForm({ name: '' });
    const edit = useForm({ name: '' });
    const [editingId, setEditingId] = useState<number | null>(null);

    return (
        <>
            <Head title="Kategori" />

            <div className="max-w-2xl space-y-6 p-4">
                <Heading title="Kategori" description="Pengelompokan produk." />

                <form
                    className="flex items-start gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        create.submit(CategoryController.store(), {
                            preserveScroll: true,
                            onSuccess: () => create.reset(),
                        });
                    }}
                >
                    <div className="grid flex-1 gap-2">
                        <Input
                            placeholder="Nama kategori baru"
                            aria-label="Nama kategori baru"
                            value={create.data.name}
                            onChange={(e) =>
                                create.setData('name', e.target.value)
                            }
                        />
                        <InputError message={create.errors.name} />
                    </div>
                    <Button disabled={create.processing}>Tambah</Button>
                </form>

                <ul className="divide-y rounded-md border">
                    {categories.length === 0 && (
                        <li className="p-4 text-center text-sm text-muted-foreground">
                            Belum ada kategori.
                        </li>
                    )}
                    {categories.map((c) => (
                        <li key={c.id} className="flex items-start gap-3 p-3">
                            {editingId === c.id ? (
                                <form
                                    className="flex flex-1 items-start gap-3"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        edit.submit(
                                            CategoryController.update(c.id),
                                            {
                                                preserveScroll: true,
                                                onSuccess: () =>
                                                    setEditingId(null),
                                            },
                                        );
                                    }}
                                >
                                    <div className="grid flex-1 gap-2">
                                        <Input
                                            aria-label="Nama kategori"
                                            value={edit.data.name}
                                            onChange={(e) =>
                                                edit.setData(
                                                    'name',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={edit.errors.name}
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        disabled={edit.processing}
                                    >
                                        Simpan
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingId(null)}
                                    >
                                        Batal
                                    </Button>
                                </form>
                            ) : (
                                <>
                                    <span className="flex-1 py-1 text-sm">
                                        {c.name}
                                        <span className="ml-2 text-muted-foreground">
                                            ({c.products_count} produk)
                                        </span>
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            edit.clearErrors();
                                            edit.setData('name', c.name);
                                            setEditingId(c.id);
                                        }}
                                    >
                                        Ubah
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={c.products_count > 0}
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    `Hapus kategori "${c.name}"?`,
                                                )
                                            ) {
                                                router.delete(
                                                    CategoryController.destroy.url(
                                                        c.id,
                                                    ),
                                                    { preserveScroll: true },
                                                );
                                            }
                                        }}
                                    >
                                        Hapus
                                    </Button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

KategoriIndex.layout = {
    breadcrumbs: [{ title: 'Kategori', href: CategoryController.index() }],
};

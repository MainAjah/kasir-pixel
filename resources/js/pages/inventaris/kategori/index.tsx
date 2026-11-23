import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import CategoryController from '@/actions/App/Http/Controllers/Inventory/CategoryController';
import InputError from '@/components/input-error';
import PixelPanel from '@/components/pixel/pixel-panel';
import { PRIMARY_BUTTON } from '@/components/pixel/styles';
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

            <div className="max-w-2xl p-4">
                <PixelPanel
                    className="pixel-form"
                    title="Kategori"
                    description="Pengelompokan produk. Kategori yang masih dipakai produk tidak bisa dihapus."
                >
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
                        <button
                            className={PRIMARY_BUTTON}
                            disabled={create.processing}
                        >
                            Tambah
                        </button>
                    </form>

                    <ul className="border-2 border-px-tinta bg-px-krem">
                        {categories.length === 0 && (
                            <li className="p-4 text-center text-sm text-px-bayangan">
                                Belum ada kategori.
                            </li>
                        )}
                        {categories.map((c) => (
                            <li
                                key={c.id}
                                className="flex items-start gap-3 border-t-2 border-dashed border-px-lantai p-3 first:border-t-0"
                            >
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
                                        <span className="flex-1 py-1 text-sm font-semibold text-px-tinta">
                                            {c.name}
                                            <span className="ml-2 font-normal text-px-bayangan">
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
                                                        {
                                                            preserveScroll: true,
                                                        },
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
                </PixelPanel>
            </div>
        </>
    );
}

KategoriIndex.layout = {
    breadcrumbs: [{ title: 'Kategori', href: CategoryController.index() }],
};

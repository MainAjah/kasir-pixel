import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import ProductImageController from '@/actions/App/Http/Controllers/Inventory/ProductImageController';
import PixelIcon from '@/components/beranda/pixel-icon';
import StockAdjustmentController from '@/actions/App/Http/Controllers/Inventory/StockAdjustmentController';
import StockCardController from '@/actions/App/Http/Controllers/Inventory/StockCardController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type UnitRow = {
    id: number | null;
    name: string;
    conversion: number | string;
    sell_price: number | string;
    barcode: string;
    is_base: boolean;
    in_use?: boolean;
};

type ProductData = {
    id: number;
    sku: string;
    name: string;
    category_id: number | null;
    min_stock: number;
    is_active: boolean;
    image_url: string | null;
    has_movements: boolean;
    units: (Omit<UnitRow, 'barcode'> & { barcode: string | null })[];
};

/**
 * Gambar barang untuk kartu kasir. Disimpan terpisah dari form
 * utama (unggah langsung), jadi data produk dan satuan tidak ikut terkirim.
 */
function ProductImageSection({ product }: { product: ProductData }) {
    const form = useForm<{ image: File | null }>({ image: null });

    return (
        <section className="space-y-3">
            <h3 className="font-medium">Gambar barang</h3>
            <p className="text-sm text-muted-foreground">
                Tampil di kartu kasir. Pakai PNG berlatar transparan, paling
                besar 2 MB. Tanpa gambar, dipakai ikon kardus.
            </p>
            <div className="flex flex-wrap items-center gap-4">
                <div className="grid size-20 place-items-center border-2 border-px-tinta bg-px-sorotan">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={`Gambar ${product.name}`}
                            className="max-h-16 max-w-16 object-contain [image-rendering:pixelated]"
                        />
                    ) : (
                        <PixelIcon name="produk" scale={4} />
                    )}
                </div>
                <div className="grid gap-2">
                    <Input
                        type="file"
                        accept="image/png,image/webp,image/gif,image/jpeg"
                        aria-label="Pilih gambar barang"
                        onChange={(e) =>
                            form.setData('image', e.target.files?.[0] ?? null)
                        }
                    />
                    <InputError message={form.errors.image} />
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            disabled={
                                form.processing || form.data.image === null
                            }
                            onClick={() =>
                                form.post(
                                    ProductImageController.store.url(
                                        product.id,
                                    ),
                                    {
                                        forceFormData: true,
                                        preserveScroll: true,
                                        onSuccess: () => form.reset(),
                                    },
                                )
                            }
                        >
                            Unggah gambar
                        </Button>
                        {product.image_url && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                    router.delete(
                                        ProductImageController.destroy.url(
                                            product.id,
                                        ),
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Lepas gambar
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

/**
 * Pemilih gambar untuk produk baru (Tahap 6D): dikirim bersama form, lalu
 * dipasang server setelah produk tersimpan. Pratinjau dari berkas lokal.
 */
function NewImagePicker({
    file,
    onChange,
    error,
}: {
    file: File | null;
    onChange: (file: File | null) => void;
    error?: string;
}) {
    const [preview, setPreview] = useState<string | null>(null);
    const [inputKey, setInputKey] = useState(0);

    useEffect(() => {
        if (!file) {
            setPreview(null);

            return;
        }

        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    return (
        <section className="space-y-3">
            <h3 className="font-medium">Gambar barang</h3>
            <p className="text-sm text-muted-foreground">
                Opsional. Tampil di kartu kasir. Pakai PNG berlatar transparan,
                paling besar 2 MB. Tanpa gambar, dipakai ikon kardus.
            </p>
            <div className="flex flex-wrap items-center gap-4">
                <div className="grid size-20 place-items-center border-2 border-px-tinta bg-px-sorotan">
                    {preview ? (
                        <img
                            src={preview}
                            alt="Pratinjau gambar barang"
                            className="max-h-16 max-w-16 object-contain [image-rendering:pixelated]"
                        />
                    ) : (
                        <PixelIcon name="produk" scale={4} />
                    )}
                </div>
                <div className="grid gap-2">
                    <Input
                        key={inputKey}
                        type="file"
                        accept="image/png,image/webp,image/gif,image/jpeg"
                        aria-label="Pilih gambar barang"
                        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                    />
                    <InputError message={error} />
                    {file && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="justify-self-start"
                            onClick={() => {
                                onChange(null);
                                setInputKey((k) => k + 1);
                            }}
                        >
                            Batal pilih gambar
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}

const emptyUnit = (isBase: boolean): UnitRow => ({
    id: null,
    name: isBase ? 'pcs' : '',
    conversion: isBase ? 1 : '',
    sell_price: '',
    barcode: '',
    is_base: isBase,
});

export default function ProdukForm({
    product,
    categories,
}: {
    product: ProductData | null;
    categories: { id: number; name: string }[];
}) {
    const form = useForm({
        sku: product?.sku ?? '',
        name: product?.name ?? '',
        category_id: product?.category_id ? String(product.category_id) : '',
        min_stock: product?.min_stock ?? 0,
        is_active: product?.is_active ?? true,
        units: (product?.units.map((u) => ({
            ...u,
            barcode: u.barcode ?? '',
        })) ?? [emptyUnit(true)]) as UnitRow[],
        // Tahap 6D: gambar bisa dipilih langsung saat menambah produk.
        image: null as File | null,
    });

    const locked = product?.has_movements ?? false;
    const err = (key: string) =>
        (form.errors as Record<string, string | undefined>)[key];

    function setUnit(index: number, patch: Partial<UnitRow>) {
        form.setData(
            'units',
            form.data.units.map((u, i) =>
                i === index ? { ...u, ...patch } : u,
            ),
        );
    }

    function chooseBase(index: number) {
        form.setData(
            'units',
            form.data.units.map((u, i) =>
                i === index
                    ? { ...u, is_base: true, conversion: 1 }
                    : { ...u, is_base: false },
            ),
        );
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.transform(({ image, ...data }) => ({
            ...data,
            category_id: data.category_id || null,
            // Saat mengubah, gambar lewat bagian "Gambar barang" tersendiri.
            ...(product ? {} : { image }),
        }));
        form.submit(
            product
                ? ProductController.update(product.id)
                : ProductController.store(),
            { preserveScroll: true },
        );
    }

    return (
        <>
            <Head title={product ? 'Ubah produk' : 'Produk baru'} />

            <form onSubmit={submit} className="max-w-4xl space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title={product ? `Ubah ${product.name}` : 'Produk baru'}
                        description="Stok tidak diisi di sini: gunakan Penerimaan barang atau Koreksi stok."
                    />
                    {product && (
                        <div className="space-x-4 text-sm">
                            <Link
                                className="underline"
                                href={StockCardController.show(product.id)}
                            >
                                Kartu stok
                            </Link>
                            <Link
                                className="underline"
                                href={StockAdjustmentController.create({
                                    query: { produk: product.id },
                                })}
                            >
                                Koreksi stok
                            </Link>
                        </div>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                            id="sku"
                            value={form.data.sku}
                            onChange={(e) =>
                                form.setData('sku', e.target.value)
                            }
                        />
                        <InputError message={form.errors.sku} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama</Label>
                        <Input
                            id="name"
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                        />
                        <InputError message={form.errors.name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="category">Kategori</Label>
                        <NativeSelect
                            id="category"
                            value={form.data.category_id}
                            onChange={(e) =>
                                form.setData('category_id', e.target.value)
                            }
                        >
                            <option value="">Tanpa kategori</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </NativeSelect>
                        <InputError message={form.errors.category_id} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="min_stock">
                            Stok minimum (satuan dasar)
                        </Label>
                        <Input
                            id="min_stock"
                            type="number"
                            min={0}
                            value={form.data.min_stock}
                            onChange={(e) =>
                                form.setData(
                                    'min_stock',
                                    Number(e.target.value),
                                )
                            }
                        />
                        <InputError message={form.errors.min_stock} />
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.data.is_active}
                        onChange={(e) =>
                            form.setData('is_active', e.target.checked)
                        }
                    />
                    Aktif (muncul di kasir)
                </label>

                {product ? (
                    <ProductImageSection product={product} />
                ) : (
                    <NewImagePicker
                        file={form.data.image}
                        onChange={(file) => form.setData('image', file)}
                        error={form.errors.image}
                    />
                )}

                <section className="space-y-3">
                    <h3 className="font-medium">Satuan</h3>
                    <p className="text-sm text-muted-foreground">
                        Satu satuan dasar berisi 1. Satuan lain berisi jumlah
                        satuan dasar (dus = 24 pcs). Isi satuan yang sudah
                        dipakai di mutasi tidak bisa diubah, dan satuan dasar
                        tidak bisa diganti setelah ada mutasi.
                    </p>
                    <InputError message={form.errors.units} />

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead className="text-left">
                                <tr>
                                    <th className="p-2">Dasar</th>
                                    <th className="p-2">Nama</th>
                                    <th className="p-2">Isi</th>
                                    <th className="p-2">Harga jual (Rp)</th>
                                    <th className="p-2">Barcode</th>
                                    <th className="p-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {form.data.units.map((u, i) => (
                                    <tr
                                        key={u.id ?? `baru-${i}`}
                                        className="align-top"
                                    >
                                        <td className="p-2">
                                            <input
                                                type="radio"
                                                name="base"
                                                aria-label="Satuan dasar"
                                                checked={u.is_base}
                                                disabled={locked}
                                                onChange={() => chooseBase(i)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                value={u.name}
                                                onChange={(e) =>
                                                    setUnit(i, {
                                                        name: e.target.value,
                                                    })
                                                }
                                            />
                                            <InputError
                                                message={err(`units.${i}.name`)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                min={1}
                                                className="w-24"
                                                value={u.conversion}
                                                disabled={u.is_base || u.in_use}
                                                onChange={(e) =>
                                                    setUnit(i, {
                                                        conversion:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                            <InputError
                                                message={err(
                                                    `units.${i}.conversion`,
                                                )}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                min={0}
                                                className="w-36"
                                                value={u.sell_price}
                                                onChange={(e) =>
                                                    setUnit(i, {
                                                        sell_price:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                            <InputError
                                                message={err(
                                                    `units.${i}.sell_price`,
                                                )}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                value={u.barcode}
                                                onChange={(e) =>
                                                    setUnit(i, {
                                                        barcode: e.target.value,
                                                    })
                                                }
                                            />
                                            <InputError
                                                message={err(
                                                    `units.${i}.barcode`,
                                                )}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                    form.data.units.length ===
                                                        1 ||
                                                    u.in_use ||
                                                    (u.is_base && locked)
                                                }
                                                onClick={() =>
                                                    form.setData(
                                                        'units',
                                                        form.data.units.filter(
                                                            (_, j) => j !== i,
                                                        ),
                                                    )
                                                }
                                            >
                                                Hapus
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                            form.setData('units', [
                                ...form.data.units,
                                emptyUnit(false),
                            ])
                        }
                    >
                        Tambah satuan
                    </Button>
                </section>

                <div className="flex items-center gap-3">
                    <Button disabled={form.processing}>Simpan</Button>
                    <Button variant="ghost" asChild>
                        <Link href={ProductController.index()}>Kembali</Link>
                    </Button>
                </div>
            </form>
        </>
    );
}

ProdukForm.layout = {
    breadcrumbs: [
        { title: 'Produk', href: ProductController.index() },
        { title: 'Formulir', href: ProductController.index() },
    ],
};

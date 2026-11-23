import { Head, Link, useForm } from '@inertiajs/react';
import PixelPanel from '@/components/pixel/pixel-panel';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/pixel/styles';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import StockAdjustmentController from '@/actions/App/Http/Controllers/Inventory/StockAdjustmentController';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductOption } from '@/types';

export default function KoreksiStokCreate({
    products,
    selected_product_id,
}: {
    products: ProductOption[];
    selected_product_id: number | null;
}) {
    const initial = products.find((p) => p.id === selected_product_id);

    const form = useForm({
        product_id: initial ? String(initial.id) : '',
        product_unit_id: initial ? String(initial.units[0]?.id ?? '') : '',
        kind: 'decrease',
        qty: '',
        note: '',
        cost_total: '',
    });

    const product = products.find((p) => String(p.id) === form.data.product_id);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            cost_total:
                data.kind === 'opening' && data.cost_total !== ''
                    ? data.cost_total
                    : null,
        }));
        form.submit(StockAdjustmentController.store());
    }

    return (
        <>
            <Head title="Koreksi stok" />

            <form onSubmit={submit} className="pixel-form max-w-xl p-4">
                <PixelPanel
                    title="Penyesuaian stok"
                    description="Mutasi baru ditambahkan ke ledger; baris lama tidak diubah. Saldo tidak boleh menjadi minus."
                >
                    <div className="grid gap-2">
                        <Label htmlFor="product">Produk</Label>
                        <NativeSelect
                            id="product"
                            value={form.data.product_id}
                            onChange={(e) => {
                                const p = products.find(
                                    (x) => String(x.id) === e.target.value,
                                );
                                form.setData((d) => ({
                                    ...d,
                                    product_id: e.target.value,
                                    product_unit_id: p
                                        ? String(p.units[0]?.id ?? '')
                                        : '',
                                }));
                            }}
                        >
                            <option value="">Pilih produk</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.sku} · {p.name}
                                </option>
                            ))}
                        </NativeSelect>
                        <InputError message={form.errors.product_id} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="kind">Jenis</Label>
                        <NativeSelect
                            id="kind"
                            value={form.data.kind}
                            onChange={(e) =>
                                form.setData('kind', e.target.value)
                            }
                        >
                            <option value="decrease">
                                Koreksi kurang (rusak, hilang)
                            </option>
                            <option value="increase">
                                Koreksi tambah (selisih lebih)
                            </option>
                            <option value="opening">
                                Saldo awal (hanya produk tanpa mutasi)
                            </option>
                        </NativeSelect>
                        <InputError message={form.errors.kind} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="qty">Jumlah</Label>
                            <Input
                                id="qty"
                                type="number"
                                min={1}
                                value={form.data.qty}
                                onChange={(e) =>
                                    form.setData('qty', e.target.value)
                                }
                            />
                            <InputError message={form.errors.qty} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="unit">Satuan</Label>
                            <NativeSelect
                                id="unit"
                                value={form.data.product_unit_id}
                                onChange={(e) =>
                                    form.setData(
                                        'product_unit_id',
                                        e.target.value,
                                    )
                                }
                            >
                                {(product?.units ?? []).map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                        {u.conversion > 1
                                            ? ` (isi ${u.conversion})`
                                            : ''}
                                    </option>
                                ))}
                            </NativeSelect>
                            <InputError message={form.errors.product_unit_id} />
                        </div>
                    </div>

                    {form.data.kind === 'opening' && (
                        <div className="grid gap-2">
                            <Label htmlFor="cost">
                                Harga beli total (Rp, opsional)
                            </Label>
                            <Input
                                id="cost"
                                type="number"
                                min={0}
                                value={form.data.cost_total}
                                onChange={(e) =>
                                    form.setData('cost_total', e.target.value)
                                }
                            />
                            <InputError message={form.errors.cost_total} />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="note">
                            Alasan
                            {form.data.kind === 'opening' ? ' (opsional)' : ''}
                        </Label>
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
                        <button
                            className={PRIMARY_BUTTON}
                            disabled={form.processing}
                        >
                            Simpan
                        </button>
                        <Link
                            href={ProductController.index()}
                            className={SECONDARY_BUTTON}
                        >
                            Batal
                        </Link>
                    </div>
                </PixelPanel>
            </form>
        </>
    );
}

KoreksiStokCreate.layout = {
    breadcrumbs: [
        { title: 'Produk', href: ProductController.index() },
        { title: 'Penyesuaian stok', href: StockAdjustmentController.create() },
    ],
};

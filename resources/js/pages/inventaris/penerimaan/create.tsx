import { Head, Link, useForm } from '@inertiajs/react';
import StockReceiptController from '@/actions/App/Http/Controllers/Inventory/StockReceiptController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductOption } from '@/types';

type Line = {
    product_id: string;
    product_unit_id: string;
    qty: string;
    cost_total: string;
};

const emptyLine = (): Line => ({
    product_id: '',
    product_unit_id: '',
    qty: '',
    cost_total: '',
});

export default function PenerimaanCreate({
    products,
}: {
    products: ProductOption[];
}) {
    const form = useForm({
        supplier_name: '',
        note: '',
        occurred_at: '',
        lines: [emptyLine()] as Line[],
    });

    const err = (key: string) =>
        (form.errors as Record<string, string | undefined>)[key];

    function setLine(index: number, patch: Partial<Line>) {
        form.setData(
            'lines',
            form.data.lines.map((l, i) =>
                i === index ? { ...l, ...patch } : l,
            ),
        );
    }

    function chooseProduct(index: number, productId: string) {
        const product = products.find((p) => String(p.id) === productId);
        setLine(index, {
            product_id: productId,
            // Satuan dasar ada di urutan pertama.
            product_unit_id: product ? String(product.units[0]?.id ?? '') : '',
        });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            occurred_at: data.occurred_at || null,
            lines: data.lines.map((l) => ({
                ...l,
                cost_total: l.cost_total === '' ? null : l.cost_total,
            })),
        }));
        form.submit(StockReceiptController.store());
    }

    return (
        <>
            <Head title="Catat penerimaan barang" />

            <form onSubmit={submit} className="max-w-4xl space-y-6 p-4">
                <Heading
                    title="Catat penerimaan barang"
                    description="Jumlah diisi dalam satuan yang dipilih (misalnya 2 dus); sistem mengubahnya ke satuan dasar."
                />

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                        <Label htmlFor="supplier">Pemasok</Label>
                        <Input
                            id="supplier"
                            value={form.data.supplier_name}
                            onChange={(e) =>
                                form.setData('supplier_name', e.target.value)
                            }
                        />
                        <InputError message={form.errors.supplier_name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="occurred_at">Tanggal terima</Label>
                        <Input
                            id="occurred_at"
                            type="datetime-local"
                            value={form.data.occurred_at}
                            onChange={(e) =>
                                form.setData('occurred_at', e.target.value)
                            }
                        />
                        <InputError message={form.errors.occurred_at} />
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
                </div>

                <section className="space-y-3">
                    <InputError message={form.errors.lines} />

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead className="text-left">
                                <tr>
                                    <th className="p-2">Produk</th>
                                    <th className="p-2">Satuan</th>
                                    <th className="p-2">Jumlah</th>
                                    <th className="p-2">
                                        Harga beli total (Rp)
                                    </th>
                                    <th className="p-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {form.data.lines.map((l, i) => {
                                    const product = products.find(
                                        (p) => String(p.id) === l.product_id,
                                    );

                                    return (
                                        <tr key={i} className="align-top">
                                            <td className="p-2">
                                                <NativeSelect
                                                    aria-label="Produk"
                                                    value={l.product_id}
                                                    onChange={(e) =>
                                                        chooseProduct(
                                                            i,
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Pilih produk
                                                    </option>
                                                    {products.map((p) => (
                                                        <option
                                                            key={p.id}
                                                            value={p.id}
                                                        >
                                                            {p.sku} · {p.name}
                                                        </option>
                                                    ))}
                                                </NativeSelect>
                                                <InputError
                                                    message={err(
                                                        `lines.${i}.product_id`,
                                                    )}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <NativeSelect
                                                    aria-label="Satuan"
                                                    value={l.product_unit_id}
                                                    onChange={(e) =>
                                                        setLine(i, {
                                                            product_unit_id:
                                                                e.target.value,
                                                        })
                                                    }
                                                >
                                                    {(product?.units ?? []).map(
                                                        (u) => (
                                                            <option
                                                                key={u.id}
                                                                value={u.id}
                                                            >
                                                                {u.name}
                                                                {u.conversion >
                                                                1
                                                                    ? ` (isi ${u.conversion})`
                                                                    : ''}
                                                            </option>
                                                        ),
                                                    )}
                                                </NativeSelect>
                                                <InputError
                                                    message={err(
                                                        `lines.${i}.product_unit_id`,
                                                    )}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    className="w-28"
                                                    aria-label="Jumlah"
                                                    value={l.qty}
                                                    onChange={(e) =>
                                                        setLine(i, {
                                                            qty: e.target.value,
                                                        })
                                                    }
                                                />
                                                <InputError
                                                    message={err(
                                                        `lines.${i}.qty`,
                                                    )}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="w-40"
                                                    aria-label="Harga beli total"
                                                    value={l.cost_total}
                                                    onChange={(e) =>
                                                        setLine(i, {
                                                            cost_total:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                                <InputError
                                                    message={err(
                                                        `lines.${i}.cost_total`,
                                                    )}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={
                                                        form.data.lines
                                                            .length === 1
                                                    }
                                                    onClick={() =>
                                                        form.setData(
                                                            'lines',
                                                            form.data.lines.filter(
                                                                (_, j) =>
                                                                    j !== i,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Hapus
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                            form.setData('lines', [
                                ...form.data.lines,
                                emptyLine(),
                            ])
                        }
                    >
                        Tambah baris
                    </Button>
                </section>

                <div className="flex items-center gap-3">
                    <Button disabled={form.processing}>
                        Simpan penerimaan
                    </Button>
                    <Button variant="ghost" asChild>
                        <Link href={StockReceiptController.index()}>Batal</Link>
                    </Button>
                </div>
            </form>
        </>
    );
}

PenerimaanCreate.layout = {
    breadcrumbs: [
        { title: 'Penerimaan barang', href: StockReceiptController.index() },
        { title: 'Baru', href: StockReceiptController.create() },
    ],
};

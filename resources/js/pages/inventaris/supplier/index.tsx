import { Head, Link, router } from '@inertiajs/react';
import SupplierController from '@/actions/App/Http/Controllers/Inventory/SupplierController';
import PixelTable, { ActiveBadge } from '@/components/admin/pixel-table';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import type { Paginated } from '@/types';

type SupplierRow = {
    id: number;
    name: string;
    contact: string | null;
    address: string | null;
    note: string | null;
    is_active: boolean;
    entries: number;
};

/** Supplier (Tahap 6B, admin): data master, dinonaktifkan bukan dihapus. */
export default function SupplierIndex({
    suppliers,
}: {
    suppliers: Paginated<SupplierRow>;
}) {
    return (
        <>
            <Head title="Supplier" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Supplier"
                        description="Pemasok barang. Supplier aktif bisa dipilih saat mencatat barang masuk; yang nonaktif tetap tercatat di penerimaan lama."
                    />
                    <Button asChild>
                        <Link href={SupplierController.create()}>
                            Tambah supplier
                        </Link>
                    </Button>
                </div>

                <PixelTable>
                    <thead className="bg-muted/50 text-left">
                        <tr>
                            <th className="p-3">Nama</th>
                            <th className="p-3">Kontak</th>
                            <th className="p-3">Alamat</th>
                            <th className="p-3 text-right">Penerimaan</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suppliers.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-6 text-center text-muted-foreground"
                                >
                                    Belum ada supplier.
                                </td>
                            </tr>
                        )}
                        {suppliers.data.map((s) => (
                            <tr key={s.id} className="border-t">
                                <td className="p-3 font-medium">
                                    {s.name}
                                    {s.note && (
                                        <span className="block text-xs font-normal text-muted-foreground">
                                            {s.note}
                                        </span>
                                    )}
                                </td>
                                <td className="p-3">{s.contact ?? '-'}</td>
                                <td className="p-3">{s.address ?? '-'}</td>
                                <td className="p-3 text-right">{s.entries}</td>
                                <td className="p-3">
                                    <ActiveBadge active={s.is_active} />
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link
                                                href={SupplierController.edit(
                                                    s.id,
                                                )}
                                            >
                                                Ubah
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={
                                                s.is_active
                                                    ? 'outline'
                                                    : 'secondary'
                                            }
                                            onClick={() =>
                                                router.post(
                                                    s.is_active
                                                        ? SupplierController.deactivate.url(
                                                              s.id,
                                                          )
                                                        : SupplierController.activate.url(
                                                              s.id,
                                                          ),
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            {s.is_active
                                                ? 'Nonaktifkan'
                                                : 'Aktifkan'}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </PixelTable>

                <Pagination links={suppliers.links} />
            </div>
        </>
    );
}

SupplierIndex.layout = {
    breadcrumbs: [{ title: 'Supplier', href: SupplierController.index() }],
};

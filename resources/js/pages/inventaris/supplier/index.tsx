import { Head, Link, router } from '@inertiajs/react';
import SupplierController from '@/actions/App/Http/Controllers/Inventory/SupplierController';
import PixelTable, { ActiveBadge } from '@/components/admin/pixel-table';
import Pagination from '@/components/pagination';
import GuardCorner from '@/components/pixel/guard-corner';
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

type SupplierRow = {
    id: number;
    name: string;
    contact: string | null;
    address: string | null;
    note: string | null;
    is_active: boolean;
    entries: number;
};

/**
 * Supplier (Tahap 6B, admin; gaya pixel 5E-2): data master, dinonaktifkan
 * bukan dihapus.
 */
export default function SupplierIndex({
    suppliers,
}: {
    suppliers: Paginated<SupplierRow>;
}) {
    return (
        <>
            <Head title="Supplier" />

            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-prose text-sm text-px-bayangan">
                        Pemasok barang. Supplier aktif bisa dipilih saat
                        mencatat barang masuk; yang nonaktif tetap tercatat di
                        penerimaan lama.
                    </p>
                    <Link
                        href={SupplierController.create()}
                        className={PRIMARY_BUTTON}
                    >
                        <PixelGlyph rows={GLYPHS.tambah} />
                        Tambah supplier
                    </Link>
                </div>

                <PixelTable>
                    <thead className={THEAD}>
                        <tr>
                            <th className="p-3">Nama</th>
                            <th className="p-3">Kontak</th>
                            <th className="p-3">Alamat</th>
                            <th className="p-3 text-right">Penerimaan</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className={TBODY}>
                        {suppliers.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-8 text-center text-px-bayangan"
                                >
                                    Belum ada supplier. Tambahkan pemasok
                                    pertama.
                                </td>
                            </tr>
                        )}
                        {suppliers.data.map((s) => (
                            <tr key={s.id} className={ROW}>
                                <td className="p-3 font-semibold">
                                    {s.name}
                                    {s.note && (
                                        <span className="block text-xs font-normal text-px-bayangan">
                                            {s.note}
                                        </span>
                                    )}
                                </td>
                                <td className="p-3">{s.contact ?? '-'}</td>
                                <td className="p-3">{s.address ?? '-'}</td>
                                <td className="p-3 text-right font-pixel">
                                    {s.entries}
                                </td>
                                <td className="p-3">
                                    <ActiveBadge active={s.is_active} />
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-1.5">
                                        <Link
                                            href={SupplierController.edit(s.id)}
                                            className={ICON_BUTTON}
                                            aria-label={`Ubah ${s.name}`}
                                            title="Ubah"
                                        >
                                            <PixelGlyph rows={GLYPHS.ubah} />
                                        </Link>
                                        <button
                                            type="button"
                                            className={cn(
                                                TOGGLE_BUTTON,
                                                s.is_active
                                                    ? 'bg-px-sorotan hover:bg-px-bata'
                                                    : 'bg-px-daun hover:bg-px-lampu',
                                            )}
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
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </PixelTable>

                <div className="flex items-end justify-between gap-4">
                    <Pagination
                        links={suppliers.links}
                        from={suppliers.from}
                        to={suppliers.to}
                        total={suppliers.total}
                    />
                    <GuardCorner post="inventaris" />
                </div>
            </div>
        </>
    );
}

SupplierIndex.layout = {
    breadcrumbs: [{ title: 'Supplier', href: SupplierController.index() }],
};

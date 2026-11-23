/**
 * Susunan menu samping (Tahap 5E-1, disetujui pemilik): Beranda; Kasir;
 * Inventaris; Laporan; Anggota; Admin. Tiap peran hanya melihat yang boleh
 * dibukanya; penjaga sebenarnya tetap middleware di server.
 */
import AccessController from '@/actions/App/Http/Controllers/Admin/AccessController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import CategoryController from '@/actions/App/Http/Controllers/Inventory/CategoryController';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import StockAdjustmentController from '@/actions/App/Http/Controllers/Inventory/StockAdjustmentController';
import StockReceiptController from '@/actions/App/Http/Controllers/Inventory/StockReceiptController';
import SupplierController from '@/actions/App/Http/Controllers/Inventory/SupplierController';
import MemberController from '@/actions/App/Http/Controllers/Members/MemberController';
import PosController from '@/actions/App/Http/Controllers/Pos/PosController';
import SaleController from '@/actions/App/Http/Controllers/Pos/SaleController';
import InventoryReportController from '@/actions/App/Http/Controllers/Reports/InventoryReportController';
import SalesReportController from '@/actions/App/Http/Controllers/Reports/SalesReportController';
import type { PixelIconName } from '@/components/beranda/pixel-icons';
import { dashboard } from '@/routes';
import { lab as dioramaLab } from '@/routes/diorama';

export type Role = 'admin' | 'kasir' | 'bendahara';

export type MenuLink = {
    title: string;
    /** Keterangan singkat di bawah judul halaman pada header. */
    subtitle: string;
    href: string;
    roles: Role[];
};

export type MenuGroup = {
    title: string;
    icon: PixelIconName;
    /** Grup satu tautan (Beranda, Anggota) memakai `href`; grup lain punya `items`. */
    href?: string;
    subtitle?: string;
    roles: Role[];
    items?: MenuLink[];
};

const ALL: Role[] = ['admin', 'kasir', 'bendahara'];
const ADMIN: Role[] = ['admin'];

export const MENU: MenuGroup[] = [
    {
        title: 'Beranda',
        icon: 'beranda',
        href: dashboard.url(),
        subtitle: 'Diorama toko',
        roles: ALL,
    },
    {
        title: 'Kasir',
        icon: 'kasir',
        roles: ['admin', 'kasir'],
        items: [
            {
                title: 'Transaksi',
                subtitle: 'Transaksi penjualan',
                href: PosController.index.url(),
                roles: ['admin', 'kasir'],
            },
            {
                title: 'Riwayat transaksi',
                subtitle: 'Penjualan selesai dan dibatalkan',
                href: SaleController.index.url(),
                roles: ['admin', 'kasir'],
            },
        ],
    },
    {
        title: 'Inventaris',
        icon: 'stok',
        roles: ['admin', 'kasir'],
        items: [
            {
                title: 'Produk',
                subtitle: 'Data barang dan stok',
                href: ProductController.index.url(),
                roles: ['admin', 'kasir'],
            },
            {
                title: 'Barang masuk',
                subtitle: 'Penerimaan barang dari pemasok',
                href: StockReceiptController.index.url(),
                roles: ADMIN,
            },
            {
                title: 'Penyesuaian stok',
                subtitle: 'Koreksi stok lewat ledger',
                href: StockAdjustmentController.create.url(),
                roles: ADMIN,
            },
            {
                title: 'Supplier',
                subtitle: 'Pemasok barang',
                href: SupplierController.index.url(),
                roles: ADMIN,
            },
            {
                title: 'Kategori',
                subtitle: 'Pengelompokan produk',
                href: CategoryController.index.url(),
                roles: ADMIN,
            },
        ],
    },
    {
        title: 'Laporan',
        icon: 'laporan',
        roles: ADMIN,
        items: [
            {
                title: 'Penjualan',
                subtitle: 'Laporan penjualan',
                href: SalesReportController.index.url(),
                roles: ADMIN,
            },
            {
                title: 'Inventaris',
                subtitle: 'Laporan stok dan mutasi',
                href: InventoryReportController.index.url(),
                roles: ADMIN,
            },
        ],
    },
    {
        title: 'Anggota',
        icon: 'anggota',
        href: MemberController.index.url(),
        subtitle: 'Anggota dan simpanan',
        roles: ['admin', 'bendahara'],
    },
    {
        title: 'Admin',
        icon: 'hak-akses',
        roles: ADMIN,
        items: [
            {
                title: 'Pengguna',
                subtitle: 'Akun yang bisa masuk',
                href: UserController.index.url(),
                roles: ADMIN,
            },
            {
                title: 'Hak akses',
                subtitle: 'Halaman yang bisa dibuka tiap peran',
                href: AccessController.index.url(),
                roles: ADMIN,
            },
            {
                title: 'Diorama lab',
                subtitle: 'Pratinjau diorama',
                href: dioramaLab.url(),
                roles: ADMIN,
            },
        ],
    },
];

/** Menu yang boleh dilihat peran-peran ini (grup kosong dibuang). */
export function menuFor(roles: readonly string[]): MenuGroup[] {
    const can = (allowed: Role[]) => allowed.some((r) => roles.includes(r));

    return MENU.filter((g) => can(g.roles))
        .map((g) => ({
            ...g,
            items: g.items?.filter((i) => can(i.roles)),
        }))
        .filter((g) => g.href !== undefined || (g.items?.length ?? 0) > 0);
}

/**
 * Tautan menu yang cocok dengan alamat sekarang: yang awalan jalurnya paling
 * panjang (misalnya /produk/3/ubah → Produk). null bila tidak ada.
 */
export function activeLink(
    groups: MenuGroup[],
    path: string,
): { group: MenuGroup; link: MenuLink | null } | null {
    let best: { group: MenuGroup; link: MenuLink | null; len: number } | null =
        null;

    const consider = (
        group: MenuGroup,
        href: string,
        link: MenuLink | null,
    ) => {
        const base = new URL(href, 'http://x').pathname.replace(/\/$/, '');
        const hit =
            base === ''
                ? path === '/'
                : path === base || path.startsWith(`${base}/`);

        if (hit && (best === null || base.length > best.len)) {
            best = { group, link, len: base.length };
        }
    };

    for (const group of groups) {
        if (group.href) {
            consider(group, group.href, null);
        }

        for (const link of group.items ?? []) {
            consider(group, link.href, link);
        }
    }

    if (best === null) {
        return null;
    }

    const { group, link } = best;

    return { group, link };
}

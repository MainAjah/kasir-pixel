import { Link, router, usePage } from '@inertiajs/react';
import MemberController from '@/actions/App/Http/Controllers/Members/MemberController';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import StockReceiptController from '@/actions/App/Http/Controllers/Inventory/StockReceiptController';
import PosController from '@/actions/App/Http/Controllers/Pos/PosController';
import SaleController from '@/actions/App/Http/Controllers/Pos/SaleController';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { logout } from '@/routes';
import PixelIcon from './pixel-icon';
import type { PixelIconName } from './pixel-icons';
import { PIXEL_FRAME } from './pixel-frame';

type Role = 'admin' | 'kasir' | 'bendahara';

type MenuItem = {
    icon: PixelIconName;
    label: string;
    /** null = halaman belum ada (tombol redup). */
    href: { url: string } | null;
    roles: Role[];
};

/**
 * Menu ikon Beranda. Empat yang diminta (Produk, Stok, Laporan, Pengguna), lalu
 * pintasan yang dibutuhkan tiap peran karena Beranda tidak punya sidebar.
 * Hanya menyembunyikan tautan; penjaga sebenarnya tetap middleware di server.
 */
const MAIN: MenuItem[] = [
    {
        icon: 'produk',
        label: 'Produk',
        href: ProductController.index(),
        roles: ['admin', 'kasir'],
    },
    {
        icon: 'stok',
        label: 'Stok (penerimaan barang)',
        href: StockReceiptController.index(),
        roles: ['admin'],
    },
    {
        icon: 'laporan',
        label: 'Laporan (sementara: riwayat penjualan)',
        href: SaleController.index(),
        roles: ['admin', 'kasir'],
    },
    {
        icon: 'pengguna',
        label: 'Pengguna (menyusul di Tahap 6B)',
        href: null,
        roles: ['admin'],
    },
];

const SHORTCUTS: MenuItem[] = [
    {
        icon: 'kasir',
        label: 'Kasir',
        href: PosController.index(),
        roles: ['admin', 'kasir'],
    },
    {
        icon: 'anggota',
        label: 'Anggota',
        href: MemberController.index(),
        roles: ['admin', 'bendahara'],
    },
];

const BUTTON = `${PIXEL_FRAME} flex size-12 items-center justify-center transition-transform hover:bg-[#ffe9a8] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#6a9fc4] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#2b2a33]`;

function MenuButton({ item }: { item: MenuItem }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {item.href ? (
                    <Link
                        href={item.href.url}
                        className={BUTTON}
                        aria-label={item.label}
                    >
                        <PixelIcon name={item.icon} />
                    </Link>
                ) : (
                    <button
                        type="button"
                        aria-disabled="true"
                        aria-label={item.label}
                        className={`${BUTTON} cursor-not-allowed opacity-50 hover:bg-[#f7f1e3] active:translate-0 active:shadow-[3px_3px_0_#2b2a33]`}
                    >
                        <PixelIcon name={item.icon} />
                    </button>
                )}
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
    );
}

export default function SideMenu() {
    const { auth } = usePage().props;
    const can = (item: MenuItem) =>
        item.roles.some((role) => auth.roles.includes(role));
    const main = MAIN.filter(can);
    const shortcuts = SHORTCUTS.filter(can);

    return (
        <nav aria-label="Menu Beranda" className="flex flex-col gap-3">
            {main.map((item) => (
                <MenuButton key={item.icon} item={item} />
            ))}

            {shortcuts.length > 0 && (
                <div className="my-1 h-[3px] w-12 bg-[#2b2a33]/40" />
            )}

            {shortcuts.map((item) => (
                <MenuButton key={item.icon} item={item} />
            ))}

            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={logout()}
                        as="button"
                        className={BUTTON}
                        aria-label="Keluar"
                        onClick={() => router.flushAll()}
                    >
                        <PixelIcon name="keluar" />
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Keluar</TooltipContent>
            </Tooltip>
        </nav>
    );
}

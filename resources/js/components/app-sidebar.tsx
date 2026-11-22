import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    ClipboardPen,
    FolderGit2,
    History,
    KeyRound,
    LayoutGrid,
    Package,
    PackagePlus,
    ShoppingCart,
    Sparkles,
    Tags,
    Truck,
    UserCog,
    Users,
} from 'lucide-react';
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
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { lab as dioramaLab } from '@/routes/diorama';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Beranda',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

// Menu kasir untuk kasir dan admin. Kasir juga boleh membaca daftar produk.
const posNavItems: NavItem[] = [
    { title: 'Kasir', href: PosController.index(), icon: ShoppingCart },
    {
        title: 'Riwayat penjualan',
        href: SaleController.index(),
        icon: History,
    },
];

// Anggota dan simpanan: admin dan bendahara.
const memberNavItem: NavItem = {
    title: 'Anggota',
    href: MemberController.index(),
    icon: Users,
};

const readOnlyProductNav: NavItem = {
    title: 'Produk',
    href: ProductController.index(),
    icon: Package,
};

// Menu inventaris hanya untuk admin (route middleware role:admin tetap jadi penjaga utama).
const inventoryNavItems: NavItem[] = [
    { title: 'Produk', href: ProductController.index(), icon: Package },
    {
        title: 'Penerimaan barang',
        href: StockReceiptController.index(),
        icon: PackagePlus,
    },
    {
        title: 'Koreksi stok',
        href: StockAdjustmentController.create(),
        icon: ClipboardPen,
    },
    { title: 'Supplier', href: SupplierController.index(), icon: Truck },
    { title: 'Kategori', href: CategoryController.index(), icon: Tags },
];

// Tahap 6B: kelola pengguna dan hak akses, hanya admin.
const adminNavItems: NavItem[] = [
    { title: 'Pengguna', href: UserController.index(), icon: UserCog },
    { title: 'Hak akses', href: AccessController.index(), icon: KeyRound },
];

// Pratinjau mesin diorama (Tahap 5B), hanya admin.
const dioramaLabNav: NavItem = {
    title: 'Diorama lab',
    href: dioramaLab(),
    icon: Sparkles,
};

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const isAdmin = auth.roles.includes('admin');
    const isKasir = auth.roles.includes('kasir');
    const isBendahara = auth.roles.includes('bendahara');
    const navItems = isAdmin
        ? [
              ...mainNavItems,
              ...posNavItems,
              ...inventoryNavItems,
              memberNavItem,
              ...adminNavItems,
              dioramaLabNav,
          ]
        : isKasir
          ? [...mainNavItems, ...posNavItems, readOnlyProductNav]
          : isBendahara
            ? [...mainNavItems, memberNavItem]
            : mainNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

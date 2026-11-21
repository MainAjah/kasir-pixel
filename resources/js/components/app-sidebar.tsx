import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    ClipboardPen,
    FolderGit2,
    LayoutGrid,
    Package,
    PackagePlus,
    Tags,
} from 'lucide-react';
import CategoryController from '@/actions/App/Http/Controllers/Inventory/CategoryController';
import ProductController from '@/actions/App/Http/Controllers/Inventory/ProductController';
import StockAdjustmentController from '@/actions/App/Http/Controllers/Inventory/StockAdjustmentController';
import StockReceiptController from '@/actions/App/Http/Controllers/Inventory/StockReceiptController';
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
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

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
    { title: 'Kategori', href: CategoryController.index(), icon: Tags },
];

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
                <NavMain
                    items={
                        isAdmin
                            ? [...mainNavItems, ...inventoryNavItems]
                            : mainNavItems
                    }
                />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

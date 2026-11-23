import { Link, usePage } from '@inertiajs/react';
import { ROLE_LABELS } from '@/components/admin/pixel-table';
import PixelIcon from '@/components/beranda/pixel-icon';
import { activeLink, menuFor } from '@/components/layout/menu';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';

/** Hover: latar lebih terang dan naik-turun 2px; aktif: latar karamel tua berbingkai karamel. */
const GROUP =
    'h-11 gap-3 border-2 border-transparent font-pixel text-base text-kopi-krem hover:bg-kopi-hover hover:text-kopi-krem motion-safe:hover:animate-px-bob data-[active=true]:border-kopi-karamel data-[active=true]:bg-kopi-aktif data-[active=true]:text-kopi-krem group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0.5!';

const SUB =
    'h-8 text-kopi-redup hover:bg-kopi-hover hover:text-kopi-krem motion-safe:hover:animate-px-bob data-[active=true]:bg-kopi-aktif data-[active=true]:font-semibold data-[active=true]:text-kopi-krem data-[active=true]:shadow-[inset_3px_0_0_var(--color-kopi-karamel)]';

/** Garis pemisah putus-putus. */
function Divider() {
    return (
        <hr className="mx-3 border-0 border-t-2 border-dashed border-kopi-garis" />
    );
}

/**
 * Menu samping bergaya kafe (Tahap 5E-1, referensi pemilik): papan cokelat
 * kopi bersudut bertangga (lihat .sidebar-kopi di app.css) dengan ikon pixel
 * buatan sendiri. Susunan dan hak tiap peran ada di components/layout/menu.ts.
 */
export function AppSidebar() {
    const page = usePage();
    const roles = page.props.auth.roles;
    const groups = menuFor(roles);
    const active = activeLink(groups, page.url.split('?')[0]);
    const roleLabel = roles.map((r) => ROLE_LABELS[r] ?? r).join(', ');

    return (
        <Sidebar collapsible="icon" variant="floating" className="sidebar-kopi">
            <SidebarHeader className="pt-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="hover:bg-transparent hover:text-kopi-krem"
                        >
                            <Link href={dashboard()} prefetch>
                                <span className="flex size-8 shrink-0 items-center justify-center border-2 border-kopi-bingkai bg-kopi-karamel">
                                    <PixelIcon name="toko" scale={2} />
                                </span>
                                <span className="grid min-w-0 gap-0.5">
                                    <span className="truncate font-pixel text-xl leading-tight text-kopi-krem">
                                        Kasir Koperasi
                                    </span>
                                    {roleLabel && (
                                        <span className="truncate text-[13px] text-kopi-redup">
                                            Masuk sebagai {roleLabel}
                                        </span>
                                    )}
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <Divider />

            <SidebarContent className="[scrollbar-width:thin] [scrollbar-color:var(--color-kopi-garis)_transparent] px-2 pt-1">
                <SidebarMenu className="gap-1.5">
                    {groups.map((group) => {
                        const groupActive = active?.group.title === group.title;
                        const first =
                            group.href ?? group.items?.[0]?.href ?? '#';

                        return (
                            <SidebarMenuItem key={group.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={groupActive}
                                    tooltip={{ children: group.title }}
                                    className={GROUP}
                                >
                                    <Link href={first} prefetch>
                                        {/* Kotak ikon 32 px, sama dengan avatar profil di bawah. */}
                                        <span className="grid size-8 shrink-0 place-items-center">
                                            {group.image ? (
                                                <img
                                                    src={group.image}
                                                    alt=""
                                                    aria-hidden="true"
                                                    className="max-h-8 max-w-8 [image-rendering:pixelated]"
                                                />
                                            ) : (
                                                <PixelIcon
                                                    name={group.icon}
                                                    scale={2}
                                                />
                                            )}
                                        </span>
                                        <span>{group.title}</span>
                                    </Link>
                                </SidebarMenuButton>

                                {group.items && group.items.length > 0 && (
                                    <SidebarMenuSub className="mt-1 mr-0 border-l-2 border-dashed border-kopi-garis">
                                        {group.items.map((item) => (
                                            <SidebarMenuSubItem key={item.href}>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={
                                                        active?.link?.href ===
                                                        item.href
                                                    }
                                                    className={SUB}
                                                >
                                                    <Link
                                                        href={item.href}
                                                        prefetch
                                                    >
                                                        <span>
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                )}
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>

            <Divider />

            <SidebarFooter className="pb-3">
                <div className="border-2 border-kopi-garis bg-kopi-gelap group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent">
                    <NavUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}

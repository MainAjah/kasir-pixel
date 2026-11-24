import { Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import LookupController from '@/actions/App/Http/Controllers/Pos/LookupController';
import SaleController from '@/actions/App/Http/Controllers/Pos/SaleController';
import ShiftController from '@/actions/App/Http/Controllers/Pos/ShiftController';
import { checkout } from '@/lib/checkout';
import { formatRupiah } from '@/lib/format';
import { emitStoreEvent } from '@/lib/store-events';
import type { MemberHit } from '@/types';
import CartPanel from './cart-panel';
import CashierBalloon from './cashier-balloon';
import {
    cartCount,
    filterCatalog,
    findByBarcode,
    stockStatus,
} from './catalog';
import type { CartLine, CatalogProduct, PosShift, UnitHit } from './catalog';
import ProductGrid from './product-grid';

export type { PosShift } from './catalog';

async function getJson<T>(url: string): Promise<{ ok: boolean; data: T }> {
    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    return { ok: res.ok, data: (await res.json()) as T };
}

const SHIFT_LINK =
    'border-2 border-px-tinta bg-px-dinding px-2 py-0.5 font-pixel text-xs text-px-tinta hover:bg-px-lampu focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none';

/**
 * Layar kasir bertema pixel (Tahap 5E-1): grid produk di kiri, keranjang dan
 * pembayaran di kanan, potret kasir dengan balon total di kiri bawah. Logika
 * jual tidak berubah: yang dikirim hanya satuan dan jumlah, harga dihitung ulang
 * server. Tahap 10: bayar lewat REST API (POST /api/v1/penjualan); bila satu
 * barang gagal, seluruh transaksi dibatalkan dan baris barang itu ditandai.
 */
export default function PosScreen({
    shift,
    cashier,
    catalog,
}: {
    shift: PosShift;
    cashier: { id: number; name: string };
    catalog: CatalogProduct[];
}) {
    const [cart, setCart] = useState<CartLine[]>([]);
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState('Semua');
    const [tendered, setTendered] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [paying, setPaying] = useState(false);
    const [member, setMember] = useState<MemberHit | null>(null);
    // Produk yang membuat checkout terakhir gagal (409), untuk menandai barisnya.
    const [failedProductId, setFailedProductId] = useState<number | null>(null);

    const scanRef = useRef<HTMLInputElement>(null);
    const cartEmptyRef = useRef(true);

    const total = cart.reduce((sum, l) => sum + l.qty * l.price, 0);
    const count = cartCount(cart);
    const change = (Number(tendered) || 0) - total;
    const canPay = cart.length > 0 && total > 0 && change >= 0 && !paying;

    useEffect(() => {
        cartEmptyRef.current = cart.length === 0;
    }, [cart]);

    // preventScroll: kembali siap untuk scanner tanpa menggulir layar ke kolom
    // cari (revisi pemilik: setelah klik barang, layar tetap di tempatnya).
    const focusScan = useCallback(
        () => scanRef.current?.focus({ preventScroll: true }),
        [],
    );

    // Kolom cari/scan selalu fokus: saat dibuka, setelah klik di area kosong, dan
    // saat scanner mulai mengetik ketika fokus sedang tidak di kolom isian mana pun.
    useEffect(() => {
        focusScan();

        const isField = (el: Element | null) =>
            !!el && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(el.tagName);

        const onKeyDown = (e: KeyboardEvent) => {
            if (
                !isField(document.activeElement) &&
                e.key.length === 1 &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
            ) {
                focusScan();
            }
        };
        const onClick = (e: MouseEvent) => {
            const target = e.target as Element | null;

            if (!target?.closest('input, select, textarea, button, a')) {
                focusScan();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('click', onClick);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('click', onClick);
        };
    }, [focusScan]);

    const addUnit = useCallback(
        (unit: UnitHit, qty = 1) => {
            if (cartEmptyRef.current) {
                emitStoreEvent('sale.opened', { cashier: cashier.name });
                cartEmptyRef.current = false;
            }

            emitStoreEvent('item.scanned', {
                product: unit.product_name,
                unit: unit.unit_name,
                qty,
            });

            setError(null);
            setFailedProductId(null);
            setCart((prev) => {
                const found = prev.find(
                    (l) => l.product_unit_id === unit.product_unit_id,
                );

                return found
                    ? prev.map((l) =>
                          l === found ? { ...l, qty: l.qty + qty } : l,
                      )
                    : [...prev, { ...unit, qty }];
            });
        },
        [cashier.name],
    );

    function clearQuery() {
        setQuery('');
        focusScan();
    }

    /**
     * Enter di kolom cari: barcode persis dari katalog, atau satu-satunya barang
     * yang cocok. Bila tidak ada di katalog (misalnya barang baru setelah halaman
     * dibuka), tanya server seperti scan biasa.
     */
    async function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        const code = query.trim();

        if (code === '') {
            return;
        }

        const scanned = findByBarcode(catalog, code);

        if (scanned) {
            addUnit(scanned);
            clearQuery();

            return;
        }

        const shown = filterCatalog(catalog, code, tab);

        if (shown.length === 1) {
            const only = shown[0];

            if (stockStatus(only.stock, only.min_stock) === 'habis') {
                toast.error(`${only.name} sedang habis.`);
            } else {
                addUnit(only.units[0]);
                clearQuery();
            }

            return;
        }

        if (shown.length > 1) {
            // Beberapa barang cocok: kasir memilih sendiri dari grid.
            return;
        }

        try {
            const { ok, data } = await getJson<UnitHit & { message?: string }>(
                LookupController.barcode.url(code),
            );

            if (ok) {
                addUnit(data);
                setQuery('');
            } else {
                toast.error(data.message ?? `Barcode ${code} tidak ditemukan.`);
            }
        } catch {
            toast.error('Gagal menghubungi server. Coba pindai lagi.');
        }

        focusScan();
    }

    function setQty(unitId: number, qty: number) {
        setFailedProductId(null);
        setCart((prev) =>
            prev.map((l) =>
                l.product_unit_id === unitId
                    ? { ...l, qty: Math.max(1, Math.floor(qty) || 1) }
                    : l,
            ),
        );
    }

    function removeLine(unitId: number) {
        setFailedProductId(null);
        setCart((prev) => prev.filter((l) => l.product_unit_id !== unitId));
        focusScan();
    }

    function clearCart() {
        setCart([]);
        setTendered('');
        setError(null);
        setFailedProductId(null);
        focusScan();
    }

    async function pay() {
        if (!canPay) {
            return;
        }

        setPaying(true);
        setError(null);
        setFailedProductId(null);

        const result = await checkout({
            // Hanya satuan dan jumlah; harga dihitung ulang oleh server.
            items: cart.map((l) => ({
                product_unit_id: l.product_unit_id,
                qty: l.qty,
            })),
            tendered: Number(tendered) || 0,
            member_id: member?.id ?? null,
        });

        if (result.ok) {
            const { sale } = result;

            // Struk lalu kartu "Transaksi Berhasil" dan diorama, lewat flash yang
            // sama dengan alur lama (StoreEventBridge dan halaman struk).
            router.visit(sale.receipt_url, {
                onSuccess: () =>
                    router.flash('store_event', {
                        name: 'sale.completed',
                        detail: {
                            number: sale.number,
                            total: sale.total,
                            items: sale.items.map((i) => ({
                                name: i.name,
                                unit: i.unit,
                                qty: i.qty,
                            })),
                        },
                    }),
            });

            return;
        }

        // Gagal: seluruh transaksi sudah dibatalkan server, keranjang tetap utuh.
        setError(result.message);
        setFailedProductId(result.failedProductId);
        setPaying(false);
        focusScan();
    }

    return (
        <div className="grid gap-4 p-4 lg:h-[calc(100svh-4.25rem)] lg:grid-cols-[minmax(0,1fr)_23rem] lg:overflow-hidden">
            <div className="flex min-h-0 flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-px-bayangan">
                    <span>
                        Shift dibuka {shift.opened_at}, kas awal{' '}
                        {formatRupiah(shift.opening_cash)}, {shift.sales_count}{' '}
                        penjualan
                    </span>
                    <span className="flex gap-2">
                        <Link
                            className={SHIFT_LINK}
                            href={SaleController.index()}
                        >
                            Riwayat transaksi
                        </Link>
                        <Link
                            className={SHIFT_LINK}
                            href={ShiftController.closing()}
                        >
                            Tutup shift
                        </Link>
                    </span>
                </div>

                <ProductGrid
                    catalog={catalog}
                    query={query}
                    onQueryChange={setQuery}
                    onSubmit={submitSearch}
                    onClear={clearQuery}
                    inputRef={scanRef}
                    tab={tab}
                    onTabChange={(t) => {
                        setTab(t);
                        focusScan();
                    }}
                    onAdd={(unit) => {
                        addUnit(unit);
                        focusScan();
                    }}
                />

                <CashierBalloon total={total} count={count} />
            </div>

            <CartPanel
                cart={cart}
                count={count}
                total={total}
                onQty={setQty}
                onRemove={removeLine}
                onClear={clearCart}
                member={member}
                onMemberChange={setMember}
                tendered={tendered}
                onTenderedChange={setTendered}
                error={error}
                failedProductId={failedProductId}
                canPay={canPay}
                paying={paying}
                onPay={() => void pay()}
            />
        </div>
    );
}

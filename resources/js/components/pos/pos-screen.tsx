import { Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import LookupController from '@/actions/App/Http/Controllers/Pos/LookupController';
import SaleController from '@/actions/App/Http/Controllers/Pos/SaleController';
import ShiftController from '@/actions/App/Http/Controllers/Pos/ShiftController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNumber, formatRupiah } from '@/lib/format';
import { emitStoreEvent } from '@/lib/store-events';

export type PosShift = {
    id: number;
    opened_at: string;
    opening_cash: number;
    sales_count: number;
};

type UnitHit = {
    product_unit_id: number;
    product_id: number;
    sku: string;
    product_name: string;
    unit_name: string;
    conversion: number;
    price: number;
    barcode: string | null;
    stock_base: number;
    stock_units: number;
};

type SearchProduct = {
    id: number;
    sku: string;
    name: string;
    units: UnitHit[];
};

type CartLine = UnitHit & { qty: number };

const QUICK_AMOUNTS = [20000, 50000, 100000];

async function getJson<T>(url: string): Promise<{ ok: boolean; data: T }> {
    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    return { ok: res.ok, data: (await res.json()) as T };
}

export default function PosScreen({
    shift,
    cashier,
}: {
    shift: PosShift;
    cashier: { id: number; name: string };
}) {
    const [cart, setCart] = useState<CartLine[]>([]);
    const [scan, setScan] = useState('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchProduct[]>([]);
    const [tendered, setTendered] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [paying, setPaying] = useState(false);

    const scanRef = useRef<HTMLInputElement>(null);
    const cartEmptyRef = useRef(true);

    const total = cart.reduce((sum, l) => sum + l.qty * l.price, 0);
    const tenderedNumber = Number(tendered) || 0;
    const change = tenderedNumber - total;
    const canPay = cart.length > 0 && total > 0 && change >= 0 && !paying;

    useEffect(() => {
        cartEmptyRef.current = cart.length === 0;
    }, [cart]);

    const focusScan = useCallback(() => scanRef.current?.focus(), []);

    // Kolom scan selalu fokus: saat dibuka, setelah klik di area kosong, dan saat
    // scanner mulai mengetik ketika fokus sedang tidak di kolom isian mana pun.
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

    async function submitScan(e: React.FormEvent) {
        e.preventDefault();
        const code = scan.trim();
        setScan('');

        if (code === '') {
            return;
        }

        try {
            const { ok, data } = await getJson<UnitHit & { message?: string }>(
                LookupController.barcode.url(code),
            );

            if (ok) {
                addUnit(data);
            } else {
                toast.error(data.message ?? `Barcode ${code} tidak ditemukan.`);
            }
        } catch {
            toast.error('Gagal menghubungi server. Coba pindai lagi.');
        }

        focusScan();
    }

    // Pencarian manual dengan jeda singkat agar tidak menembak server tiap ketukan.
    useEffect(() => {
        const q = query.trim();

        if (q === '') {
            setResults([]);

            return;
        }

        const timer = setTimeout(async () => {
            try {
                const { data } = await getJson<SearchProduct[]>(
                    LookupController.search.url({ query: { q } }),
                );
                setResults(data);
            } catch {
                setResults([]);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [query]);

    function setQty(unitId: number, qty: number) {
        setCart((prev) =>
            prev.map((l) =>
                l.product_unit_id === unitId
                    ? { ...l, qty: Math.max(1, Math.floor(qty) || 1) }
                    : l,
            ),
        );
    }

    function removeLine(unitId: number) {
        setCart((prev) => prev.filter((l) => l.product_unit_id !== unitId));
        focusScan();
    }

    function pay() {
        if (!canPay) {
            return;
        }

        setPaying(true);
        setError(null);

        router.post(
            SaleController.store.url(),
            {
                // Hanya satuan dan jumlah; harga dihitung ulang oleh server.
                items: cart.map((l) => ({
                    product_unit_id: l.product_unit_id,
                    qty: l.qty,
                })),
                tendered: tenderedNumber,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setError(
                        errors.cart ??
                            errors.tendered ??
                            Object.values(errors)[0] ??
                            'Penjualan gagal disimpan.',
                    );
                },
                onFinish: () => {
                    setPaying(false);
                    focusScan();
                },
            },
        );
    }

    return (
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_22rem]">
            <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                        Shift sejak {shift.opened_at} · kas awal{' '}
                        {formatRupiah(shift.opening_cash)} · {shift.sales_count}{' '}
                        penjualan
                    </span>
                    <span className="space-x-4">
                        <Link
                            className="underline"
                            href={SaleController.index()}
                        >
                            Riwayat
                        </Link>
                        <Link
                            className="underline"
                            href={ShiftController.closing()}
                        >
                            Tutup shift
                        </Link>
                    </span>
                </div>

                <form onSubmit={submitScan} className="grid gap-2">
                    <Label htmlFor="scan">
                        Scan barcode (scanner USB mengetik lalu Enter)
                    </Label>
                    <Input
                        id="scan"
                        ref={scanRef}
                        value={scan}
                        onChange={(e) => setScan(e.target.value)}
                        autoComplete="off"
                        autoFocus
                        placeholder="Arahkan scanner ke barcode"
                        className="h-11 text-lg"
                    />
                </form>

                <div className="relative grid gap-2">
                    <Label htmlFor="cari">
                        Cari manual (nama, SKU, barcode)
                    </Label>
                    <Input
                        id="cari"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setQuery('');
                                focusScan();
                            }
                        }}
                        autoComplete="off"
                        placeholder="Ketik nama barang"
                    />
                    {results.length > 0 && (
                        <ul className="divide-y rounded-md border bg-card text-sm">
                            {results.map((p) => (
                                <li key={p.id} className="space-y-1 p-3">
                                    <div className="font-medium">
                                        {p.name}{' '}
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {p.sku}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {p.units.map((u) => (
                                            <Button
                                                key={u.product_unit_id}
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => {
                                                    addUnit(u);
                                                    setQuery('');
                                                    focusScan();
                                                }}
                                            >
                                                {u.unit_name}
                                                {u.conversion > 1
                                                    ? ` (isi ${u.conversion})`
                                                    : ''}{' '}
                                                · {formatRupiah(u.price)}
                                            </Button>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {query.trim() !== '' && results.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Tidak ada barang yang cocok.
                        </p>
                    )}
                </div>

                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="p-3">Barang</th>
                                <th className="p-3 text-right">Harga</th>
                                <th className="p-3">Jumlah</th>
                                <th className="p-3 text-right">Subtotal</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {cart.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        Keranjang kosong. Pindai barang untuk
                                        memulai.
                                    </td>
                                </tr>
                            )}
                            {cart.map((l) => {
                                const short =
                                    l.qty * l.conversion > l.stock_base;

                                return (
                                    <tr
                                        key={l.product_unit_id}
                                        className="border-t align-top"
                                    >
                                        <td className="p-3">
                                            {l.product_name}
                                            <span className="block text-xs text-muted-foreground">
                                                {l.unit_name}
                                                {l.conversion > 1
                                                    ? ` (isi ${l.conversion})`
                                                    : ''}
                                            </span>
                                            {short && (
                                                <Badge
                                                    variant="destructive"
                                                    className="mt-1"
                                                >
                                                    Stok{' '}
                                                    {formatNumber(l.stock_base)}{' '}
                                                    (satuan dasar)
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-3 text-right whitespace-nowrap">
                                            {formatRupiah(l.price)}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    aria-label="Kurangi"
                                                    disabled={l.qty <= 1}
                                                    onClick={() =>
                                                        setQty(
                                                            l.product_unit_id,
                                                            l.qty - 1,
                                                        )
                                                    }
                                                >
                                                    −
                                                </Button>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    className="w-16 text-center"
                                                    aria-label={`Jumlah ${l.product_name}`}
                                                    value={l.qty}
                                                    onChange={(e) =>
                                                        setQty(
                                                            l.product_unit_id,
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    aria-label="Tambah"
                                                    onClick={() =>
                                                        setQty(
                                                            l.product_unit_id,
                                                            l.qty + 1,
                                                        )
                                                    }
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right whitespace-nowrap">
                                            {formatRupiah(l.qty * l.price)}
                                        </td>
                                        <td className="p-3">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    removeLine(
                                                        l.product_unit_id,
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
            </div>

            <aside className="h-fit space-y-4 rounded-md border p-4">
                <div>
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-3xl font-semibold">
                        {formatRupiah(total)}
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="tendered">Uang diterima (Rp)</Label>
                    <Input
                        id="tendered"
                        type="number"
                        min={0}
                        value={tendered}
                        onChange={(e) => setTendered(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                pay();
                            }
                        }}
                        className="h-11 text-lg"
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={total === 0}
                            onClick={() => setTendered(String(total))}
                        >
                            Uang pas
                        </Button>
                        {QUICK_AMOUNTS.map((amount) => (
                            <Button
                                key={amount}
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setTendered(String(amount))}
                            >
                                {formatNumber(amount)}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">
                        {change < 0 ? 'Kurang' : 'Kembalian'}
                    </span>
                    <span
                        className={
                            change < 0
                                ? 'text-xl font-semibold text-destructive'
                                : 'text-xl font-semibold'
                        }
                    >
                        {formatRupiah(Math.abs(change))}
                    </span>
                </div>

                <InputError message={error ?? undefined} />

                <Button
                    className="h-12 w-full text-base"
                    disabled={!canPay}
                    onClick={pay}
                >
                    {paying ? 'Memproses…' : 'Bayar tunai'}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={cart.length === 0}
                    onClick={() => {
                        setCart([]);
                        setTendered('');
                        setError(null);
                        focusScan();
                    }}
                >
                    Kosongkan keranjang
                </Button>
            </aside>
        </div>
    );
}

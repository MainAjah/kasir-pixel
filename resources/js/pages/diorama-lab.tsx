import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import DioramaCanvas from '@/components/diorama/diorama-canvas';
import CounterLab from '@/components/diorama/counter-lab';
import DecorLab, { TimePicker } from '@/components/diorama/decor-lab';
import GoodsLab from '@/components/diorama/goods-lab';
import ReferenceLab from '@/components/diorama/reference-lab';
import RoomLab from '@/components/diorama/room-lab';
import VendingLab from '@/components/diorama/vending-lab';
import SpriteLab from '@/components/diorama/sprite-lab';
import { useDiorama } from '@/components/diorama/use-diorama';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import type { DioramaItem } from '@/diorama/engine/feed';
import { formatRupiah } from '@/diorama/render/pixel';
import type { RenderOptions } from '@/diorama/render/placeholder-renderer';
import type { TimeOfDay } from '@/diorama/sprites/decor-sprite';
import { lab, simulate } from '@/routes/diorama';

// Barang palsu untuk tombol uji; tidak ada hubungannya dengan data produk.
const PRODUCTS = [
    { name: 'Beras 5 kg', unit: 'sak', price: 68000 },
    { name: 'Minyak goreng 1 L', unit: 'botol', price: 17500 },
    { name: 'Gula pasir 1 kg', unit: 'pak', price: 16000 },
    { name: 'Teh celup', unit: 'kotak', price: 6500 },
    { name: 'Air mineral 600 ml', unit: 'botol', price: 3500 },
    { name: 'Mi instan', unit: 'bungkus', price: 3200 },
];

type Product = (typeof PRODUCTS)[number];
type Snapshot = ReturnType<ReturnType<typeof useDiorama>['world']['snapshot']>;

function randomProduct(): Product {
    return PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
}

function toLines(cart: Product[]): DioramaItem[] {
    const lines = new Map<string, DioramaItem>();

    for (const p of cart) {
        const line = lines.get(p.name) ?? {
            name: p.name,
            unit: p.unit,
            qty: 0,
        };
        line.qty += 1;
        lines.set(p.name, line);
    }

    return [...lines.values()];
}

export default function DioramaLab() {
    const { world, feed } = useDiorama({ autoBackground: false });
    const [cart, setCart] = useState<Product[]>([]);
    // Ada transaksi terbuka (pelanggan baru atau pindai) yang belum dibayar.
    const [isOpen, setIsOpen] = useState(false);
    const [lastSale, setLastSale] = useState<{
        number: string;
        total: number;
    } | null>(null);
    const [counter, setCounter] = useState(1);
    const [simulating, setSimulating] = useState(false);
    const [autoBackground, setAutoBackground] = useState(false);
    const [options, setOptions] = useState<RenderOptions>({
        paths: false,
        blocked: false,
        ids: true,
        timeOfDay: 'siang',
    });
    const timeOfDay = options.timeOfDay ?? 'siang';
    const setTimeOfDay = (t: TimeOfDay) =>
        setOptions((o) => ({ ...o, timeOfDay: t }));
    const [snapshot, setSnapshot] = useState<Snapshot>(() => world.snapshot());

    useEffect(() => {
        const timer = window.setInterval(
            () => setSnapshot(world.snapshot()),
            250,
        );

        return () => window.clearInterval(timer);
    }, [world]);

    useEffect(() => {
        world.autoBackground = autoBackground;
    }, [world, autoBackground]);

    // Peristiwa palsu langsung ke adaptor diorama: tidak lewat emitStoreEvent,
    // jadi tidak ada yang dikirim ke server dan tidak ada data yang ditulis.
    const open = () => {
        feed.push('sale.opened', { cashier: 'Lab' });
        setCart([]);
        setIsOpen(true);
    };

    const runAway = () => {
        feed.push('sale.abandoned', {});
        setCart([]);
        setIsOpen(false);
    };

    const scan = () => {
        const product = randomProduct();
        feed.push('item.scanned', {
            product: product.name,
            unit: product.unit,
            qty: 1,
        });
        setCart((c) => [...c, product]);
        setIsOpen(true);
    };

    const pay = (items: Product[], n: number) => {
        const number = `LAB-${String(n).padStart(4, '0')}`;
        const total = items.reduce((sum, p) => sum + p.price, 0);
        feed.push('sale.completed', { number, total, items: toLines(items) });
        setLastSale({ number, total });
    };

    const payCart = () => {
        pay(cart, counter);
        setCounter((n) => n + 1);
        setCart([]);
        setIsOpen(false);
    };

    const cancelLast = () => {
        if (lastSale) {
            feed.push('sale.voided', lastSale);
            setLastSale(null);
        }
    };

    const fullOrders = (count: number) => {
        for (let k = 0; k < count; k++) {
            const items = Array.from(
                { length: 1 + Math.floor(Math.random() * 3) },
                randomProduct,
            );
            feed.push('sale.opened', { cashier: 'Lab' });

            for (const p of items) {
                feed.push('item.scanned', {
                    product: p.name,
                    unit: p.unit,
                    qty: 1,
                });
            }

            pay(items, counter + k);
        }

        setCounter((n) => n + count);
        setCart([]);
        setIsOpen(false);
    };

    const toggle = (key: 'paths' | 'blocked' | 'ids') =>
        setOptions((o) => ({ ...o, [key]: !o[key] }));

    return (
        <>
            <Head title="Diorama lab" />

            <div className="space-y-6 p-4">
                <Heading
                    title="Diorama lab"
                    description="Pratinjau mesin dan sprite diorama. Tombol uji memutar peristiwa palsu di halaman ini: tidak ada data yang ditulis. Satu-satunya yang menulis data adalah tombol Simulasi pesanan."
                />

                <section className="space-y-3 rounded-md border p-4">
                    <h3 className="font-medium">
                        Tahap 5C elemen 5: hiasan (tanaman pot, jam dinding,
                        jendela, empat lukisan, lampu dinding)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Pilih waktu untuk diorama di bawah dan potongan
                        perbesaran 4× di sini. Jendela dan pintu kaca berganti
                        pemandangan luar (siang, senja, malam berbintang). Senja
                        dan malam: lampu dinding menyala, papan nama vending dan
                        layar mini tetap terang.
                    </p>
                    <TimePicker value={timeOfDay} onChange={setTimeOfDay} />
                    <DecorLab time={timeOfDay} />
                </section>

                <details className="rounded-md border p-4">
                    <summary className="cursor-pointer font-medium">
                        Tahap 5C yang sudah disetujui: pelanggan, rak, karakter
                        dari gambar Anda, lantai, dinding, pintu, meja kasir,
                        vending machine, serta barang, kantong, dan koin
                    </summary>
                    <div className="mt-4 space-y-8">
                        <GoodsLab />
                        <VendingLab />
                        <CounterLab />
                        <RoomLab />
                        <ReferenceLab />
                        <SpriteLab />
                    </div>
                </details>

                <section className="flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-medium">Waktu diorama</h3>
                    <TimePicker value={timeOfDay} onChange={setTimeOfDay} />
                </section>

                <DioramaCanvas
                    world={world}
                    options={options}
                    className="overflow-hidden rounded-md border bg-[#efe7d6]"
                />

                <section className="space-y-3">
                    <h3 className="text-sm font-medium">Peristiwa kasir</h3>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={open}>
                            Pelanggan baru
                        </Button>
                        <Button variant="outline" onClick={scan}>
                            Pindai barang
                        </Button>
                        <Button
                            variant="outline"
                            onClick={payCart}
                            disabled={cart.length === 0}
                        >
                            Bayar
                            {cart.length > 0 ? ` (${cart.length} barang)` : ''}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={cancelLast}
                            disabled={!lastSale}
                        >
                            Batalkan {lastSale?.number ?? ''}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={runAway}
                            disabled={!isOpen}
                        >
                            Kabur tanpa bayar
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => feed.push('background', {})}
                        >
                            Pelanggan latar
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            disabled={simulating}
                            onClick={() =>
                                router.post(
                                    simulate.url(),
                                    {},
                                    {
                                        preserveScroll: true,
                                        onStart: () => setSimulating(true),
                                        onFinish: () => setSimulating(false),
                                    },
                                )
                            }
                        >
                            Simulasi pesanan
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Penjualan sungguhan (tercatat, stok berkurang) atas
                            nama kasir contoh; sisanya di baris ini hanya
                            peristiwa palsu.
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => fullOrders(1)}
                        >
                            Pesanan lengkap
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => fullOrders(7)}
                        >
                            7 pesanan sekaligus
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        "Kabur tanpa bayar", atau "Pelanggan baru" saat
                        transaksi sebelumnya belum dibayar: pelanggan yang sudah
                        mengambil barang kabur ke pintu dan dikejar penjaga,
                        lalu penjaga kembali ke meja. Yang belum mengambil
                        apa-apa keluar biasa. Selama penjaga pergi, kasir tidak
                        melayani. "7 pesanan sekaligus" menguji batas 5
                        pelanggan, angka "+N", dan kejar ketinggalan.
                    </p>
                </section>

                <section className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={autoBackground}
                            onChange={() => setAutoBackground((v) => !v)}
                        />
                        Latar otomatis saat sepi
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={options.paths}
                            onChange={() => toggle('paths')}
                        />
                        Jalur pelanggan
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={options.blocked}
                            onChange={() => toggle('blocked')}
                        />
                        Tile terlarang
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={options.ids}
                            onChange={() => toggle('ids')}
                        />
                        Nomor pelanggan
                    </label>
                </section>

                <section className="grid gap-4 text-sm md:grid-cols-[16rem_1fr]">
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border p-3">
                        <dt className="text-muted-foreground">Penjaga</dt>
                        <dd>{snapshot.cashier}</dd>
                        <dt className="text-muted-foreground">Antrean</dt>
                        <dd>
                            {snapshot.queue.length > 0
                                ? snapshot.queue.join(', ')
                                : '-'}
                        </dd>
                        <dt className="text-muted-foreground">Menunggu (+N)</dt>
                        <dd>{snapshot.waiting}</dd>
                        <dt className="text-muted-foreground">Total harian</dt>
                        <dd>Rp {formatRupiah(snapshot.dailyTotal)}</dd>
                        <dt className="text-muted-foreground">
                            Layar pelanggan
                        </dt>
                        <dd>
                            {snapshot.display.total === null
                                ? '-'
                                : `Rp ${formatRupiah(snapshot.display.total)}`}
                        </dd>
                    </dl>

                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-left">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="px-3 py-2 font-medium">
                                        No
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        Jenis
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        State
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        Tile
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        Penjualan
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        Pindai
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {snapshot.customers.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-3 py-3 text-center text-muted-foreground"
                                        >
                                            Toko sepi.
                                        </td>
                                    </tr>
                                )}
                                {snapshot.customers.map((c) => (
                                    <tr
                                        key={c.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="px-3 py-1.5">{c.id}</td>
                                        <td className="px-3 py-1.5">
                                            {c.kind}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            {c.state}
                                            {c.speed > 1 ? ' (kejar)' : ''}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            {c.tile.gx},{c.tile.gy}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            {c.sale
                                                ? c.sale.voided
                                                    ? `${c.sale.number} (batal)`
                                                    : c.sale.abandoned
                                                      ? 'ditinggalkan'
                                                      : c.sale.completed
                                                        ? c.sale.number
                                                        : 'terbuka'
                                                : '-'}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            {c.sale?.scans ?? '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </>
    );
}

DioramaLab.layout = {
    breadcrumbs: [{ title: 'Diorama lab', href: lab() }],
};

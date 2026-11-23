import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { formatNumber, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MemberHit } from '@/types';
import type { CartLine } from './catalog';
import MemberPicker from './member-picker';

const QUICK_AMOUNTS = [20000, 50000, 100000];

/** Tombol kecil bertepi tinta (plus, minus, nominal cepat). */
const CHIP =
    'border-2 border-px-tinta bg-px-dinding font-pixel text-px-tinta hover:bg-px-lampu focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none disabled:cursor-not-allowed disabled:border-px-logam disabled:text-px-bayangan disabled:hover:bg-px-dinding';

/** Tempat sampah 8 × 8 (warna teks tombol). */
const TRASH = [
    '...##...',
    '.######.',
    '........',
    '.######.',
    '.#.##.#.',
    '.#.##.#.',
    '.#.##.#.',
    '.######.',
];

function TrashIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 8 8"
            width={16}
            height={16}
            shapeRendering="crispEdges"
        >
            {TRASH.flatMap((row, y) =>
                row
                    .split('')
                    .map((ch, x) =>
                        ch === '#' ? (
                            <rect
                                key={`${x},${y}`}
                                x={x}
                                y={y}
                                width={1}
                                height={1}
                                fill="currentColor"
                            />
                        ) : null,
                    ),
            )}
        </svg>
    );
}

function CartRow({
    line,
    onQty,
    onRemove,
}: {
    line: CartLine;
    onQty: (qty: number) => void;
    onRemove: () => void;
}) {
    const short = line.qty * line.conversion > line.stock_base;

    return (
        <li className="border-b-2 border-dashed border-px-lantai py-2 last:border-b-0">
            <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-sm leading-snug font-semibold text-px-tinta">
                    {line.product_name}
                </p>
                <button
                    type="button"
                    aria-label={`Hapus ${line.product_name} dari keranjang`}
                    title="Hapus dari keranjang"
                    onClick={onRemove}
                    className="grid size-7 shrink-0 place-items-center border-2 border-px-tinta bg-px-sorotan text-px-tinta hover:bg-px-bata focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none"
                >
                    <TrashIcon />
                </button>
            </div>

            <div className="mt-1 flex items-center gap-2">
                <p className="min-w-0 flex-1 text-xs text-px-bayangan">
                    {formatRupiah(line.price)} / {line.unit_name}
                    {line.conversion > 1 ? ` (isi ${line.conversion})` : ''}
                </p>

                <div className="flex items-center">
                    {/* Pada jumlah 1, minus mengeluarkan barang dari keranjang. */}
                    <button
                        type="button"
                        aria-label={
                            line.qty <= 1
                                ? `Hapus ${line.product_name} dari keranjang`
                                : `Kurangi ${line.product_name}`
                        }
                        title={
                            line.qty <= 1 ? 'Hapus dari keranjang' : undefined
                        }
                        onClick={() =>
                            line.qty <= 1 ? onRemove() : onQty(line.qty - 1)
                        }
                        className={cn(CHIP, 'size-7 text-sm')}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        min={1}
                        aria-label={`Jumlah ${line.product_name}`}
                        value={line.qty}
                        onChange={(e) => onQty(Number(e.target.value))}
                        className="h-7 w-10 [appearance:textfield] border-y-2 border-px-tinta bg-px-sorotan text-center font-pixel text-sm text-px-tinta outline-none focus-visible:bg-px-lampu [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                        type="button"
                        aria-label={`Tambah ${line.product_name}`}
                        onClick={() => onQty(line.qty + 1)}
                        className={cn(CHIP, 'size-7 text-sm')}
                    >
                        +
                    </button>
                </div>

                <span className="w-20 text-right font-pixel text-sm text-px-tinta">
                    {formatRupiah(line.qty * line.price)}
                </span>
            </div>

            {short && (
                <p className="mt-1 inline-block bg-px-bata px-1 text-xs font-semibold text-px-tinta">
                    Stok tinggal {formatNumber(line.stock_base)} (satuan dasar)
                </p>
            )}
        </li>
    );
}

/**
 * Panel keranjang dan pembayaran (Tahap 5E-1): baris barang dengan plus dan
 * minus, subtotal, total besar, cara bayar, uang diterima, lalu Proses
 * Pembayaran. Hanya tampilan; semua aksi dari layar kasir.
 */
export default function CartPanel({
    cart,
    count,
    total,
    onQty,
    onRemove,
    onClear,
    member,
    onMemberChange,
    tendered,
    onTenderedChange,
    error,
    canPay,
    paying,
    onPay,
}: {
    cart: CartLine[];
    count: number;
    total: number;
    onQty: (unitId: number, qty: number) => void;
    onRemove: (unitId: number) => void;
    onClear: () => void;
    member: MemberHit | null;
    onMemberChange: (member: MemberHit | null) => void;
    tendered: string;
    onTenderedChange: (value: string) => void;
    error: string | null;
    canPay: boolean;
    paying: boolean;
    onPay: () => void;
}) {
    const change = (Number(tendered) || 0) - total;

    return (
        <aside
            aria-label="Keranjang belanja"
            className="flex min-h-0 flex-col bg-px-sorotan pixel-frame"
        >
            <header className="flex items-center justify-between gap-2 border-b-2 border-dashed border-px-lantai px-4 py-3">
                <h2 className="font-pixel text-lg text-px-tinta">
                    Keranjang belanja ({count})
                </h2>
                <button
                    type="button"
                    disabled={cart.length === 0}
                    onClick={onClear}
                    className="text-sm text-px-bayangan underline hover:text-px-tinta disabled:no-underline disabled:opacity-50"
                >
                    Kosongkan
                </button>
            </header>

            <div className="min-h-28 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-px-lantai)_transparent] overflow-y-auto px-4">
                {cart.length === 0 ? (
                    <p className="py-8 text-center text-sm text-px-bayangan">
                        Keranjang kosong. Pindai barcode atau klik barang di
                        kiri.
                    </p>
                ) : (
                    <ul>
                        {cart.map((l) => (
                            <CartRow
                                key={l.product_unit_id}
                                line={l}
                                onQty={(qty) => onQty(l.product_unit_id, qty)}
                                onRemove={() => onRemove(l.product_unit_id)}
                            />
                        ))}
                    </ul>
                )}
            </div>

            <div className="space-y-2.5 border-t-2 border-px-tinta px-4 pt-3 pb-4">
                <div className="border-2 border-px-tinta bg-px-lampu px-3 py-2">
                    <div className="flex items-baseline justify-between text-xs text-px-bayangan">
                        <span>Subtotal ({count} barang)</span>
                        <span className="font-pixel text-sm text-px-tinta">
                            {formatRupiah(total)}
                        </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="font-pixel text-lg text-px-tinta">
                            Total
                        </span>
                        <span className="font-pixel text-3xl leading-tight text-px-tinta">
                            {formatRupiah(total)}
                        </span>
                    </div>
                </div>

                <MemberPicker member={member} onChange={onMemberChange} />

                <fieldset>
                    <legend className="sr-only">Cara bayar</legend>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            aria-pressed="true"
                            className="h-10 border-2 border-px-tinta bg-px-lampu font-pixel text-base text-px-tinta shadow-[2px_2px_0_var(--color-px-tinta)] focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none"
                        >
                            Tunai
                        </button>
                        <button
                            type="button"
                            disabled
                            title="Bayar dengan simpanan anggota segera hadir"
                            className="flex h-10 cursor-not-allowed flex-col items-center justify-center border-2 border-dashed border-px-logam bg-px-dinding leading-tight text-px-bayangan"
                        >
                            <span className="font-pixel text-sm">
                                Simpanan anggota
                            </span>
                            <span className="text-[11px]">segera hadir</span>
                        </button>
                    </div>
                </fieldset>

                <div className="grid gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <label
                            htmlFor="tendered"
                            className="text-sm font-semibold text-px-tinta"
                        >
                            Uang diterima
                        </label>
                        <div className="flex flex-wrap gap-1">
                            <button
                                type="button"
                                disabled={total === 0}
                                onClick={() => onTenderedChange(String(total))}
                                aria-label="Uang pas"
                                className={cn(CHIP, 'h-6 px-1.5 text-xs')}
                            >
                                Pas
                            </button>
                            {QUICK_AMOUNTS.map((amount) => (
                                <button
                                    key={amount}
                                    type="button"
                                    onClick={() =>
                                        onTenderedChange(String(amount))
                                    }
                                    aria-label={`Uang ${formatRupiah(amount)}`}
                                    className={cn(CHIP, 'h-6 px-1.5 text-xs')}
                                >
                                    {formatNumber(amount / 1000)}rb
                                </button>
                            ))}
                        </div>
                    </div>
                    <Input
                        id="tendered"
                        type="number"
                        min={0}
                        value={tendered}
                        onChange={(e) => onTenderedChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                onPay();
                            }
                        }}
                        placeholder="Rp"
                        className="h-10 border-2 border-px-tinta bg-px-sorotan font-pixel text-lg"
                    />
                </div>

                <div className="flex items-baseline justify-between">
                    <span className="text-sm text-px-bayangan">
                        {change < 0 ? 'Kurang' : 'Kembalian'}
                    </span>
                    <span
                        className={cn(
                            'font-pixel text-xl text-px-tinta',
                            change < 0 && 'bg-px-bata px-1.5',
                        )}
                    >
                        {formatRupiah(Math.abs(change))}
                    </span>
                </div>

                <InputError message={error ?? undefined} />

                <button
                    type="button"
                    disabled={!canPay}
                    onClick={onPay}
                    className="h-12 w-full bg-px-kunyit font-pixel text-lg text-px-tinta pixel-frame hover:bg-px-kunyit-tua focus-visible:ring-2 focus-visible:ring-px-biru-tua focus-visible:outline-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-px-tinta)] disabled:cursor-not-allowed disabled:bg-px-dinding disabled:text-px-bayangan disabled:shadow-none disabled:active:translate-x-0 disabled:active:translate-y-0"
                >
                    {paying ? 'Memproses…' : 'Proses Pembayaran'}
                </button>
            </div>
        </aside>
    );
}

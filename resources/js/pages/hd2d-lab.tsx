import { Head } from '@inertiajs/react';
import { useId, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import HdBanner from '@/components/hd2d/banner';
import HdButton from '@/components/hd2d/button';
import HdInput from '@/components/hd2d/input';
import HdListRow, { HdList } from '@/components/hd2d/list-row';
import { blend, contrastRatio, moveActive } from '@/components/hd2d/logic';
import HdModal from '@/components/hd2d/modal';
import HdPanel from '@/components/hd2d/panel';
import HdShopkeeperDialog from '@/components/hd2d/shopkeeper-dialog';
import type { HdTone } from '@/components/hd2d/shopkeeper-dialog';
import HdTabs, { hdTabId, hdTabPanelId } from '@/components/hd2d/tabs';
import { HD_COLORS, HD_PANEL_ALPHA } from '@/components/hd2d/tokens';
import type { HdColor } from '@/components/hd2d/tokens';
import { formatNumber, formatRupiah } from '@/lib/format';

/**
 * Lab komponen HD-2D (Tahap B1): pratinjau token dan komponen dasar di atas
 * latar senja. Data contoh di halaman ini saja; tidak membaca atau menulis
 * database. Hanya admin.
 */

type Item = {
    key: string;
    name: string;
    rpg: string;
    category: string;
    price: number;
    stock: number;
};

const ITEMS: readonly Item[] = [
    {
        key: 'air-mineral',
        name: 'Air mineral 600 ml',
        rpg: 'Air Mata Air Pegunungan',
        category: 'minuman',
        price: 4000,
        stock: 24,
    },
    {
        key: 'teh-botol',
        name: 'Teh botol',
        rpg: 'Ramuan Teh Emas',
        category: 'minuman',
        price: 5000,
        stock: 18,
    },
    {
        key: 'kopi',
        name: 'Kopi',
        rpg: 'Seduhan Penjaga Malam',
        category: 'minuman',
        price: 8000,
        stock: 9,
    },
    {
        key: 'biskuit',
        name: 'Biskuit kelapa',
        rpg: 'Bekal Pengelana',
        category: 'makanan',
        price: 9500,
        stock: 12,
    },
    {
        key: 'keripik',
        name: 'Keripik singkong',
        rpg: 'Keping Akar Renyah',
        category: 'makanan',
        price: 12000,
        stock: 7,
    },
    {
        key: 'cokelat',
        name: 'Cokelat batang',
        rpg: 'Batang Manis Bangsawan',
        category: 'makanan',
        price: 15000,
        stock: 3,
    },
    {
        key: 'beras',
        name: 'Beras 5 kg',
        rpg: 'Karung Panen Lembah',
        category: 'sembako',
        price: 72000,
        stock: 5,
    },
    {
        key: 'mi-instan',
        name: 'Mi instan',
        rpg: 'Mi Kilat Penjelajah',
        category: 'sembako',
        price: 3500,
        stock: 40,
    },
    {
        key: 'sabun',
        name: 'Sabun mandi',
        rpg: 'Batu Gelembung Peri',
        category: 'rumah',
        price: 4500,
        stock: 0,
    },
];

const CATEGORIES = [
    { value: 'semua', label: 'Semua' },
    { value: 'minuman', label: 'Minuman' },
    { value: 'makanan', label: 'Makanan ringan' },
    { value: 'sembako', label: 'Sembako' },
    { value: 'rumah', label: 'Kebutuhan rumah' },
];

const QUICK_CASH = [20000, 50000, 100000];

const SWATCHES: { key: HdColor; label: string }[] = [
    { key: 'emas', label: 'Emas' },
    { key: 'emasTua', label: 'Emas tua' },
    { key: 'krem', label: 'Teks krem' },
    { key: 'kremRedup', label: 'Teks sekunder' },
    { key: 'merah', label: 'Galat' },
    { key: 'hijau', label: 'Sukses' },
];

/** Warna panel nyata di atas latar gelap (0,86 di atas langit malam). */
const PANEL_ON_SCENE = blend(HD_COLORS.panel, HD_PANEL_ALPHA, '#2a2140');

const digits = (text: string) => Number(text.replace(/\D/g, '')) || 0;

export default function Hd2dLab() {
    const listId = useId();
    const [category, setCategory] = useState('semua');
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [cart, setCart] = useState<Record<string, number>>({});
    const [paid, setPaid] = useState('');
    const [payError, setPayError] = useState<string | null>(null);
    const [say, setSay] = useState<{ text: string; tone: HdTone }>({
        text: 'Selamat datang. Pilih barang dengan panah atas dan bawah, lalu tekan Enter untuk menambah.',
        tone: 'normal',
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [banner, setBanner] = useState<{
        total: number;
        paid: number;
        change: number;
    } | null>(null);

    const visible = ITEMS.filter(
        (item) =>
            (category === 'semua' || item.category === category) &&
            item.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
    const activeIndex = Math.min(active, visible.length - 1);
    const activeItem = visible[activeIndex];
    const rowId = (key: string) => `${listId}-${key}`;

    const lines = ITEMS.filter((item) => cart[item.key]);
    const total = lines.reduce(
        (sum, item) => sum + item.price * cart[item.key],
        0,
    );
    const paidValue = digits(paid);

    const add = (item: Item) => {
        if (item.stock <= 0) {
            setSay({
                text: `Maaf, ${item.name} sedang habis. Belum bisa ditambah.`,
                tone: 'galat',
            });

            return;
        }

        setCart((c) => ({
            ...c,
            [item.key]: Math.min(item.stock, (c[item.key] ?? 0) + 1),
        }));
        setSay({ text: `${item.name} masuk keranjang.`, tone: 'normal' });
    };

    const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setActive(
                moveActive(
                    activeIndex,
                    event.key === 'ArrowDown' ? 1 : -1,
                    visible.length,
                ),
            );
        } else if (event.key === 'Enter' && activeItem) {
            event.preventDefault();
            add(activeItem);
        }
    };

    const pay = () => {
        if (total === 0) {
            setSay({ text: 'Keranjang masih kosong.', tone: 'galat' });

            return;
        }

        if (paidValue < total) {
            const short = formatRupiah(total - paidValue);
            setPayError(`Kurang ${short}.`);
            setSay({ text: `Uangnya kurang ${short}.`, tone: 'galat' });

            return;
        }

        setPayError(null);
        setBanner({ total, paid: paidValue, change: paidValue - total });
        setSay({
            text: `Terima kasih! Kembaliannya ${formatRupiah(paidValue - total)}.`,
            tone: 'sukses',
        });
    };

    const reset = () => {
        setCart({});
        setPaid('');
        setPayError(null);
    };

    return (
        <>
            <Head title="Lab komponen HD-2D" />
            <div
                className="hd-akar relative min-h-dvh bg-[#0c0d1c] bg-cover bg-center"
                style={{
                    backgroundImage:
                        'linear-gradient(rgb(8 9 20 / 0.35), rgb(8 9 20 / 0.55)), url(/assets/hd2d/latar/konsep-senja.png)',
                    imageRendering: 'pixelated',
                }}
            >
                <div className="mx-auto grid max-w-[1400px] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] lg:p-6">
                    <div className="flex min-w-0 flex-col gap-5">
                        <HdPanel
                            title="Lab komponen HD-2D"
                            description="Tahap B1: token desain dan komponen dasar. Data contoh, tidak membaca database."
                        >
                            <Specimens onOpenModal={() => setModalOpen(true)} />
                        </HdPanel>

                        <HdShopkeeperDialog
                            message={say.text}
                            tone={say.tone}
                            className="mt-auto max-w-xl"
                        />
                    </div>

                    <div className="flex min-w-0 flex-col gap-5">
                        <HdPanel title="Daftar Barang">
                            <HdTabs
                                id={listId}
                                label="Kategori barang"
                                items={CATEGORIES.map((c) => ({
                                    ...c,
                                    count:
                                        c.value === 'semua'
                                            ? ITEMS.length
                                            : ITEMS.filter(
                                                  (i) => i.category === c.value,
                                              ).length,
                                }))}
                                value={category}
                                onValueChange={(value) => {
                                    setCategory(value);
                                    setActive(0);
                                }}
                            />
                            <div
                                role="tabpanel"
                                id={hdTabPanelId(listId)}
                                aria-labelledby={hdTabId(listId, category)}
                                className="mt-3 space-y-3"
                            >
                                <HdInput
                                    label="Cari barang"
                                    hideLabel
                                    placeholder="Cari barang"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setActive(0);
                                    }}
                                    onKeyDown={onSearchKey}
                                    role="combobox"
                                    aria-expanded
                                    aria-autocomplete="list"
                                    aria-controls={`${listId}-daftar`}
                                    aria-activedescendant={
                                        activeItem
                                            ? rowId(activeItem.key)
                                            : undefined
                                    }
                                    hint="Panah atas/bawah memilih, Enter menambah."
                                />
                                <HdList
                                    id={`${listId}-daftar`}
                                    label="Daftar barang"
                                    className="max-h-[300px] overflow-y-auto"
                                >
                                    {visible.map((item, index) => (
                                        <HdListRow
                                            key={item.key}
                                            id={rowId(item.key)}
                                            name={item.name}
                                            rpgName={item.rpg}
                                            price={formatRupiah(item.price)}
                                            stock={
                                                item.stock > 0
                                                    ? `Stok ${formatNumber(item.stock)}`
                                                    : 'Habis'
                                            }
                                            stockOut={item.stock <= 0}
                                            disabled={item.stock <= 0}
                                            selected={index === activeIndex}
                                            icon={
                                                <img
                                                    src={`/assets/hd2d/ikon/${item.key}.png`}
                                                    alt=""
                                                    className="hd-piksel"
                                                />
                                            }
                                            onActivate={() => add(item)}
                                            onPointerEnter={() =>
                                                setActive(index)
                                            }
                                        />
                                    ))}
                                    {visible.length === 0 && (
                                        <p className="px-3 py-4 text-sm text-[var(--hd-krem-redup)]">
                                            Tidak ada barang yang cocok. Coba
                                            kata lain atau pilih Semua.
                                        </p>
                                    )}
                                </HdList>
                            </div>
                        </HdPanel>

                        <HdPanel
                            title="Keranjang"
                            actions={
                                <span className="text-sm text-[var(--hd-krem-redup)]">
                                    {lines.length} jenis
                                </span>
                            }
                        >
                            {lines.length === 0 ? (
                                <p className="text-sm text-[var(--hd-krem-redup)]">
                                    Belum ada barang. Tambah dari daftar di
                                    atas.
                                </p>
                            ) : (
                                <ul className="space-y-1 text-sm">
                                    {lines.map((item) => (
                                        <li
                                            key={item.key}
                                            className="flex justify-between gap-3"
                                        >
                                            <span className="truncate">
                                                {item.name} × {cart[item.key]}
                                            </span>
                                            <span className="hd-angka">
                                                {formatRupiah(
                                                    item.price * cart[item.key],
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-[rgb(184_149_79_/_0.45)] pt-3">
                                <span className="hd-judul text-sm">Total</span>
                                <span className="hd-judul hd-angka text-3xl">
                                    {formatRupiah(total)}
                                </span>
                            </div>

                            <div className="mt-3 space-y-2">
                                <HdInput
                                    label="Uang diterima (Rp)"
                                    leading="Rp"
                                    numeric
                                    placeholder="0"
                                    value={paid ? formatNumber(paidValue) : ''}
                                    onChange={(e) => {
                                        setPaid(e.target.value);
                                        setPayError(null);
                                    }}
                                    error={payError}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <HdButton
                                        variant="sekunder"
                                        size="kecil"
                                        onClick={() => setPaid(String(total))}
                                    >
                                        Uang pas
                                    </HdButton>
                                    {QUICK_CASH.map((cash) => (
                                        <HdButton
                                            key={cash}
                                            variant="sekunder"
                                            size="kecil"
                                            onClick={() =>
                                                setPaid(String(cash))
                                            }
                                        >
                                            {formatNumber(cash)}
                                        </HdButton>
                                    ))}
                                </div>
                                <p className="flex justify-between text-sm text-[var(--hd-krem-redup)]">
                                    <span>Kembalian</span>
                                    <span className="hd-angka text-[var(--hd-krem)]">
                                        {formatRupiah(
                                            Math.max(0, paidValue - total),
                                        )}
                                    </span>
                                </p>
                            </div>

                            <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
                                <HdButton
                                    variant="sekunder"
                                    size="besar"
                                    disabled={lines.length === 0}
                                    onClick={() => setModalOpen(true)}
                                >
                                    Batal
                                </HdButton>
                                <HdButton size="besar" onClick={pay}>
                                    Bayar
                                </HdButton>
                            </div>
                        </HdPanel>
                    </div>
                </div>
            </div>

            <HdModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title="Kosongkan keranjang?"
                description="Semua barang di keranjang contoh ini dihapus. Data asli tidak tersentuh."
                footer={
                    <>
                        <HdButton
                            variant="sekunder"
                            onClick={() => setModalOpen(false)}
                        >
                            Kembali
                        </HdButton>
                        <HdButton
                            onClick={() => {
                                reset();
                                setModalOpen(false);
                                setSay({
                                    text: 'Keranjang sudah kosong lagi.',
                                    tone: 'normal',
                                });
                            }}
                        >
                            Kosongkan
                        </HdButton>
                    </>
                }
            />

            <HdBanner
                open={banner !== null}
                title="Transaksi Selesai"
                details={
                    banner
                        ? [
                              {
                                  label: 'Total',
                                  value: formatRupiah(banner.total),
                              },
                              {
                                  label: 'Diterima',
                                  value: formatRupiah(banner.paid),
                              },
                              {
                                  label: 'Kembalian',
                                  value: formatRupiah(banner.change),
                              },
                          ]
                        : undefined
                }
                onClose={() => {
                    setBanner(null);
                    reset();
                }}
            />
        </>
    );
}

/** Contoh token, tombol, dan isian dalam semua keadaannya. */
function Specimens({ onOpenModal }: { onOpenModal: () => void }) {
    return (
        <div className="grid gap-5 xl:grid-cols-2">
            <section aria-labelledby="lab-warna" className="space-y-2">
                <h3 id="lab-warna" className="hd-judul text-sm">
                    Warna dan kontras di atas panel
                </h3>
                <ul className="grid grid-cols-2 gap-2 text-sm">
                    {SWATCHES.map(({ key, label }) => (
                        <li key={key} className="flex items-center gap-2">
                            <span
                                aria-hidden="true"
                                className="size-6 shrink-0 border border-black/60"
                                style={{ background: HD_COLORS[key] }}
                            />
                            <span className="min-w-0">
                                <span
                                    className="block"
                                    style={{ color: HD_COLORS[key] }}
                                >
                                    {label}
                                </span>
                                <span className="hd-angka block text-xs text-[var(--hd-krem-redup)]">
                                    {HD_COLORS[key]}, kontras{' '}
                                    {contrastRatio(
                                        HD_COLORS[key],
                                        PANEL_ON_SCENE,
                                    )
                                        .toFixed(1)
                                        .replace('.', ',')}
                                    :1
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            <section aria-labelledby="lab-tombol" className="space-y-3">
                <h3 id="lab-tombol" className="hd-judul text-sm">
                    Tombol
                </h3>
                <Row>
                    <HdButton>Simpan</HdButton>
                    <HdButton variant="sekunder">Tutup</HdButton>
                    <HdButton disabled>Nonaktif</HdButton>
                </Row>
                <Row>
                    <HdButton size="kecil">Kecil</HdButton>
                    <HdButton size="besar">Besar</HdButton>
                    <HdButton variant="sekunder" onClick={onOpenModal}>
                        Buka modal
                    </HdButton>
                </Row>
            </section>

            <section
                aria-labelledby="lab-isian"
                className="space-y-3 xl:col-span-2"
            >
                <h3 id="lab-isian" className="hd-judul text-sm">
                    Isian
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                    <HdInput label="Nama pelanggan" placeholder="Opsional" />
                    <HdInput
                        label="Jumlah (Rp)"
                        leading="Rp"
                        numeric
                        defaultValue="15.000"
                        error="Kurang Rp 2.500."
                    />
                    <HdInput
                        label="Kode kasir"
                        value="KSR-01"
                        disabled
                        readOnly
                        hint="Diisi otomatis."
                    />
                </div>
            </section>
        </div>
    );
}

function Row({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

// Layar penuh tanpa menu samping: halaman ini memakai latarnya sendiri.
Hd2dLab.layout = (page: ReactNode) => <>{page}</>;

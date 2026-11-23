/**
 * Data dan aturan tampilan grid produk di layar kasir (Tahap 5E-1). Murni, tanpa
 * React: hanya menyaring dan memberi label. Harga dan stok yang menentukan tetap
 * dihitung server saat bayar.
 */

export type PosShift = {
    id: number;
    opened_at: string;
    opening_cash: number;
    sales_count: number;
};

/** Satu satuan jual (sama dengan jawaban scan barcode di server). */
export type UnitHit = {
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

export type CatalogProduct = {
    id: number;
    sku: string;
    name: string;
    /** Gambar barang (unggahan admin), null berarti ikon kardus. */
    image_url: string | null;
    category: string | null;
    /** Stok dalam satuan dasar. */
    stock: number;
    min_stock: number;
    /** Satuan dasar lebih dulu. */
    units: UnitHit[];
};

export type CartLine = UnitHit & { qty: number };

export type StockStatus = 'aman' | 'menipis' | 'habis';

/** Tab untuk produk tanpa kategori. */
export const NO_CATEGORY = 'Lainnya';

/** Aturan sama dengan laporan inventaris: habis ≤ 0, menipis ≤ stok minimum. */
export function stockStatus(stock: number, minStock: number): StockStatus {
    if (stock <= 0) {
        return 'habis';
    }

    return stock <= minStock ? 'menipis' : 'aman';
}

/** Daftar tab kategori: "Semua", kategori menurut abjad, lalu "Lainnya" bila ada. */
export function categoryTabs(catalog: CatalogProduct[]): string[] {
    const names = new Set<string>();
    let hasNone = false;

    for (const p of catalog) {
        if (p.category) {
            names.add(p.category);
        } else {
            hasNone = true;
        }
    }

    return [
        'Semua',
        ...[...names].sort((a, b) => a.localeCompare(b, 'id')),
        ...(hasNone ? [NO_CATEGORY] : []),
    ];
}

/** Saring menurut tab dan kata kunci (nama, SKU, atau barcode persis). */
export function filterCatalog(
    catalog: CatalogProduct[],
    query: string,
    tab: string,
): CatalogProduct[] {
    const q = query.trim().toLocaleLowerCase('id');

    return catalog.filter((p) => {
        if (tab !== 'Semua' && (p.category ?? NO_CATEGORY) !== tab) {
            return false;
        }

        if (q === '') {
            return true;
        }

        return (
            p.name.toLocaleLowerCase('id').includes(q) ||
            p.sku.toLocaleLowerCase('id').includes(q) ||
            p.units.some(
                (u) => u.barcode !== null && u.barcode === query.trim(),
            )
        );
    });
}

/** Satuan yang barcodenya persis sama, untuk scanner USB. */
export function findByBarcode(
    catalog: CatalogProduct[],
    code: string,
): UnitHit | null {
    for (const p of catalog) {
        const unit = p.units.find((u) => u.barcode === code);

        if (unit) {
            return unit;
        }
    }

    return null;
}

/** Jumlah barang di keranjang (dalam satuan yang dijual). */
export function cartCount(cart: CartLine[]): number {
    return cart.reduce((sum, l) => sum + l.qty, 0);
}

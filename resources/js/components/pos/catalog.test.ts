import { describe, expect, it } from 'vite-plus/test';
import {
    cartCount,
    categoryTabs,
    filterCatalog,
    findByBarcode,
    stockStatus,
} from './catalog';
import type { CatalogProduct, UnitHit } from './catalog';

function unit(id: number, name: string, barcode: string | null): UnitHit {
    return {
        product_unit_id: id,
        product_id: 1,
        sku: 'X',
        product_name: 'X',
        unit_name: name,
        conversion: 1,
        price: 1000,
        barcode,
        stock_base: 10,
        stock_units: 10,
    };
}

const catalog: CatalogProduct[] = [
    {
        id: 1,
        sku: 'DM-101',
        name: 'Air mineral 600 ml',
        category: 'Minuman',
        stock: 60,
        min_stock: 10,
        units: [unit(11, 'botol', '8991'), unit(12, 'dus', '8992')],
    },
    {
        id: 2,
        sku: 'DM-001',
        name: 'Beras 5 kg',
        category: 'Sembako',
        stock: 0,
        min_stock: 10,
        units: [unit(21, 'sak', null)],
    },
    {
        id: 3,
        sku: 'LN-1',
        name: 'Korek api',
        category: null,
        stock: 4,
        min_stock: 5,
        units: [unit(31, 'pcs', '777')],
    },
];

describe('grid produk kasir (5E-1)', () => {
    it('status stok: habis, menipis di batas minimum, aman di atasnya', () => {
        expect(stockStatus(0, 10)).toBe('habis');
        expect(stockStatus(-2, 10)).toBe('habis');
        expect(stockStatus(10, 10)).toBe('menipis');
        expect(stockStatus(11, 10)).toBe('aman');
    });

    it('tab kategori: Semua, abjad, lalu Lainnya untuk tanpa kategori', () => {
        expect(categoryTabs(catalog)).toEqual([
            'Semua',
            'Minuman',
            'Sembako',
            'Lainnya',
        ]);
        expect(categoryTabs(catalog.slice(0, 2))).toEqual([
            'Semua',
            'Minuman',
            'Sembako',
        ]);
    });

    it('menyaring menurut tab dan kata kunci nama, SKU, atau barcode', () => {
        const names = (q: string, tab = 'Semua') =>
            filterCatalog(catalog, q, tab).map((p) => p.name);

        expect(names('')).toHaveLength(3);
        expect(names('', 'Sembako')).toEqual(['Beras 5 kg']);
        expect(names('', 'Lainnya')).toEqual(['Korek api']);
        expect(names('AIR')).toEqual(['Air mineral 600 ml']);
        expect(names('dm-0')).toEqual(['Beras 5 kg']);
        expect(names('8992')).toEqual(['Air mineral 600 ml']);
        expect(names('899')).toEqual([]);
        expect(names('air', 'Sembako')).toEqual([]);
    });

    it('barcode persis menemukan satuannya', () => {
        expect(findByBarcode(catalog, '8992')?.unit_name).toBe('dus');
        expect(findByBarcode(catalog, '777')?.product_unit_id).toBe(31);
        expect(findByBarcode(catalog, '000')).toBeNull();
    });

    it('jumlah barang di keranjang', () => {
        expect(
            cartCount([
                { ...unit(11, 'botol', null), qty: 2 },
                { ...unit(12, 'dus', null), qty: 3 },
            ]),
        ).toBe(5);
    });
});

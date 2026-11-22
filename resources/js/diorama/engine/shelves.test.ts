import { describe, expect, it } from 'vite-plus/test';
import { STORE_SCENE } from '../scenes/store-scene';
import type { RackFill } from '../sprites/rack-sprite';
import { distribute, shelfFills } from './shelves';

// Data contoh Tahap 6 setelah diurutkan server (kategori lalu nama).
const RAK_CONTOH: RackFill[] = [
    'setengah', // Detergen
    'sedikit', // Pasta gigi
    'penuh', // Sabun mandi
    'penuh', // Tisu gulung
    'setengah', // Biskuit kelapa
    'kosong', // Cokelat batang
    'sedikit', // Keripik singkong
    'penuh', // Permen mint
    'penuh', // Beras
    'kosong', // Garam
    'penuh', // Gula
    'sedikit', // Kecap
    'penuh', // Mi instan
    'setengah', // Minyak goreng
    'setengah', // Telur
    'sedikit', // Tepung
];
const VENDING_CONTOH: RackFill[] = [
    'penuh', // Air mineral
    'kosong', // Jus jeruk
    'penuh', // Isotonik
    'setengah', // Susu UHT
    'sedikit', // Teh botol
    'setengah', // Teh celup
];

describe('distribute', () => {
    it('tanpa produk semua potongan kosong', () => {
        expect(distribute([], 3)).toEqual(['kosong', 'kosong', 'kosong']);
    });

    it('produk lebih sedikit dari potongan: satu produk mengisi beberapa potongan', () => {
        expect(distribute(['penuh', 'sedikit'], 4)).toEqual([
            'penuh',
            'penuh',
            'sedikit',
            'sedikit',
        ]);
    });

    it('satu produk per potongan bila jumlahnya sama', () => {
        expect(distribute(['kosong', 'penuh', 'setengah'], 3)).toEqual([
            'kosong',
            'penuh',
            'setengah',
        ]);
    });

    it('beberapa produk per potongan: rata-rata dibulatkan ke bawah', () => {
        expect(distribute(['penuh', 'kosong'], 1)).toEqual(['sedikit']);
        expect(distribute(['penuh', 'setengah'], 1)).toEqual(['setengah']);
        expect(distribute(['penuh', 'penuh', 'sedikit'], 1)).toEqual([
            'setengah',
        ]);
    });

    it('setiap produk masuk tepat satu potongan bila produk lebih banyak', () => {
        const levels = Array.from(
            { length: 23 },
            (_, i) => (['kosong', 'penuh'] as const)[i % 2],
        );

        expect(distribute(levels, 10)).toHaveLength(10);
    });
});

describe('shelfFills (denah toko)', () => {
    it('data contoh menghasilkan isi seperti usulan yang disetujui', () => {
        const fills = shelfFills(
            { rak: RAK_CONTOH, vending: VENDING_CONTOH },
            STORE_SCENE,
        );

        expect(fills).toEqual({
            'rak-a#0': 'setengah',
            'rak-a#1': 'setengah',
            'rak-a#2': 'penuh',
            'rak-a#3': 'sedikit',
            'rak-a#4': 'setengah',
            'rak-b#0': 'penuh',
            'rak-b#1': 'sedikit',
            'rak-b#2': 'sedikit',
            'rak-b#3': 'setengah',
            'rak-b#4': 'sedikit',
            'vending-merah#0': 'sedikit',
            'vending-biru#0': 'setengah',
            'vending-hijau#0': 'sedikit',
        });
    });

    it('toko kosong: semua rak dan vending kosong', () => {
        const fills = shelfFills({ rak: [], vending: [] }, STORE_SCENE);

        expect(Object.keys(fills)).toHaveLength(13);
        expect(new Set(Object.values(fills))).toEqual(new Set(['kosong']));
    });
});

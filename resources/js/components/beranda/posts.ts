/**
 * Tampilan pos Beranda (Tahap 5D-2): label tombol dan sapaan petugas. Pilihan
 * fitur dan hak membukanya datang dari server (`GET /beranda/pos/{pos}`, Gate
 * `open-post`), bukan dari sini. Pos Koperasi ditunda.
 */
import type { PostKey } from '@/diorama/scenes/store-scene';

export type PostInfo = {
    key: PostKey;
    title: string;
    subtitle: string;
    guardName: string;
    greeting: string;
};

export const POSTS: Record<PostKey, PostInfo> = {
    kasir: {
        key: 'kasir',
        title: 'Kasir',
        subtitle: 'Penjualan dan Transaksi',
        guardName: 'Petugas Kasir',
        greeting: 'Selamat datang di pos Kasir. Mau ke mana?',
    },
    inventaris: {
        key: 'inventaris',
        title: 'Inventaris',
        subtitle: 'Stok dan Barang masuk',
        guardName: 'Petugas Inventaris',
        greeting: 'Selamat datang di pos Inventaris. Mau cek apa?',
    },
};

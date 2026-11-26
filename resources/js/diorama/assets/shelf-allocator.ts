/**
 * Penempatan bingkai satu per satu di atlas yang tumbuh saat dipakai (Tahap 5H
 * a2): bingkai karakter dibuat saat pertama dibutuhkan, jadi tempatnya dicari
 * bertahap dengan cara rak (baris kiri ke kanan, pindah baris bila penuh).
 * Murni, supaya bisa dites di Node.
 */
export class ShelfAllocator {
    private x = 0;
    private y = 0;
    private rowH = 0;

    constructor(
        readonly width: number,
        readonly height: number,
        readonly padding = 1,
    ) {}

    /** Tempat bingkai w × h (sudut kiri atas isi, tanpa padding), atau null bila penuh. */
    allocate(w: number, h: number): { x: number; y: number } | null {
        const fw = w + this.padding * 2;
        const fh = h + this.padding * 2;

        if (fw > this.width || fh > this.height) {
            return null;
        }

        if (this.x + fw > this.width) {
            this.x = 0;
            this.y += this.rowH;
            this.rowH = 0;
        }

        if (this.y + fh > this.height) {
            return null;
        }

        const spot = { x: this.x + this.padding, y: this.y + this.padding };
        this.x += fw;
        this.rowH = Math.max(this.rowH, fh);

        return spot;
    }

    /** Kosongkan semua tempat (atlas penuh: mulai lagi dari awal). */
    reset(): void {
        this.x = 0;
        this.y = 0;
        this.rowH = 0;
    }
}

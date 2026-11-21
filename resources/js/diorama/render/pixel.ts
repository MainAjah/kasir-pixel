/**
 * Primitif gambar piksel tajam untuk Canvas 2D (tanpa anti-alias): balok isometrik,
 * titik di permukaan, dan huruf 3 × 5. Sama dengan primitif di halaman rancangan
 * docs/diorama-rancangan.html.
 *
 * Satuan balok: `a` searah gx dan `b` searah gy, satu satuan = 1 px ke samping
 * dan ½ px ke bawah. Satu tile = 32 × 32 satuan.
 */
const fl = Math.floor;

/** Balok isometrik. (ox, oy) = pojok belakang alasnya; h = tinggi dalam px. */
export function isoBox(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    a: number,
    b: number,
    h: number,
    top: string | null,
    left: string | null,
    right: string | null,
): void {
    if (left) {
        ctx.fillStyle = left;

        for (let i = 0; i < a; i++) {
            ctx.fillRect(ox - b + i, oy + fl(b / 2) + fl(i / 2) - h, 1, h + 1);
        }
    }

    if (right) {
        ctx.fillStyle = right;

        for (let j = 0; j < b; j++) {
            ctx.fillRect(
                ox + a - b + j,
                oy + fl((a + b) / 2) - fl(j / 2) - h,
                1,
                h + 1,
            );
        }
    }

    if (top) {
        ctx.fillStyle = top;

        for (let k = -b; k < a; k++) {
            const jmin = Math.max(0, -k);
            const jmax = Math.min(b - 1, a - 1 - k);

            if (jmax < jmin) {
                continue;
            }

            const y0 = oy + fl((k + 2 * jmin) / 2) - h;
            const y1 = oy + fl((k + 2 * jmax) / 2) - h;
            ctx.fillRect(ox + k, y0, 1, y1 - y0 + 1);
        }
    }
}

/** Titik di permukaan atas setinggi h: i searah gx, j searah gy. */
export function topDot(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    h: number,
    i: number,
    j: number,
    color: string,
): void {
    ctx.fillStyle = color;
    ctx.fillRect(ox + i - j, oy + fl((i + j) / 2) - h, 1, 1);
}

/** Titik pada sisi kiri balok (menghadap +gy): kolom i, d = jarak dari tepi atas sisi. */
export function leftDot(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    b: number,
    h: number,
    i: number,
    d: number,
    color: string,
    w = 1,
    hgt = 1,
): void {
    ctx.fillStyle = color;

    for (let k = 0; k < w; k++) {
        ctx.fillRect(
            ox - b + i + k,
            oy + fl(b / 2) + fl((i + k) / 2) - h + d,
            1,
            hgt,
        );
    }
}

/** Titik pada sisi kanan balok (menghadap +gx): kolom j dari kiri ke kanan. */
export function rightDot(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    a: number,
    b: number,
    h: number,
    j: number,
    d: number,
    color: string,
    w = 1,
    hgt = 1,
): void {
    ctx.fillStyle = color;

    for (let k = 0; k < w; k++) {
        ctx.fillRect(
            ox + a - b + j + k,
            oy + fl((a + b) / 2) - fl((j + k) / 2) - h + d,
            1,
            hgt,
        );
    }
}

/** Pojok belakang benda di atas permukaan setinggi h, posisi lokal (u, v) dalam tile. */
export function onTop(
    cx: number,
    ty: number,
    h: number,
    u: number,
    v: number,
): [number, number] {
    return [cx + u - v, ty + fl((u + v) / 2) - h];
}

const FONT: Record<string, string> = {
    '0': '111101101101111',
    '1': '010110010010111',
    '2': '111001111100111',
    '3': '111001111001111',
    '4': '101101111001001',
    '5': '111100111001111',
    '6': '111100111101111',
    '7': '111001001001001',
    '8': '111101111101111',
    '9': '111101111001111',
    '.': '000000000000010',
    '!': '010010010000010',
    '+': '000010111010000',
    '-': '000000111000000',
    x: '000101010101000',
    A: '010101111101101',
    B: '110101110101110',
    E: '111100111100111',
    H: '101101111101101',
    I: '111010010010111',
    K: '101101110101101',
    L: '100100100100111',
    M: '101111111101101',
    N: '101111111111101',
    O: '111101101101111',
    P: '110101110100100',
    R: '110101110101101',
    S: '111100111001111',
    T: '111010010010010',
    U: '101101101101111',
    ' ': '000000000000000',
};

export function textWidth(text: string, scale = 1): number {
    return (
        // Huruf layar hanya ASCII, jadi pemecahan per karakter aman.
        text.split('').reduce((w, ch) => w + (ch === '.' ? 2 : 4), 0) * scale -
        scale
    );
}

/** Tulisan datar 3 × 5 piksel, kiri-atas di (x, y). Huruf yang tidak ada menjadi spasi. */
export function drawText(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string,
    scale = 1,
): void {
    ctx.fillStyle = color;
    let cursor = x;

    for (const ch of text) {
        const glyph = FONT[ch] ?? FONT[ch.toUpperCase()] ?? FONT[' '];
        const shift = ch === '.' ? -1 : 0;

        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 3; c++) {
                if (glyph[r * 3 + c] === '1') {
                    ctx.fillRect(
                        cursor + (c + shift) * scale,
                        y + r * scale,
                        scale,
                        scale,
                    );
                }
            }
        }

        cursor += (ch === '.' ? 2 : 4) * scale;
    }
}

/** 113000 → "113.000" */
export function formatRupiah(value: number): string {
    return Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

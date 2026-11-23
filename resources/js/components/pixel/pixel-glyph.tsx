/**
 * Glif pixel kecil satu warna (warna teks) dari grid teks: '#' = piksel,
 * '.' = kosong. Dipakai ikon aksi dan kartu di halaman tabel (Tahap 5E-2).
 */
export default function PixelGlyph({
    rows,
    scale = 2,
    className,
}: {
    rows: readonly string[];
    scale?: number;
    className?: string;
}) {
    const width = rows[0]?.length ?? 0;

    return (
        <svg
            aria-hidden="true"
            viewBox={`0 0 ${width} ${rows.length}`}
            width={width * scale}
            height={rows.length * scale}
            shapeRendering="crispEdges"
            className={className}
        >
            {rows.flatMap((row, y) =>
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

/** Glif 8 × 8 untuk tombol aksi dan kartu angka. */
export const GLYPHS = {
    // Pensil miring (ubah).
    ubah: [
        '......##',
        '.....###',
        '....###.',
        '...###..',
        '..###...',
        '.###....',
        '##......',
        '###.....',
    ],
    // Kartu dengan diagram batang (kartu stok).
    kartu: [
        '########',
        '#......#',
        '#....#.#',
        '#..#.#.#',
        '#..#.#.#',
        '#.##.#.#',
        '#......#',
        '########',
    ],
    // Kaca pembesar (cari).
    cari: [
        '.####...',
        '#....#..',
        '#....#..',
        '#....#..',
        '#....#..',
        '.####...',
        '.....##.',
        '......##',
    ],
    // Tanda seru dalam segitiga (menipis).
    awas: [
        '...##...',
        '...##...',
        '..####..',
        '..#..#..',
        '.##..##.',
        '.##..##.',
        '##....##',
        '########',
    ],
    // Kotak kosong bersilang (habis).
    habis: [
        '########',
        '##....##',
        '#.#..#.#',
        '#..##..#',
        '#..##..#',
        '#.#..#.#',
        '##....##',
        '########',
    ],
    // Panah turun ke baki (masuk).
    masuk: [
        '...##...',
        '...##...',
        '...##...',
        '.######.',
        '..####..',
        '...##...',
        '#......#',
        '########',
    ],
    // Panah naik dari baki (keluar).
    keluar: [
        '...##...',
        '..####..',
        '.######.',
        '...##...',
        '...##...',
        '...##...',
        '#......#',
        '########',
    ],
    // Tanda tambah.
    tambah: [
        '...##...',
        '...##...',
        '...##...',
        '########',
        '########',
        '...##...',
        '...##...',
        '...##...',
    ],
} as const satisfies Record<string, readonly string[]>;

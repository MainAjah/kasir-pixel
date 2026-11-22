import type { Point } from '@/diorama/engine/iso';

type Props = {
    message: string;
    /** Letak tombol pos di kanvas dasar; pesan muncul tepat di atasnya. */
    anchor: Point;
    scale: number;
};

/**
 * Pesan singkat di diorama saat pos ditolak (misalnya "Pos Inventaris hanya
 * untuk Admin."). Papan kecil berbingkai pixel di atas tombol pos, dibacakan
 * pembaca layar lewat role="status", hilang sendiri.
 */
export default function PostNotice({ message, anchor, scale }: Props) {
    return (
        <div
            role="status"
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full border-[3px] border-[#2b2a33] bg-[#e8907e] px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-[#2b2a33] shadow-[3px_3px_0_#2b2a33]"
            style={{ left: anchor.x * scale, top: anchor.y * scale - 8 }}
        >
            {message}
        </div>
    );
}

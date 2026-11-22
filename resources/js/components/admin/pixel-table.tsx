import type { ReactNode } from 'react';

/**
 * Bingkai pixel sederhana untuk tabel halaman admin (Tahap 6B): tepi tebal
 * bersudut kotak, sisi kanan dan bawah lebih tebal. Mengikuti warna teks tema
 * (terang dan gelap); tema pixel lengkap menyusul di 5E.
 */
export default function PixelTable({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-x-auto border-[3px] border-current text-foreground shadow-[3px_3px_0_currentColor]">
            <table className="w-full text-sm">{children}</table>
        </div>
    );
}

/** Lencana berwarna palet diorama (teks tinta gelap, terbaca di tema terang dan gelap). */
export function Badge({
    tone,
    children,
}: {
    tone: 'hijau' | 'lavender' | 'kunyit' | 'biru' | 'merah-muda' | 'bata';
    children: ReactNode;
}) {
    const bg = {
        hijau: 'bg-[#a7d7a5]',
        lavender: 'bg-[#c9b6e4]',
        kunyit: 'bg-[#f6c56b]',
        biru: 'bg-[#9fd3e6]',
        'merah-muda': 'bg-[#f4b6c2]',
        bata: 'bg-[#e8907e]',
    }[tone];

    return (
        <span
            className={`inline-block border-2 border-[#2b2a33] px-1.5 py-0.5 text-xs leading-none font-semibold whitespace-nowrap text-[#2b2a33] ${bg}`}
        >
            {children}
        </span>
    );
}

/** Lencana peran: Admin kunyit, Kasir biru, Bendahara merah muda. */
export function RoleBadge({
    role,
    label,
}: {
    role: string | null;
    label: string;
}) {
    const tone =
        role === 'admin' ? 'kunyit' : role === 'kasir' ? 'biru' : 'merah-muda';

    return <Badge tone={tone}>{label}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
    return active ? (
        <Badge tone="hijau">Aktif</Badge>
    ) : (
        <Badge tone="lavender">Nonaktif</Badge>
    );
}

export const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    kasir: 'Kasir',
    bendahara: 'Bendahara',
};

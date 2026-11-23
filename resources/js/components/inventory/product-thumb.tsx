import PixelIcon from '@/components/beranda/pixel-icon';

/**
 * Gambar kecil barang di baris tabel (Tahap 5E-2): gambar unggahan admin,
 * atau ikon kardus sebagai pengganti bila belum ada.
 */
export default function ProductThumb({ url }: { url: string | null }) {
    return (
        <span className="grid size-10 shrink-0 place-items-center border-2 border-px-lantai bg-px-krem">
            {url ? (
                <img
                    src={url}
                    alt=""
                    aria-hidden="true"
                    className="max-h-8 max-w-8 object-contain [image-rendering:pixelated]"
                />
            ) : (
                <PixelIcon name="produk" scale={2} />
            )}
        </span>
    );
}

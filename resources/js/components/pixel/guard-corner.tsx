import BigPortrait from '@/components/beranda/big-portrait';
import type { PostKey } from '@/diorama/scenes/store-scene';

/**
 * Penjaga pos di pojok kanan bawah halaman (Tahap 5E-2): potret yang sama
 * dengan di Beranda, dicerminkan supaya menghadap ke isi halaman. Hanya hiasan;
 * disembunyikan di layar sempit.
 */
export default function GuardCorner({ post }: { post: PostKey }) {
    return (
        <div
            className="pointer-events-none hidden shrink-0 sm:block"
            aria-hidden="true"
        >
            <BigPortrait post={post} size={130} capHeight={150} flip />
        </div>
    );
}

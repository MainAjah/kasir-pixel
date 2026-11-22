import { formatRupiah } from '@/diorama/render/pixel';
import { C } from '@/diorama/sprites/palette';
import { PIXEL_FRAME } from './pixel-frame';
import PixelText from './pixel-text';

export type TodaySummary = {
    sales_total: number;
    sales_count: number;
    low_stock: number;
};

type Props = {
    today: TodaySummary;
};

/** Kartu kecil "Hari Ini" yang melayang di kiri atas Beranda. */
export default function TodayCard({ today }: Props) {
    const low = today.low_stock;

    return (
        <section
            aria-label="Hari ini"
            className={`${PIXEL_FRAME} w-56 px-3 pt-2.5 pb-3 text-[#2b2a33]`}
        >
            <PixelText
                text="HARI INI"
                color={C(13)}
                scale={3}
                className="mb-2.5 block"
            />

            <dl className="space-y-2">
                <div>
                    <dt className="text-xs text-[#5b5470]">Penjualan</dt>
                    <dd>
                        <PixelText
                            text={`RP ${formatRupiah(today.sales_total)}`}
                            color={C(1)}
                            scale={3}
                        />
                    </dd>
                </div>

                <div className="flex items-end justify-between gap-3 border-t-2 border-dashed border-[#d9c7a3] pt-2">
                    <div>
                        <dt className="text-xs text-[#5b5470]">Transaksi</dt>
                        <dd>
                            <PixelText
                                text={String(today.sales_count)}
                                color={C(1)}
                                scale={3}
                            />
                        </dd>
                    </div>
                    <div className="text-right">
                        <dt className="text-xs text-[#5b5470]">Stok menipis</dt>
                        <dd className="flex justify-end">
                            <PixelText
                                text={String(low)}
                                color={low > 0 ? C(15) : C(10)}
                                scale={3}
                            />
                        </dd>
                    </div>
                </div>
            </dl>
        </section>
    );
}

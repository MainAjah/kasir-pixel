import PixelIcon from '@/components/beranda/pixel-icon';
import { PIXEL_ICONS } from '@/components/beranda/pixel-icons';
import type { PixelIconName } from '@/components/beranda/pixel-icons';
import PixelText from '@/components/beranda/pixel-text';
import TodayCard from '@/components/beranda/today-card';
import { C } from '@/diorama/sprites/palette';

const NAMES = Object.keys(PIXEL_ICONS) as PixelIconName[];

/** Pratinjau 4× ikon menu dan huruf kartu "Hari Ini" Beranda (Tahap 5D-1). */
export default function BerandaLab() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-6">
                {NAMES.map((name) => (
                    <figure key={name} className="space-y-1 text-center">
                        <PixelIcon
                            name={name}
                            scale={4}
                            className="bg-[#f7f1e3]"
                        />
                        <figcaption className="text-xs text-muted-foreground">
                            {name}
                        </figcaption>
                    </figure>
                ))}
            </div>
            <div className="flex flex-wrap items-start gap-8">
                <div className="space-y-3 bg-[#f7f1e3] p-3">
                    <PixelText
                        text="HARI INI"
                        color={C(13)}
                        scale={4}
                        className="block"
                    />
                    <PixelText
                        text="RP 1.250.500"
                        color={C(1)}
                        scale={4}
                        className="block"
                    />
                    <PixelText
                        text="12  8"
                        color={C(15)}
                        scale={4}
                        className="block"
                    />
                </div>
                <TodayCard
                    today={{
                        sales_total: 1250500,
                        sales_count: 12,
                        low_stock: 8,
                    }}
                />
            </div>
        </div>
    );
}

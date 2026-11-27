import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { nextTabIndex } from './logic';
import '../../../css/hd2d.css';

export type HdTabItem = {
    value: string;
    label: ReactNode;
    /** Angka kecil di samping label, mis. jumlah barang per kategori. */
    count?: number;
    disabled?: boolean;
};

export const hdTabId = (baseId: string, value: string) =>
    `${baseId}-tab-${value}`;
export const hdTabPanelId = (baseId: string) => `${baseId}-panel`;

type Props = {
    /** Dasar id tab; panel isinya memakai `hdTabPanelId(id)`. */
    id: string;
    /** Nama daftar tab untuk pembaca layar. */
    label: string;
    items: readonly HdTabItem[];
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
};

/**
 * Tab bergaya menu game (Tahap B1): berlian kecil di depan label, berlian penuh
 * dan garis emas untuk tab aktif. Panah kiri/kanan, Home, End berpindah tab
 * (pola WAI-ARIA tablist), hanya tab aktif yang masuk urutan Tab.
 */
export default function HdTabs({
    id,
    label,
    items,
    value,
    onValueChange,
    className,
}: Props) {
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    const disabled = items.map((item) => !!item.disabled);
    const selectedIndex = items.findIndex((item) => item.value === value);
    const focusIndex =
        selectedIndex >= 0 ? selectedIndex : disabled.indexOf(false);

    const onKeyDown = (event: KeyboardEvent, index: number) => {
        const next = nextTabIndex(index, event.key, items.length, disabled);

        if (next === null || next === index) {
            return;
        }

        event.preventDefault();
        buttons.current[next]?.focus();
        onValueChange(items[next].value);
    };

    return (
        <div
            role="tablist"
            aria-label={label}
            className={cn('hd-tab-daftar', className)}
        >
            {items.map((item, index) => (
                <button
                    key={item.value}
                    ref={(el) => {
                        buttons.current[index] = el;
                    }}
                    type="button"
                    role="tab"
                    id={hdTabId(id, item.value)}
                    aria-selected={item.value === value}
                    aria-controls={hdTabPanelId(id)}
                    tabIndex={index === focusIndex ? 0 : -1}
                    disabled={item.disabled}
                    className="hd-tab"
                    onClick={() => onValueChange(item.value)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                >
                    {item.label}
                    {item.count !== undefined && (
                        <span className="hd-tab__jumlah">{item.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

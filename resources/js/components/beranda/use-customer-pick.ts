import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point } from '@/diorama/engine/iso';
import { customerAt, customerHead } from '@/diorama/engine/pick';
import type { DioramaWorld } from '@/diorama/engine/world';
import { customerInfo } from '@/diorama/render/customer-info';
import type { CustomerInfo } from '@/diorama/render/customer-info';

/** Lama kartu pelanggan tampil bila tidak ditutup (ms). */
export const CARD_MS = 8000;

/**
 * Klik pelanggan (Tahap 5D-2): kartu barang yang dibeli muncul di atas kepala
 * pelanggan yang diklik; klik di tempat kosong menutupnya.
 */
export function useCustomerPick(world: DioramaWorld) {
    const [card, setCard] = useState<{
        info: CustomerInfo;
        anchor: Point;
    } | null>(null);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const close = useCallback(() => {
        window.clearTimeout(timer.current);
        setCard(null);
    }, []);

    const pick = useCallback(
        (point: Point) => {
            const customer = customerAt(world.customers, point);

            if (!customer) {
                close();

                return;
            }

            window.clearTimeout(timer.current);
            setCard({
                info: customerInfo(world, customer),
                anchor: customerHead(customer),
            });
            timer.current = window.setTimeout(() => setCard(null), CARD_MS);
        },
        [world, close],
    );

    const isClickable = useCallback(
        (point: Point) => customerAt(world.customers, point) !== null,
        [world],
    );

    return { card, pick, isClickable, close };
}

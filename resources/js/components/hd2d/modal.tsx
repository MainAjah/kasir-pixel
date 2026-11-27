import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HdCorners } from './panel';
import '../../../css/hd2d.css';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    /** Tombol di kaki modal, rata kanan. */
    footer?: ReactNode;
    className?: string;
};

/**
 * Modal HD-2D (Tahap B1) di atas Radix Dialog: fokus terkunci di dalam,
 * Esc dan tombol silang menutup, fokus kembali ke pemicu. Panel pekat dengan
 * garis emas ganda; muncul dengan skala kecil 220 ms (mati bila gerak dikurangi).
 */
export default function HdModal({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className,
}: Props) {
    // Modal dibuka dari state (tanpa Dialog.Trigger), jadi Radix tidak tahu
    // pemicunya: simpan elemen yang fokus saat dibuka dan kembalikan saat ditutup.
    const returnFocus = useRef<HTMLElement | null>(null);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="hd-tirai" />
                <Dialog.Content
                    className={cn(
                        'hd-panel hd-panel--pekat hd-modal hd-akar',
                        className,
                    )}
                    {...(description ? {} : { 'aria-describedby': undefined })}
                    onOpenAutoFocus={() => {
                        returnFocus.current =
                            document.activeElement instanceof HTMLElement
                                ? document.activeElement
                                : null;
                    }}
                    onCloseAutoFocus={(event) => {
                        if (returnFocus.current?.isConnected) {
                            event.preventDefault();
                            returnFocus.current.focus();
                        }
                    }}
                >
                    <HdCorners />
                    <header className="hd-panel__kepala pr-10">
                        <div className="min-w-0">
                            <Dialog.Title className="hd-judul hd-panel__judul">
                                {title}
                            </Dialog.Title>
                            {description && (
                                <Dialog.Description className="hd-panel__keterangan">
                                    {description}
                                </Dialog.Description>
                            )}
                        </div>
                    </header>
                    {children}
                    {footer && <div className="hd-modal__kaki">{footer}</div>}
                    <Dialog.Close
                        className="hd-modal__tutup"
                        aria-label="Tutup"
                    >
                        <X aria-hidden="true" className="size-4" />
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

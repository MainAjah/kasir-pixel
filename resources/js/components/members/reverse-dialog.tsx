import { useForm } from '@inertiajs/react';
import SavingsController from '@/actions/App/Http/Controllers/Members/SavingsController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/format';
import type { LedgerEntry } from '@/types';

/** Dialog alasan pembalikan. Aturan (sekali, saldo tidak minus) dijaga server. */
export default function ReverseDialog({
    entry,
    open,
    onClose,
}: {
    entry: LedgerEntry | null;
    open: boolean;
    onClose: () => void;
}) {
    const form = useForm({ reason: '' });

    function close() {
        form.reset();
        form.clearErrors();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && close()}>
            <DialogContent>
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!entry) {
                            return;
                        }
                        form.submit(SavingsController.reverse(entry.id), {
                            preserveScroll: true,
                            onSuccess: close,
                        });
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Balik {entry?.number}?</DialogTitle>
                        <DialogDescription>
                            {entry &&
                                `${entry.entry_label} ${entry.type_label} ${formatRupiah(entry.amount)}. `}
                            Baris lama tidak diubah; baris pembalik ditambahkan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="reverse_reason">Alasan</Label>
                        <Input
                            id="reverse_reason"
                            autoFocus
                            value={form.data.reason}
                            onChange={(e) =>
                                form.setData('reason', e.target.value)
                            }
                        />
                        <InputError message={form.errors.reason} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={close}>
                            Tidak jadi
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={
                                form.processing ||
                                form.data.reason.trim() === ''
                            }
                        >
                            Balik transaksi
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

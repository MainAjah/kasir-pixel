import { useForm } from '@inertiajs/react';
import MemberExitController from '@/actions/App/Http/Controllers/Members/MemberExitController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { formatRupiah } from '@/lib/format';

/** Konfirmasi keluar anggota. Penarikan semua saldo dilakukan server dalam satu transaksi. */
export default function ExitMemberDialog({
    memberId,
    memberName,
    total,
}: {
    memberId: number;
    memberName: string;
    total: number;
}) {
    const form = useForm({});

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Keluar anggota</Button>
            </DialogTrigger>
            <DialogContent>
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.submit(MemberExitController.store(memberId));
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Keluarkan {memberName}?</DialogTitle>
                        <DialogDescription>
                            Seluruh saldo simpanan ({formatRupiah(total)})
                            ditarik dan keanggotaan ditutup. Setelah itu tidak
                            ada setoran atau penarikan baru, dan anggota tidak
                            bisa bergabung kembali.
                        </DialogDescription>
                    </DialogHeader>
                    <InputError
                        message={(form.errors as Record<string, string>).exit}
                    />
                    <DialogFooter>
                        <Button
                            variant="destructive"
                            disabled={form.processing}
                        >
                            Ya, keluarkan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

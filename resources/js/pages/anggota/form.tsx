import { Head } from '@inertiajs/react';
import MemberController from '@/actions/App/Http/Controllers/Members/MemberController';
import Heading from '@/components/heading';
import MemberForm from '@/components/members/member-form';

type MemberData = {
    id: number;
    number: string;
    name: string;
    phone: string | null;
    address: string | null;
    joined_at: string;
    status: string;
};

export default function AnggotaFormPage({
    member,
}: {
    member: MemberData | null;
}) {
    return (
        <>
            <Head title={member ? 'Ubah anggota' : 'Anggota baru'} />

            <div className="space-y-6 p-4">
                <Heading
                    title={member ? `Ubah ${member.name}` : 'Anggota baru'}
                    description={
                        member
                            ? 'Nama dan kontak. Nomor, tanggal bergabung, dan status tidak bisa diubah di sini.'
                            : 'Nomor anggota dibuat otomatis. Simpanan pokok dicatat terpisah di buku simpanan.'
                    }
                />
                <MemberForm member={member} />
            </div>
        </>
    );
}

AnggotaFormPage.layout = {
    breadcrumbs: [
        { title: 'Anggota', href: MemberController.index() },
        { title: 'Formulir', href: MemberController.index() },
    ],
};

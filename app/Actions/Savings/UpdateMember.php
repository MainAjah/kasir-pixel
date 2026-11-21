<?php

namespace App\Actions\Savings;

use App\Actions\Activity\LogActivity;
use App\Exceptions\SavingsException;
use App\Models\Member;

class UpdateMember
{
    public function __construct(private LogActivity $logActivity) {}

    /**
     * Ubah nama dan kontak. Nomor anggota, tanggal bergabung, dan status tidak bisa diubah di sini
     * (status berubah hanya lewat ExitMember).
     *
     * @param  array{name: string, phone?: string|null, address?: string|null}  $data
     */
    public function handle(Member $member, array $data, int $userId): Member
    {
        $name = trim($data['name'] ?? '');
        if ($name === '') {
            throw SavingsException::invalid('Nama anggota wajib diisi.');
        }

        $member->fill([
            'name' => $name,
            'phone' => trim((string) ($data['phone'] ?? '')) ?: null,
            'address' => trim((string) ($data['address'] ?? '')) ?: null,
        ]);

        $changes = $member->getDirty();

        if ($changes !== []) {
            $member->save();
            $this->logActivity->handle('member.updated', $member, $changes, $userId);
        }

        return $member;
    }
}

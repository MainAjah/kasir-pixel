<?php

namespace App\Actions\Users;

use App\Actions\Activity\LogActivity;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Tambah atau ubah pengguna oleh admin (Tahap 6B): nama, email, peran, dan
 * kata sandi (wajib saat tambah, opsional saat ubah). Penggantian peran lewat
 * ChangeUserRole, jadi aturannya sama dengan halaman Hak akses.
 */
class SaveUser
{
    public function __construct(
        private ChangeUserRole $changeRole,
        private LogActivity $logActivity,
    ) {}

    /**
     * @param  array{name: string, email: string, role: string, password?: string|null}  $data
     */
    public function handle(?User $user, array $data, User $actor): User
    {
        $role = Role::from($data['role']);

        return DB::transaction(function () use ($user, $data, $role, $actor) {
            if ($user === null) {
                $user = new User;
                $user->forceFill([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => $data['password'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ])->save();
                $user->assignRole($role->value);

                $this->logActivity->handle('user.created', $user, ['email' => $user->email, 'role' => $role->value], $actor->id);

                return $user;
            }

            $this->changeRole->handle($user, $role, $actor);

            $user->fill(['name' => $data['name'], 'email' => $data['email']]);

            if (! empty($data['password'])) {
                $user->password = $data['password'];
            }

            $changed = array_keys($user->getDirty());
            $user->save();

            if ($changed !== []) {
                // Kata sandi tidak pernah dicatat, hanya bahwa ia diganti.
                $this->logActivity->handle('user.updated', $user, ['fields' => $changed], $actor->id);
            }

            return $user;
        });
    }
}

<?php

namespace App\Actions\Users;

use App\Actions\Activity\LogActivity;
use App\Enums\Role;
use App\Exceptions\UserException;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Menonaktifkan atau mengaktifkan pengguna (Tahap 6B). Tidak pernah menghapus.
 * Pengguna nonaktif tidak bisa masuk dan sesinya dikeluarkan (EnsureUserIsActive).
 *
 * Aturan: admin tidak bisa menonaktifkan dirinya sendiri, dan admin aktif
 * terakhir tidak bisa dinonaktifkan. Kasir dengan shift terbuka boleh
 * dinonaktifkan (keputusan pemilik); shift-nya tetap terbuka.
 */
class SetUserActive
{
    public function __construct(private LogActivity $logActivity) {}

    public function handle(User $user, bool $active, User $actor): User
    {
        if ($user->is_active === $active) {
            return $user;
        }

        if (! $active && $user->is($actor)) {
            throw UserException::cannotDeactivateSelf();
        }

        return DB::transaction(function () use ($user, $active, $actor) {
            if (! $active && $user->hasRole(Role::Admin->value) && ChangeUserRole::activeAdminCount() <= 1) {
                throw UserException::lastAdmin();
            }

            $user->forceFill(['is_active' => $active])->save();

            $this->logActivity->handle($active ? 'user.activated' : 'user.deactivated', $user, [], $actor->id);

            return $user;
        });
    }
}

<?php

namespace App\Actions\Users;

use App\Actions\Activity\LogActivity;
use App\Enums\Role;
use App\Exceptions\UserException;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Mengganti peran seorang pengguna (Tahap 6B). Satu pengguna satu peran, dan
 * hanya peran yang sudah ada (tidak pernah membuat peran baru).
 *
 * Aturan: admin tidak bisa mengganti peran sendiri, dan admin aktif terakhir
 * tidak bisa diganti perannya (selalu harus ada admin aktif).
 */
class ChangeUserRole
{
    public function __construct(private LogActivity $logActivity) {}

    public function handle(User $user, Role $role, User $actor): void
    {
        $current = $user->getRoleNames()->first();

        if ($current === $role->value) {
            return;
        }

        if ($user->is($actor)) {
            throw UserException::cannotChangeOwnRole();
        }

        DB::transaction(function () use ($user, $role, $actor, $current) {
            if ($current === Role::Admin->value && $user->is_active && self::activeAdminCount() <= 1) {
                throw UserException::lastAdmin();
            }

            $user->syncRoles([$role->value]);

            $this->logActivity->handle('user.role_changed', $user, ['from' => $current, 'to' => $role->value], $actor->id);
        });
    }

    /** Jumlah admin yang masih aktif. */
    public static function activeAdminCount(): int
    {
        return User::role(Role::Admin->value)
            ->where('is_active', true)
            ->count();
    }
}

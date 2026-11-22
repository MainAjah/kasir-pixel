<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Users\ChangeUserRole;
use App\Enums\Role;
use App\Exceptions\UserException;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AccessMap;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Hak akses (Tahap 6B): peran yang ada, apa yang bisa dibuka tiap peran
 * (AccessMap, hanya baca), dan mengganti peran seorang pengguna. Hanya admin.
 * Peran tidak pernah ditambah atau dihapus dari sini.
 */
class AccessController extends Controller
{
    public function index(Request $request): Response
    {
        $existing = SpatieRole::query()->where('guard_name', 'web')->pluck('name')->all();

        $roles = collect(Role::cases())
            ->filter(fn (Role $r) => in_array($r->value, $existing, true))
            ->map(fn (Role $r) => [
                'value' => $r->value,
                'label' => $r->label(),
                'users' => User::role($r->value)->count(),
                'active_users' => User::role($r->value)->where('is_active', true)->count(),
            ])
            ->values();

        $rows = array_map(fn (array $row) => [
            'key' => $row['key'],
            'label' => $row['label'],
            'roles' => array_map(fn (Role $r) => $r->value, $row['roles']),
        ], AccessMap::rows());

        $users = User::query()
            ->with('roles:id,name')
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->roles->first()?->name,
                'is_active' => $u->is_active,
                'is_self' => $u->is($request->user()),
            ]);

        return Inertia::render('hak-akses/index', [
            'roles' => $roles,
            'rows' => $rows,
            'users' => $users,
        ]);
    }

    public function update(Request $request, User $user, ChangeUserRole $action): RedirectResponse
    {
        $data = $request->validate([
            'role' => ['required', Rule::enum(Role::class), Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ]);

        try {
            $action->handle($user, Role::from($data['role']), $request->user());
        } catch (UserException $e) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $e->getMessage()]);

            return back();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Peran {$user->name} menjadi ".Role::from($data['role'])->label().'.']);

        return back();
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Users\SaveUser;
use App\Actions\Users\SetUserActive;
use App\Enums\Role;
use App\Exceptions\UserException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Kelola pengguna (Tahap 6B): hanya admin, dijaga rute `role:admin`. */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::query()
            ->with('roles:id,name')
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->paginate(20)
            ->through(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->roles->first()?->name,
                'role_label' => Role::tryFrom((string) $u->roles->first()?->name)?->label() ?? '-',
                'is_active' => $u->is_active,
                'is_self' => $u->is($request->user()),
            ]);

        return Inertia::render('pengguna/index', ['users' => $users]);
    }

    public function create(): Response
    {
        return Inertia::render('pengguna/form', ['user' => null, 'roles' => self::roleOptions()]);
    }

    public function store(UserRequest $request, SaveUser $action): RedirectResponse
    {
        $user = $action->handle(null, $request->validated(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pengguna {$user->name} ditambahkan."]);

        return to_route('users.index');
    }

    public function edit(Request $request, User $user): Response
    {
        return Inertia::render('pengguna/form', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleNames()->first(),
                'is_self' => $user->is($request->user()),
            ],
            'roles' => self::roleOptions(),
        ]);
    }

    public function update(UserRequest $request, User $user, SaveUser $action): RedirectResponse
    {
        try {
            $action->handle($user, $request->validated(), $request->user());
        } catch (UserException $e) {
            return back()->withErrors(['role' => $e->getMessage()])->withInput();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pengguna {$user->name} diperbarui."]);

        return to_route('users.index');
    }

    public function deactivate(Request $request, User $user, SetUserActive $action): RedirectResponse
    {
        return $this->setActive($request, $user, false, $action);
    }

    public function activate(Request $request, User $user, SetUserActive $action): RedirectResponse
    {
        return $this->setActive($request, $user, true, $action);
    }

    private function setActive(Request $request, User $user, bool $active, SetUserActive $action): RedirectResponse
    {
        try {
            $action->handle($user, $active, $request->user());
        } catch (UserException $e) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $e->getMessage()]);

            return back();
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $active ? "{$user->name} diaktifkan." : "{$user->name} dinonaktifkan.",
        ]);

        return back();
    }

    /** @return list<array{value: string, label: string}> */
    public static function roleOptions(): array
    {
        return array_map(fn (Role $r) => ['value' => $r->value, 'label' => $r->label()], Role::cases());
    }
}

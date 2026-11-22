<?php

namespace App\Http\Requests\Admin;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Tambah atau ubah pengguna (Tahap 6B). Hanya admin (dijaga rute). */
class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var User|null $user */
        $user = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => [
                'required', 'string', 'lowercase', 'email', 'max:150',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            // Hanya peran yang sudah ada; tidak pernah membuat peran baru.
            'role' => ['required', Rule::enum(Role::class), Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'password' => $user === null
                ? ['required', 'string', 'confirmed', Password::defaults()]
                : ['nullable', 'string', 'confirmed', Password::defaults()],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nama',
            'role' => 'peran',
            'password' => 'kata sandi',
        ];
    }
}

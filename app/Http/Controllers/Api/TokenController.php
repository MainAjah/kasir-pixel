<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\TokenRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Token REST API (Tahap 10) untuk klien di luar browser, misalnya Postman.
 * Aturan masuk sama dengan login biasa: akun nonaktif atau terhapus ditolak.
 */
class TokenController extends Controller
{
    public function store(TokenRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = User::where('email', $data['email'])->first();

        if ($user === null || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Email atau kata sandi salah.']);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'Akun Anda dinonaktifkan.']);
        }

        $token = $user->createToken($data['device_name'] ?? 'api')->plainTextToken;
        $role = Role::tryFrom((string) $user->getRoleNames()->first());

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role?->value,
                'role_label' => $role?->label(),
            ],
        ], 201);
    }

    /** Cabut token yang sedang dipakai. Panggilan lewat sesi browser tidak punya token. */
    public function destroy(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Token dicabut.']);
    }
}

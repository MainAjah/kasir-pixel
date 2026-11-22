<?php

namespace App\Http\Controllers;

use App\Enums\Post;
use App\Enums\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Membuka pos di Beranda (Tahap 5D-2). Pilihan fitur hanya dikirim bila peran
 * pengguna boleh membuka pos itu (Gate `open-post`); selain itu 403 dengan pesan
 * singkat untuk diorama. Hanya membaca.
 *
 * Tiap pilihan membawa `note` untuk yang nonaktif: "segera hadir" bila halamannya
 * belum ada, "khusus admin" bila pilihan itu hanya untuk admin (Tahap 6C).
 */
class DashboardPostController extends Controller
{
    public function __invoke(Request $request, Post $post): JsonResponse
    {
        Gate::authorize('open-post', $post);

        $isAdmin = $request->user()->hasRole(Role::Admin->value);

        return response()->json([
            'key' => $post->value,
            'options' => array_map(function (array $option) use ($isAdmin) {
                $note = match (true) {
                    $option['route'] === null => 'segera hadir',
                    ($option['admin_only'] ?? false) && ! $isAdmin => 'khusus admin',
                    default => null,
                };

                return [
                    'label' => $option['label'],
                    'href' => $note === null ? route($option['route'], absolute: false) : null,
                    'note' => $note,
                ];
            }, $post->options()),
        ]);
    }
}

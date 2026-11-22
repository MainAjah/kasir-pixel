<?php

namespace App\Http\Controllers;

use App\Enums\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * Membuka pos di Beranda (Tahap 5D-2). Pilihan fitur hanya dikirim bila peran
 * pengguna boleh membuka pos itu (Gate `open-post`); selain itu 403 dengan pesan
 * singkat untuk diorama. Hanya membaca.
 */
class DashboardPostController extends Controller
{
    public function __invoke(Post $post): JsonResponse
    {
        Gate::authorize('open-post', $post);

        return response()->json([
            'key' => $post->value,
            'options' => array_map(fn (array $option) => [
                'label' => $option['label'],
                'href' => $option['route'] === null ? null : route($option['route'], absolute: false),
            ], $post->options()),
        ]);
    }
}

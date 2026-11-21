<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pencarian anggota untuk layar kasir. Hanya baca, hanya anggota aktif, dan hanya
 * id, nomor, dan nama: kasir tidak melihat saldo, telepon, atau alamat.
 */
class MemberLookupController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if ($q === '') {
            return response()->json([]);
        }

        $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q).'%';

        $members = Member::query()
            ->active()
            ->where(fn ($query) => $query->where('member_number', 'like', $like)->orWhere('name', 'like', $like))
            ->orderBy('name')
            ->limit(8)
            ->get(['id', 'member_number', 'name']);

        return response()->json($members->map(fn (Member $m) => [
            'id' => $m->id,
            'number' => $m->member_number,
            'name' => $m->name,
        ])->values());
    }
}

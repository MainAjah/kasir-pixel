<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mengeluarkan pengguna yang dinonaktifkan saat sesinya masih berjalan
 * (termasuk yang masuk lewat passkey). Untuk REST API (Tahap 10) menjawab
 * 403 JSON, baik lewat token maupun lewat sesi layar kasir.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ! $user->is_active) {
            if ($request->hasSession()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            if ($request->is('api/*')) {
                return response()->json(['message' => 'Akun Anda dinonaktifkan.'], 403);
            }

            return redirect()->route('login')->with('status', 'Akun Anda dinonaktifkan.');
        }

        return $next($request);
    }
}

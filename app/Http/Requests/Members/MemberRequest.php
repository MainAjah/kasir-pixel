<?php

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;

class MemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Dijaga middleware role di rute.
    }

    /**
     * Hanya nama, kontak, dan tanggal bergabung (saat membuat). Nomor dan status tidak bisa diisi dari form.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'joined_at' => ['nullable', 'date'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nama',
            'phone' => 'telepon',
            'address' => 'alamat',
            'joined_at' => 'tanggal bergabung',
        ];
    }
}

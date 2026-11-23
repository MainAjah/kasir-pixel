<?php

namespace App\Actions\Inventory;

use App\Actions\Activity\LogActivity;
use App\Models\Product;
use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Pasang, ganti, atau lepas gambar barang. Berkas disimpan di disk "public"
 * (folder produk/) dengan nama acak supaya browser tidak memakai gambar lama;
 * berkas lama dihapus. Hanya tampilan: harga, stok, dan satuan tidak disentuh.
 */
class SetProductImage
{
    public function __construct(private LogActivity $logActivity) {}

    public function handle(Product $product, UploadedFile|File $file, int $userId): Product
    {
        $extension = strtolower($file instanceof UploadedFile
            ? ($file->getClientOriginalExtension() ?: $file->extension())
            : $file->extension()) ?: 'png';
        $path = Storage::disk('public')->putFileAs(
            'produk',
            $file,
            $product->id.'-'.Str::lower(Str::random(8)).'.'.$extension,
        );

        $old = $product->image_path;
        $product->forceFill(['image_path' => $path])->save();

        if ($old !== null && $old !== $path) {
            Storage::disk('public')->delete($old);
        }

        $this->logActivity->handle('product.image_set', $product, ['image_path' => $path], $userId);

        return $product;
    }

    public function remove(Product $product, int $userId): Product
    {
        if ($product->image_path === null) {
            return $product;
        }

        Storage::disk('public')->delete($product->image_path);
        $product->forceFill(['image_path' => null])->save();

        $this->logActivity->handle('product.image_removed', $product, [], $userId);

        return $product;
    }
}

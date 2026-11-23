<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Inventory\SetProductImage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\ProductImageRequest;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Gambar barang untuk kartu kasir dan rak diorama (hanya admin). */
class ProductImageController extends Controller
{
    public function store(ProductImageRequest $request, Product $product, SetProductImage $action): RedirectResponse
    {
        $action->handle($product, $request->file('image'), $request->user()->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Gambar barang disimpan.']);

        return to_route('products.edit', $product);
    }

    public function destroy(Request $request, Product $product, SetProductImage $action): RedirectResponse
    {
        $action->remove($product, $request->user()->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Gambar barang dilepas.']);

        return to_route('products.edit', $product);
    }
}

<?php

namespace App\Http\Controllers\Inventory;

use App\Actions\Inventory\InventoryStats;
use App\Actions\Inventory\SaveProduct;
use App\Actions\Inventory\SetProductImage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request, InventoryStats $stats): Response
    {
        $search = trim((string) $request->query('q', ''));
        $low = $request->boolean('menipis');

        $products = Product::query()
            ->withStock()
            ->with(['category:id,name', 'baseUnit:id,product_id,name,sell_price'])
            ->when($search !== '', fn ($q) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhereHas('units', fn ($u) => $u->where('barcode', $search));
            }))
            ->when($low, fn ($q) => $q->lowStock())
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Product $p) => [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'image_url' => $p->imageUrl(),
                'category' => $p->category?->name,
                'stock' => $p->stock ?? 0,
                'min_stock' => $p->min_stock,
                'is_active' => $p->is_active,
                'base_unit' => $p->baseUnit?->name,
                'base_price' => $p->baseUnit?->sell_price,
                'is_low' => ($p->stock ?? 0) <= $p->min_stock,
            ]);

        return Inertia::render('inventaris/produk/index', [
            // Tahap 5E-2: kartu angka di kepala halaman Inventaris (hanya membaca).
            'stats' => $stats->handle(),
            'products' => $products,
            'filters' => ['q' => $search, 'menipis' => $low],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('inventaris/produk/form', [
            'product' => null,
            'categories' => $this->categories(),
        ]);
    }

    public function store(ProductRequest $request, SaveProduct $action, SetProductImage $image): RedirectResponse
    {
        $product = $action->handle(null, $request->safe()->except('image'), $request->user()->id);

        // Tahap 6D: gambar yang dipilih di form tambah dipasang setelah produk tersimpan.
        if ($request->hasFile('image')) {
            $image->handle($product, $request->file('image'), $request->user()->id);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produk disimpan.']);

        return to_route('products.edit', $product);
    }

    public function edit(Product $product): Response
    {
        $product->load('units');
        $locked = $product->hasMovements();

        return Inertia::render('inventaris/produk/form', [
            'product' => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category_id' => $product->category_id,
                'min_stock' => $product->min_stock,
                'is_active' => $product->is_active,
                'image_url' => $product->imageUrl(),
                'has_movements' => $locked,
                'units' => $product->units->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'conversion' => $u->conversion,
                    'sell_price' => $u->sell_price,
                    'barcode' => $u->barcode,
                    'is_base' => $u->is_base,
                    'in_use' => $u->isInUse(),
                ])->values(),
            ],
            'categories' => $this->categories(),
        ]);
    }

    public function update(ProductRequest $request, Product $product, SaveProduct $action): RedirectResponse
    {
        // Gambar saat mengubah tetap lewat ProductImageController (bagian "Gambar barang").
        $action->handle($product, $request->safe()->except('image'), $request->user()->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produk diperbarui.']);

        return to_route('products.edit', $product);
    }

    /** @return array<int, array{id: int, name: string}> */
    private function categories(): array
    {
        return Category::orderBy('name')->get(['id', 'name'])->toArray();
    }
}

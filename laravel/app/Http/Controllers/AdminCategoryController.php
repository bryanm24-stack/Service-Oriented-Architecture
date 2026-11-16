<?php

namespace App\Http\Controllers;

use App\Http\Requests\CategoryCatalogRequest;
use App\Services\FinanceApi;

final class AdminCategoryController extends Controller
{
    public function index(FinanceApi $api)
    {
        return view('admin.categories.index', ['categories' => $api->categories()]);
    }

    public function create()
    {
        return view('admin.categories.form', ['category' => null]);
    }

    public function store(CategoryCatalogRequest $request, FinanceApi $api)
    {
        $api->createCategory(['name' => $request->validated('name'), 'icon' => $request->validated('icon')]);

        return to_route('admin.categories.index')->with('success', 'Kategori ditambahkan.');
    }

    public function edit(int $id, FinanceApi $api)
    {
        return view('admin.categories.form', ['category' => $api->category($id)]);
    }

    public function update(int $id, CategoryCatalogRequest $request, FinanceApi $api)
    {
        $api->replaceCategory($id, ['name' => $request->validated('name'), 'icon' => $request->validated('icon')]);

        return to_route('admin.categories.index')->with('success', 'Kategori diperbarui.');
    }

    public function destroy(int $id, FinanceApi $api)
    {
        $api->deleteCategory($id);

        return to_route('admin.categories.index')->with('success', 'Kategori dihapus.');
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\TokenBundleRequest;
use App\Services\TokenApi;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

final class AdminTokenBundleController extends Controller
{
    public function index(Request $request, TokenApi $api)
    {
        $values = $request->validate(['status' => ['nullable', 'in:all,active,inactive,archived'], 'page' => ['nullable', 'integer', 'min:1', 'max:100000']]);
        $page = (int) ($values['page'] ?? 1);
        $status = $values['status'] ?? 'all';
        $response = $api->bundles(['status' => $status, 'limit' => 10, 'offset' => ($page - 1) * 10], true);

        return view('admin.bundles.index', [
            'bundles' => new LengthAwarePaginator($response['data'], $response['meta']['total'], 10, $page, ['path' => route('admin.bundles.index'), 'query' => ['status' => $status]]),
            'status' => $status,
        ]);
    }

    public function create()
    {
        return view('admin.bundles.form', ['bundle' => null]);
    }

    private function values(TokenBundleRequest $request): array
    {
        $values = $request->validated();
        $values['token_quota'] = (int) $values['token_quota'];
        $values['is_active'] = $request->boolean('is_active');
        $values['price_idr'] = Money::decimal(Money::cents($values['price_idr']));

        return $values;
    }

    public function store(TokenBundleRequest $request, TokenApi $api)
    {
        $api->createBundle($this->values($request));

        return to_route('admin.bundles.index')->with('success', 'Paket berhasil ditambahkan.');
    }

    public function edit(int $id, TokenApi $api)
    {
        $bundle = $api->bundle($id);
        abort_if(! empty($bundle['deletedAt']), 404, 'Paket sudah diarsipkan.');

        return view('admin.bundles.form', ['bundle' => $bundle]);
    }

    public function update(int $id, TokenBundleRequest $request, TokenApi $api)
    {
        $api->replaceBundle($id, $this->values($request));

        return to_route('admin.bundles.index')->with('success', 'Paket diperbarui. Snapshot order lama tetap sama.');
    }

    public function destroy(int $id, TokenApi $api)
    {
        $api->archiveBundle($id);

        return to_route('admin.bundles.index')->with('success', 'Paket diarsipkan. Histori pembelian tetap tersimpan.');
    }
}

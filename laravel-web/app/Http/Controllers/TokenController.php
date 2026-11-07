<?php

namespace App\Http\Controllers;

use App\Services\TokenApi;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class TokenController extends Controller
{
    public function index(Request $request, TokenApi $api)
    {
        $request->validate(['page' => ['nullable', 'integer', 'min:1', 'max:100000']]);
        $page = (int) $request->query('page', 1);
        $response = $api->bundles(['limit' => 12, 'offset' => ($page - 1) * 12]);
        // Keys live in the server session and survive failed/uncertain submissions.
        $keys = $request->session()->get('token_order_keys', []);
        foreach ($response['data'] as $bundle) {
            $key = $keys[$bundle['id']] ?? (string) Str::uuid();
            unset($keys[$bundle['id']]);
            $keys[$bundle['id']] = $key;
        }
        // Bound session size; a user's most recently visited 120 catalog entries.
        $keys = array_slice($keys, -120, null, true);
        $request->session()->put('token_order_keys', $keys);

        return view('tokens.index', [
            'bundles' => new LengthAwarePaginator($response['data'], $response['meta']['total'], 12, $page, ['path' => route('tokens.index')]),
            'keys' => $keys,
        ]);
    }

    public function store(Request $request, TokenApi $api)
    {
        $values = $request->validate([
            'token_bundle_id' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'idempotency_key' => ['required', 'uuid'],
        ]);
        foreach (array_diff(array_keys($request->all()), ['_token', 'token_bundle_id', 'idempotency_key']) as $field) {
            throw ValidationException::withMessages([$field => 'Harga, kuota, pemilik dan status ditentukan oleh server.']);
        }
        $stored = $request->session()->get('token_order_keys.'.$values['token_bundle_id']);
        abort_unless(is_string($stored) && hash_equals($stored, $values['idempotency_key']), 419, 'Muat ulang katalog paket.');
        $order = $api->createPurchase((int) $values['token_bundle_id'], $values['idempotency_key']);

        // Keep key after success: refresh/back/double-click returns the same order.
        return to_route('token-purchases.show', $order['order_id'])->with('success', 'Order lokal dibuat. Pembayaran belum tersedia dan kuota belum bertambah.');
    }

    public function purchases(Request $request, TokenApi $api)
    {
        $filters = $request->validate([
            'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'status' => ['nullable', 'in:pending,paid,failed,cancelled,expired'],
        ]);
        $page = (int) ($filters['page'] ?? 1);
        unset($filters['page']);
        $response = $api->purchases(array_filter([...$filters, 'limit' => 12, 'offset' => ($page - 1) * 12], fn ($v) => $v !== null && $v !== ''));

        return view('tokens.purchases', [
            'purchases' => new LengthAwarePaginator($response['data'], $response['meta']['total'], 12, $page, ['path' => route('token-purchases.index'), 'query' => $request->except('page')]),
        ]);
    }

    public function newOrder(int $id, Request $request)
    {
        $request->session()->put('token_order_keys.'.$id, (string) Str::uuid());

        return redirect()->to(route('tokens.index').'#paket-'.$id);
    }

    public function show(string $orderId, TokenApi $api)
    {
        return view('tokens.show', ['purchase' => $api->purchase($orderId)]);
    }

    public function checkout(string $orderId, TokenApi $api)
    {
        return view('tokens.checkout', ['checkout' => $api->checkout($orderId)]);
    }
}

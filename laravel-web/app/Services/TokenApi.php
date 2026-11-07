<?php

namespace App\Services;

use App\Exceptions\ApiUnavailable;

final class TokenApi
{
    public function __construct(private AuthApi $auth) {}

    private function request(string $method, string $path, array $values = [], array $headers = []): array
    {
        $response = $this->auth->authorized($method, $path, $values, $headers);
        $this->auth->validateResponse($response);
        if ($response->status() === 204) {
            return [];
        }
        $body = $response->json();
        if (! is_array($body)) {
            throw new ApiUnavailable('Respons katalog tidak valid.');
        }

        return $body;
    }

    public function bundles(array $filters = [], bool $admin = false): array
    {
        return $this->request('GET', $admin ? '/admin/token-bundles' : '/token-bundles', $filters);
    }

    public function bundle(int $id): array
    {
        return $this->request('GET', '/admin/token-bundles/'.$id)['data'];
    }

    public function createBundle(array $values): void
    {
        $this->request('POST', '/admin/token-bundles', $values);
    }

    public function replaceBundle(int $id, array $values): void
    {
        $this->request('PUT', '/admin/token-bundles/'.$id, $values);
    }

    public function archiveBundle(int $id): void
    {
        $this->request('DELETE', '/admin/token-bundles/'.$id);
    }

    public function createPurchase(int $bundleId, string $key): array
    {
        return $this->request('POST', '/token-purchases', ['token_bundle_id' => $bundleId], ['Idempotency-Key' => $key])['data'];
    }

    public function purchases(array $filters = []): array
    {
        return $this->request('GET', '/token-purchases', $filters);
    }

    public function purchase(string $orderId): array
    {
        return $this->request('GET', '/token-purchases/'.$orderId)['data'];
    }

    public function checkout(string $orderId): array
    {
        return $this->request('GET', '/token-purchases/'.$orderId.'/checkout')['data'];
    }
}

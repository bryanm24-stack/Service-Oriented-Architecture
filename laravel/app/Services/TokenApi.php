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

    public function startCheckout(string $orderId): array
    {
        return $this->request('POST', '/token-purchases/'.$orderId.'/checkout')['data'];
    }

    public function syncPayment(string $orderId): array
    {
        return $this->request('POST', '/token-purchases/'.$orderId.'/sync')['data'];
    }

    public function wallet(): array
    {
        return $this->request('GET', '/token-wallet')['data'];
    }

    public function ledger(array $filters = []): array
    {
        return $this->request('GET', '/token-ledger', $filters);
    }

    public function usages(array $filters = [], ?string $apiKey = null): array
    {
        return $this->request('GET', '/ai/usages', $filters, $apiKey ? ['X-API-Key' => $apiKey] : []);
    }

    public function usageSummary(string $period, string $apiKey): array
    {
        return $this->request('GET', '/ai/usage-summary', ['period' => $period], ['X-API-Key' => $apiKey])['data'];
    }

    public function issueAiKey(): string
    {
        $data = $this->request('POST', '/ai/api-key', ['name' => 'ProjectSOA Laravel'])['data'];
        if (! is_string($data['api_key'] ?? null)) {
            throw new ApiUnavailable('Kunci akses AI tidak berhasil dibuat.');
        }
        return $data['api_key'];
    }

    public function analyze(array $values, string $apiKey, string $idempotencyKey): array
    {
        return $this->request('POST', '/ai/analyze', $values, [
            'X-API-Key' => $apiKey,
            'Idempotency-Key' => $idempotencyKey,
        ])['data'];
    }
}

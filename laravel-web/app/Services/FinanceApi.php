<?php

namespace App\Services;

use App\Exceptions\ApiUnavailable;

final class FinanceApi
{
    public function __construct(private AuthApi $auth) {}

    private function request(string $method, string $path, array $data = []): array
    {
        $response = $this->auth->authorized($method, $path, $data);
        $this->auth->validateResponse($response);
        if ($response->status() === 204) {
            return [];
        }
        $body = $response->json();
        if (! is_array($body)) {
            throw new ApiUnavailable('Respons data tidak valid.');
        }

        return $body;
    }

    public function transactions(array $filters = []): array
    {
        return $this->request('GET', '/transactions', ['user_id' => (int) session('soa.user.id'), ...$filters]);
    }

    public function cashFlow(array $filters = []): array
    {
        return $this->request('GET', '/transactions/summary', ['user_id' => (int) session('soa.user.id'), ...$filters])['data'];
    }

    public function categories(): array
    {
        return $this->request('GET', '/categories')['data'];
    }

    public function expense(int $id, int $userId): array
    {
        return $this->request('GET', '/transactions/'.$id)['data'];
    }

    public function createExpense(int $userId, array $values): void
    {
        $this->request('POST', '/transactions', $values);
    }

    public function updateExpense(int $id, int $userId, array $values): void
    {
        $this->request('PATCH', '/transactions/'.$id, $values);
    }

    public function deleteExpense(int $id, int $userId): void
    {
        $this->request('DELETE', '/transactions/'.$id);
    }

    public function budgets(int $userId): array
    {
        return $this->request('GET', '/users/'.$userId.'/budgets')['data'];
    }

    public function budgetSummary(int $id, int $userId): array
    {
        return $this->request('GET','/budgets/'.$id.'/summary')['data'];
    }
}

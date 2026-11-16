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

    public function category(int $id): array
    {
        return $this->request('GET', '/categories/'.$id)['data'];
    }

    public function createCategory(array $values): void
    {
        $this->request('POST', '/categories', $values);
    }

    public function replaceCategory(int $id, array $values): void
    {
        $this->request('PUT', '/categories/'.$id, $values);
    }

    public function deleteCategory(int $id): void
    {
        $this->request('DELETE', '/categories/'.$id);
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

    public function wishes(): array
    {
        return $this->request('GET', '/wishes')['data'];
    }

    public function wish(int $id): array
    {
        return $this->request('GET', '/wishes/'.$id)['data'];
    }

    public function simulateWish(array $values): array
    {
        return $this->request('POST', '/wishes/simulate', $values)['data'];
    }

    public function createWish(array $values): array
    {
        return $this->request('POST', '/wishes', $values)['data'];
    }

    public function updateWish(int $id, array $values): array
    {
        return $this->request('PUT', '/wishes/'.$id, $values)['data'];
    }

    public function deleteWish(int $id): void
    {
        $this->request('DELETE', '/wishes/'.$id);
    }

    public function payCashWish(int $id): array
    {
        return $this->request('POST', '/wishes/'.$id.'/pay')['data'];
    }

    public function payInstallment(int $id, int $installmentId): array
    {
        return $this->request('POST', '/wishes/'.$id.'/installments/'.$installmentId.'/pay')['data'];
    }

    public function budgets(int $userId): array
    {
        return $this->request('GET', '/users/'.$userId.'/budgets')['data'];
    }

    public function budgetSummary(int $id, int $userId): array
    {
        return $this->request('GET', '/budgets/'.$id.'/summary')['data'];
    }

    public function recurringCosts(array $filters = []): array
    {
        return $this->request('GET', '/recurring-costs', $filters)['data'];
    }

    public function recurringCost(int $id): array
    {
        return $this->request('GET', '/recurring-costs/'.$id)['data'];
    }

    public function recurringPreview(array $values): array
    {
        return $this->request('POST', '/recurring-costs/preview', $values)['data'];
    }

    public function createRecurringCost(array $values): array
    {
        return $this->request('POST', '/recurring-costs', $values)['data'];
    }

    public function updateRecurringCost(int $id, array $values): array
    {
        return $this->request('PATCH', '/recurring-costs/'.$id, $values)['data'];
    }

    public function setRecurringStatus(int $id, string $status): void
    {
        $this->request('PATCH', '/recurring-costs/'.$id.'/status', ['status' => $status]);
    }

    public function archiveRecurringCost(int $id): void
    {
        $this->request('DELETE', '/recurring-costs/'.$id);
    }

    public function recurringOccurrences(int $id, string $status = 'upcoming'): array
    {
        return $this->request('GET', '/recurring-costs/'.$id.'/occurrences', ['status' => $status])['data'];
    }
}

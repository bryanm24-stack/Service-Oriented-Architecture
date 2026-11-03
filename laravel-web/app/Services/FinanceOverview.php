<?php

namespace App\Services;

use App\Exceptions\ApiUnavailable;
use App\Support\Money;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class FinanceOverview
{
    public function period(Collection $rows, string $period): Collection
    {
        return $rows->filter(fn (array $row): bool => CarbonImmutable::parse($row['createdAt'])->timezone(config('app.timezone'))->format('Y-m') === $period)
            ->sortByDesc(fn (array $row): string => $row['createdAt'].'-'.str_pad((string) $row['id_transaction'], 12, '0', STR_PAD_LEFT))->values();
    }

    public function total(Collection $rows): int
    {
        $total = 0;
        foreach ($rows as $row) {
            $amount = Money::cents((string) $row['nominal']);
            if ($amount < 0 || $amount > PHP_INT_MAX - $total) {
                throw new ApiUnavailable('Total nominal melebihi batas ringkasan.');
            }
            $total += $amount;
        }

        return $total;
    }

    public function categories(Collection $rows): Collection
    {
        return $rows->groupBy('id_category')->map(fn (Collection $group): array => [
            'name' => $group->first()['category']['name'] ?? 'Tanpa kategori',
            'amount' => $this->total($group),
        ])->sortByDesc('amount')->values();
    }
}

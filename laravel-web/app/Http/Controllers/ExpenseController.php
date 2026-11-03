<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExpenseRequest;
use App\Services\FinanceApi;
use App\Services\FinanceOverview;
use App\Services\PreviewUserContext;
use App\Support\Money;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\View\View;

class ExpenseController extends Controller
{
    public function index(Request $request, FinanceApi $api, PreviewUserContext $context, FinanceOverview $overview): View
    {
        $filters = $request->validate(['period' => ['nullable', 'date_format:Y-m'], 'search' => ['nullable', 'string', 'max:255'], 'category' => ['nullable', 'integer', 'min:1'], 'page' => ['nullable', 'integer', 'min:1']]);
        $period = $filters['period'] ?? now()->format('Y-m');
        $rows = $overview->period(collect($api->expenses($context->id())), $period);
        if (! empty($filters['search'])) {
            $rows = $rows->filter(fn (array $row): bool => mb_stripos((string) ($row['catatan'] ?? ''), $filters['search']) !== false);
        }
        if (! empty($filters['category'])) {
            $rows = $rows->where('id_category', (int) $filters['category']);
        }
        $page = (int) ($filters['page'] ?? 1);

        return view('expenses.index', ['expenses' => new LengthAwarePaginator($rows->values()->slice(($page - 1) * 10, 10), $rows->count(), 10, $page,
            ['path' => route('expenses.index'), 'query' => $request->except('page')]), 'categories' => $api->categories(), 'period' => $period, 'total' => $overview->total($rows)]);
    }

    public function create(FinanceApi $api): View
    {
        return view('expenses.form', ['expense' => null, 'categories' => $api->categories()]);
    }

    public function store(ExpenseRequest $request, FinanceApi $api, PreviewUserContext $context): RedirectResponse
    {
        $values = $request->safe()->only(['id_category', 'nominal', 'catatan']);
        $values['nominal'] = Money::decimal(Money::cents($values['nominal']));
        $api->createExpense($context->id(), $values);

        return to_route('expenses.index')->with('success', 'Pengeluaran berhasil ditambahkan.');
    }

    public function edit(int $id, FinanceApi $api, PreviewUserContext $context): View
    {
        return view('expenses.form', ['expense' => $api->expense($id, $context->id()), 'categories' => $api->categories()]);
    }

    public function update(int $id, ExpenseRequest $request, FinanceApi $api, PreviewUserContext $context): RedirectResponse
    {
        $values = $request->safe()->only(['nominal', 'catatan']);
        $values['nominal'] = Money::decimal(Money::cents($values['nominal']));
        $api->updateExpense($id, $context->id(), $values);

        return to_route('expenses.index')->with('success', 'Pengeluaran berhasil diperbarui.');
    }

    public function destroy(int $id, Request $request, FinanceApi $api, PreviewUserContext $context): RedirectResponse
    {
        $request->validate(['user_id' => ['prohibited'], 'id_user' => ['prohibited']]);
        $api->deleteExpense($id, $context->id());

        return to_route('expenses.index')->with('success', 'Pengeluaran berhasil dihapus.');
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExpenseRequest;
use App\Services\CurrentUserContext;
use App\Services\FinanceApi;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class ExpenseController extends Controller
{
    public function index(Request $request, FinanceApi $api)
    {
        $filters = $request->validate(['period' => ['nullable', 'date_format:Y-m'], 'search' => ['nullable', 'string', 'max:255'], 'category_id' => ['nullable', 'integer', 'min:1'], 'type' => ['nullable', 'in:income,expense'],
            'start_date' => ['nullable', 'date_format:Y-m-d'], 'end_date' => ['nullable', 'date_format:Y-m-d', ...($request->filled('start_date') ? ['after_or_equal:start_date'] : [])],
            'sort' => ['nullable', 'in:asc,desc'], 'sort_by' => ['nullable', 'in:createdAt,nominal,id_transaction'], 'mode' => ['nullable', 'in:orm,raw'], 'page' => ['nullable', 'integer', 'min:1', 'max:1000000']]);
        $page = (int) ($filters['page'] ?? 1);
        unset($filters['page']);
        $filters = array_filter($filters, fn ($v) => $v !== null && $v !== '');
        if (empty($filters['start_date']) && empty($filters['end_date']) && empty($filters['period'])) {
            $filters['period'] = now()->format('Y-m');
        }
        if (isset($filters['start_date']) || isset($filters['end_date'])) {
            unset($filters['period']);
        }
        $list = $api->transactions([...$filters, 'limit' => 10, 'offset' => ($page - 1) * 10]);

        return view('expenses.index', ['expenses' => new LengthAwarePaginator($list['data'], $list['meta']['total'], 10, $page, ['path' => route('expenses.index'), 'query' => $request->except('page')]),
            'summary' => $api->cashFlow($filters), 'categories' => $api->categories(), 'filters' => $filters]);
    }

    public function create(FinanceApi $api)
    {
        return view('expenses.form', ['expense' => null, 'categories' => $api->categories()]);
    }

    private function values(ExpenseRequest $request): array
    {
        $values = $request->safe()->only(['type', 'id_category', 'nominal', 'catatan']);
        $values['id_category'] = (int) $values['id_category'];
        $values['nominal'] = Money::decimal(Money::cents($values['nominal']));

        return $values;
    }

    public function store(ExpenseRequest $request, FinanceApi $api, CurrentUserContext $context)
    {
        $api->createExpense($context->id(), $this->values($request));

        return to_route('expenses.index')->with('success', 'Transaksi berhasil ditambahkan.');
    }

    public function edit(int $id, FinanceApi $api, CurrentUserContext $context)
    {
        return view('expenses.form', ['expense' => $api->expense($id, $context->id()), 'categories' => $api->categories()]);
    }

    public function update(int $id, ExpenseRequest $request, FinanceApi $api, CurrentUserContext $context)
    {
        $api->updateExpense($id, $context->id(), $this->values($request));

        return to_route('expenses.index')->with('success', 'Transaksi berhasil diperbarui.');
    }

    public function destroy(int $id, Request $request, FinanceApi $api, CurrentUserContext $context)
    {
        $request->validate(['id_user' => ['prohibited'], 'user_id' => ['prohibited']]);
        $api->deleteExpense($id, $context->id());

        return to_route('expenses.index')->with('success','Transaksi berhasil dihapus.');
    }
}

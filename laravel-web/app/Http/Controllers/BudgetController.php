<?php

namespace App\Http\Controllers;

use App\Services\CurrentUserContext;
use App\Services\FinanceApi;
use Illuminate\View\View;

class BudgetController extends Controller
{
    public function index(FinanceApi $api, CurrentUserContext $context): View
    {
        $budgets = collect($api->budgets($context->id()))->sortByDesc(fn (array $row): string => sprintf('%04d-%02d', $row['year'], $row['month']));

        return view('budgets.index', compact('budgets'));
    }

    public function show(int $id, FinanceApi $api, CurrentUserContext $context): View
    {
        return view('budgets.show', ['summary' => $api->budgetSummary($id, $context->id())]);
    }
}

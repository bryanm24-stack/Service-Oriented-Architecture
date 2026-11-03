<?php

namespace App\Http\Controllers;

use App\Services\FinanceApi;
use App\Services\PreviewUserContext;
use Illuminate\View\View;

class BudgetController extends Controller
{
    public function index(FinanceApi $api, PreviewUserContext $context): View
    {
        $budgets = collect($api->budgets($context->id()))->sortByDesc(fn (array $row): string => sprintf('%04d-%02d', $row['year'], $row['month']));

        return view('budgets.index', compact('budgets'));
    }

    public function show(int $id, FinanceApi $api, PreviewUserContext $context): View
    {
        return view('budgets.show', ['summary' => $api->budgetSummary($id, $context->id())]);
    }
}

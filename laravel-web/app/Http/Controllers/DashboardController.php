<?php

namespace App\Http\Controllers;

use App\Services\FinanceApi;
use App\Services\FinanceOverview;
use App\Services\PreviewUserContext;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __invoke(Request $request, FinanceApi $api, PreviewUserContext $context, FinanceOverview $overview): View
    {
        $input = $request->validate(['period' => ['nullable', 'date_format:Y-m']]);
        $period = $input['period'] ?? now()->format('Y-m');
        $rows = $overview->period(collect($api->expenses($context->id())), $period);
        $budget = collect($api->budgets($context->id()))->first(fn (array $row): bool => sprintf('%04d-%02d', $row['year'], $row['month']) === $period);
        $summary = $budget ? $api->budgetSummary((int) $budget['budget_id'], $context->id()) : null;

        return view('dashboard', ['rows' => $rows, 'total' => $overview->total($rows), 'groups' => $overview->categories($rows),
            'summary' => $summary, 'period' => $period, 'periodLabel' => CarbonImmutable::parse($period.'-01')->locale('id')->translatedFormat('F Y')]);
    }
}

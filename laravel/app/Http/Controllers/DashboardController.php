<?php

namespace App\Http\Controllers;

use App\Services\FinanceApi;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request, FinanceApi $api)
    {
        $input = $request->validate(['period' => ['nullable', 'date_format:Y-m']]);
        $period = $input['period'] ?? now()->format('Y-m');

        return view('dashboard', ['summary' => $api->cashFlow(['period' => $period]), 'rows' => $api->transactions(['period' => $period, 'limit' => 5, 'sort' => 'desc', 'sort_by' => 'createdAt'])['data'],
            'period' => $period, 'periodLabel' => CarbonImmutable::parse($period.'-01')->locale('id')->translatedFormat('F Y')]);
    }
}

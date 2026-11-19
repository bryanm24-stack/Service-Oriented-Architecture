<?php

namespace App\Http\Controllers;

use App\Services\TokenApi;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class AiController extends Controller
{
    private function apiKey(Request $request, TokenApi $api): string
    {
        $key = $request->session()->get('soa.ai_api_key');
        if (! is_string($key) || strlen($key) < 32) {
            $key = $api->issueAiKey();
            $request->session()->put('soa.ai_api_key', $key);
        }
        return $key;
    }

    public function wallet(Request $request, TokenApi $api)
    {
        $filters = $request->validate([
            'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'usage_page' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'usage_status' => ['nullable', 'in:reserved,completed,failed,needs_reconciliation'],
            'type' => ['nullable', 'in:credit,debit,reserve,release'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'period' => ['nullable', 'date_format:Y-m'],
        ]);
        $page = (int) ($filters['page'] ?? 1);
        $period = $filters['period'] ?? now()->format('Y-m');
        $apiKey = $this->apiKey($request, $api);
        $ledgerFilters = array_filter([
            'type' => $filters['type'] ?? null,
            'start_date' => $filters['start_date'] ?? null,
            'end_date' => $filters['end_date'] ?? null,
            'limit' => 10,
            'offset' => ($page - 1) * 10,
        ], fn ($value) => $value !== null && $value !== '');
        $ledger = $api->ledger($ledgerFilters);
        $usagePage = (int) ($filters['usage_page'] ?? 1);
        $usageFilters = array_filter(['limit' => 10, 'offset' => ($usagePage - 1) * 10, 'status' => $filters['usage_status'] ?? null], fn ($value) => $value !== null && $value !== '');
        $usage = $api->usages($usageFilters, $apiKey);
        $summary = $api->usageSummary($period, $apiKey);
        return view('tokens.wallet', [
            'wallet' => $api->wallet(),
            'ledger' => new LengthAwarePaginator($ledger['data'], $ledger['meta']['total'], 10, $page, ['path' => route('tokens.wallet'), 'query' => $request->except('page')]),
            'usages' => new LengthAwarePaginator($usage['data'], $usage['meta']['total'], 10, $usagePage, ['path' => route('tokens.wallet'), 'pageName' => 'usage_page', 'query' => $request->except('usage_page')]), 'summary' => $summary, 'period' => $period, 'filters' => $filters,
        ]);
    }

    public function analysis(Request $request, TokenApi $api)
    {
        $filters = $request->validate(['period' => ['nullable', 'date_format:Y-m']]);
        return view('ai.analysis', [
            'wallet' => $api->wallet(),
            'period' => $filters['period'] ?? now()->format('Y-m'),
            'result' => null,
        ]);
    }

    public function analyze(Request $request, TokenApi $api)
    {
        $values = $request->validate([
            'question' => ['required', 'string', 'min:8', 'max:6000'],
            'period' => ['required', 'date_format:Y-m'],
            'answer_length' => ['required', 'in:short,normal,detailed'],
            'idempotency_key' => ['required', 'uuid'],
        ]);
        $apiKey = $this->apiKey($request, $api);
        $result = $api->analyze([
            'question' => $values['question'],
            'period' => $values['period'],
            'answer_length' => $values['answer_length'],
        ], $apiKey, $values['idempotency_key']);
        return view('ai.analysis', [
            'wallet' => $api->wallet(),
            'period' => $values['period'],
            'result' => $result,
            'question' => $values['question'],
            'answerLength' => $values['answer_length'],
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Services\FinanceApi;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class RecurringCostController extends Controller
{
    public function index(Request $request, FinanceApi $api): View
    {
        $filters = $request->validate(['status' => ['nullable', 'in:active,paused'], 'category_id' => ['nullable', 'integer', 'min:1']]);
        $recurring = collect($api->recurringCosts(array_filter($filters, fn ($value) => $value !== null && $value !== '')));
        $recurring = $recurring->map(function (array $item): array {
            $item['upcoming'] = collect($item['occurrences'] ?? [])->whereIn('status', ['planned', 'locked'])->values()->all();
            $item['paid'] = collect($item['occurrences'] ?? [])->where('status', 'paid')->values()->all();

            return $item;
        });

        return view('recurring.index', compact('recurring', 'filters'));
    }

    public function create(FinanceApi $api): View
    {
        return view('recurring.form', ['recurring' => null, 'categories' => $api->categories()]);
    }

    public function edit(int $id, FinanceApi $api): View
    {
        return view('recurring.form', ['recurring' => $api->recurringCost($id), 'categories' => $api->categories()]);
    }

    public function store(Request $request, FinanceApi $api): RedirectResponse
    {
        $api->createRecurringCost($this->validated($request));

        return to_route('recurring.index')->with('success', 'Pengeluaran berulang disimpan. Jadwal ini adalah rencana, bukan pembayaran bank.');
    }

    public function update(int $id, Request $request, FinanceApi $api): RedirectResponse
    {
        $api->updateRecurringCost($id, $this->validated($request, true));

        return to_route('recurring.index')->with('success', 'Template diperbarui. Nominal occurrence historis tetap tersimpan.');
    }

    public function preview(Request $request, FinanceApi $api): JsonResponse
    {
        return response()->json(['data' => $api->recurringPreview($this->validated($request))]);
    }

    public function status(int $id, Request $request, FinanceApi $api): RedirectResponse
    {
        $values = $request->validate(['status' => ['required', 'in:active,paused']]);
        $api->setRecurringStatus($id, $values['status']);

        return to_route('recurring.index')->with('success', $values['status'] === 'paused'
            ? 'Template dijeda. Occurrence dan transaksi historis tetap ada.'
            : 'Template dilanjutkan. Tidak ada transaksi bank yang dibuat otomatis.');
    }

    public function destroy(int $id, FinanceApi $api): RedirectResponse
    {
        $api->archiveRecurringCost($id);

        return to_route('recurring.index')->with('success', 'Template diarsipkan. Transaksi historis tetap ada.');
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $rules = [
            'name' => ['required', 'string', 'min:1', 'max:180'],
            'amount' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
            'category_id' => ['required', 'integer', 'min:1'],
            'interval' => ['required', 'in:monthly,yearly'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'next_due_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'status' => ['nullable', 'in:active,paused'],
        ];
        if ($partial) {
            foreach ($rules as $key => $rule) {
                $rules[$key] = array_values(array_filter($rule, fn ($item) => $item !== 'required'));
            }
        }
        $values = $request->validate($rules);
        $values['amount'] = Money::decimal(Money::cents($values['amount']));

        return $values;
    }
}

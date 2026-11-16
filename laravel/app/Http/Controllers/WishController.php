<?php

namespace App\Http\Controllers;

use App\Services\FinanceApi;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class WishController extends Controller
{
    public function index(FinanceApi $api): View
    {
        $wishes = collect($api->wishes());

        return view('wishes.index', compact('wishes'));
    }

    public function create(): View
    {
        return view('wishes.form', ['wish' => null]);
    }

    public function store(Request $request, FinanceApi $api): RedirectResponse
    {
        $values = $this->validated($request);
        $api->createWish($values);

        return to_route('wishes.index')->with('success', 'Wish berhasil ditambahkan dan jadwal cicilan dibuat.');
    }

    public function edit(int $id, FinanceApi $api): View
    {
        return view('wishes.form', ['wish' => $api->wish($id)]);
    }

    public function update(int $id, Request $request, FinanceApi $api): RedirectResponse
    {
        $api->updateWish($id, $this->validated($request));

        return to_route('wishes.index')->with('success', 'Wish berhasil diperbarui.');
    }

    public function destroy(int $id, FinanceApi $api): RedirectResponse
    {
        $api->deleteWish($id);

        return to_route('wishes.index')->with('success', 'Wish berhasil dihapus.');
    }

    public function payCash(int $id, FinanceApi $api): RedirectResponse
    {
        $api->payCashWish($id);

        return to_route('wishes.index')->with('success', 'Pembayaran cash dicatat sebagai transaksi pengeluaran.');
    }

    public function payInstallment(int $id, int $installmentId, FinanceApi $api): RedirectResponse
    {
        $api->payInstallment($id, $installmentId);

        return to_route('wishes.index')->with('success', 'Pembayaran cicilan dicatat sebagai transaksi pengeluaran.');
    }

    private function validated(Request $request): array
    {
        $values = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:180'],
            'price' => ['required', 'numeric', 'gt:0', 'decimal:0,2'],
            'payment_method' => ['required', 'in:cash,installment'],
            'down_payment' => ['nullable', 'numeric', 'min:0', 'decimal:0,2'],
            'tenor_type' => ['nullable', 'in:months,years'],
            'tenor_value' => ['nullable', 'integer', 'min:1', 'max:120'],
        ]);

        $method = $values['payment_method'];
        if ($method === 'cash') {
            $values['down_payment'] = 0;
            unset($values['tenor_type'], $values['tenor_value']);
        } else {
            $down = (float) ($values['down_payment'] ?? 0);
            if ($down >= (float) $values['price']) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'down_payment' => 'Uang muka harus lebih kecil dari harga barang.',
                ]);
            }
            if (empty($values['tenor_type']) || empty($values['tenor_value'])) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'tenor_value' => 'Pilih tenor bulan atau tahun dan isi jumlah periodenya.',
                ]);
            }
            if ($values['tenor_type'] === 'years' && (int) $values['tenor_value'] > 10) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'tenor_value' => 'Tenor maksimal 10 tahun.',
                ]);
            }
            $values['tenor_'.$values['tenor_type']] = (int) $values['tenor_value'];
            unset($values['tenor_type'], $values['tenor_value']);
        }

        return $values;
    }
}

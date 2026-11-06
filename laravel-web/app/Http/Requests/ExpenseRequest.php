<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['id_user' => ['prohibited'], 'user_id' => ['prohibited'], 'type' => ['required', 'in:income,expense'], 'id_category' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'nominal' => ['required', 'string', 'regex:/^\d{1,13}(?:\.\d{1,2})?$/D'], 'catatan' => ['nullable', 'string', 'max:10000']];
    }

    public function messages(): array
    {
        return ['type.required' => 'Pilih jenis transaksi.', 'type.in' => 'Jenis transaksi tidak valid.', 'id_category.required' => 'Pilih kategori.', 'nominal.required' => 'Isi nominal transaksi.', 'nominal.regex' => 'Gunakan angka tanpa pemisah ribuan, maksimal dua angka desimal. Contoh: 15000 atau 15000.50.', 'prohibited' => 'Pemilik ditentukan oleh server.'];
    }
}

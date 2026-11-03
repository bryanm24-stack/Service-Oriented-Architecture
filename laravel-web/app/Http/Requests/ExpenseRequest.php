<?php

namespace App\Http\Requests;

use App\Support\Money;
use Illuminate\Foundation\Http\FormRequest;

class ExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_user' => ['prohibited'], 'user_id' => ['prohibited'],
            'id_category' => $this->isMethod('PATCH') ? ['prohibited'] : ['required', 'integer', 'min:1', 'max:2147483647'],
            'nominal' => ['bail', 'required', 'string', 'regex:/^\d{1,13}(?:\.\d{1,2})?$/D', function (string $attribute, mixed $value, \Closure $fail): void {
                if (Money::cents((string) $value) <= 0) {
                    $fail('Nominal harus lebih dari nol.');
                }
            }],
            'catatan' => ['nullable', 'string', 'max:10000'],
        ];
    }

    public function messages(): array
    {
        return [
            'id_category.required' => 'Pilih kategori pengeluaran.',
            'id_category.integer' => 'Kategori tidak valid.',
            'nominal.required' => 'Isi nominal pengeluaran.',
            'nominal.regex' => 'Gunakan angka tanpa pemisah ribuan, misalnya 15000 atau 15000.50.',
            'catatan.max' => 'Catatan maksimal 10.000 karakter.',
            'prohibited' => 'Field ini ditentukan oleh server.',
        ];
    }
}

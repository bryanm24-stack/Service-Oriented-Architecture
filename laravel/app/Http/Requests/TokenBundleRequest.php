<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class TokenBundleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->session()->get('soa.user.role') === 'admin';
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'token_quota' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'price_idr' => ['required', 'string', 'regex:/^\d{1,13}(?:\.\d{1,2})?$/D', 'gt:0'],
            'is_active' => ['required', 'in:0,1'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['_token', '_method', 'name', 'token_quota', 'price_idr', 'is_active']) as $field) {
                $validator->errors()->add($field, 'Field ini tidak diizinkan.');
            }
        }];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Isi nama paket.',
            'token_quota.min' => 'Kuota minimal 1 token.',
            'token_quota.max' => 'Kuota maksimal 2.147.483.647 token.',
            'price_idr.regex' => 'Harga memakai angka tanpa pemisah ribuan, maksimal dua desimal.',
            'price_idr.gt' => 'Harga harus lebih dari nol.',
            'is_active.required' => 'Pilih status paket.',
        ];
    }
}

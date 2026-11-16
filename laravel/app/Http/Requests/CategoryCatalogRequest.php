<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class CategoryCatalogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->session()->get('soa.user.role') === 'admin';
    }

    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:100'], 'icon' => ['nullable', 'string', 'max:255']];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['_token', '_method', 'name', 'icon']) as $field) {
                $validator->errors()->add($field, 'Field ini tidak diizinkan.');
            }
        }];
    }
}

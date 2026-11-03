<?php

namespace App\Http\Controllers;

use App\Services\FinanceApi;
use Illuminate\View\View;

class CategoryController extends Controller
{
    public function __invoke(FinanceApi $api): View
    {
        return view('categories', ['categories' => $api->categories()]);
    }
}

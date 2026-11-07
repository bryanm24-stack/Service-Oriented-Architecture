<?php

use App\Http\Controllers\AdminCategoryController;
use App\Http\Controllers\AdminTokenBundleController;
use App\Http\Controllers\AppController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\TokenController;
use App\Http\Middleware\EnsureAdministrator;
use App\Http\Middleware\EnsureApiAuthenticated;
use Illuminate\Support\Facades\Route;

Route::get('/login', [AuthController::class, 'loginForm'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,1');
Route::get('/register', [AuthController::class, 'registerForm'])->name('register');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::middleware(EnsureApiAuthenticated::class)->group(function () {
    Route::redirect('/', '/app/dashboard');
    Route::get('/app/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/app/transactions', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::get('/app/transactions/create', [ExpenseController::class, 'create'])->name('expenses.create');
    Route::post('/app/transactions', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::get('/app/transactions/{id}/edit', [ExpenseController::class, 'edit'])->whereNumber('id')->name('expenses.edit');
    Route::patch('/app/transactions/{id}', [ExpenseController::class, 'update'])->whereNumber('id')->name('expenses.update');
    Route::delete('/app/transactions/{id}', [ExpenseController::class, 'destroy'])->whereNumber('id')->name('expenses.destroy');
    Route::get('/anggaran', [BudgetController::class, 'index'])->name('budgets.index');
    Route::get('/anggaran/{id}', [BudgetController::class, 'show'])->whereNumber('id')->name('budgets.show');
    Route::get('/kategori', CategoryController::class)->name('categories.index');
    Route::get('/aplikasi', AppController::class)->name('application');
    Route::get('/app/token-bundles', [TokenController::class, 'index'])->name('tokens.index');
    Route::post('/app/token-bundles/{id}/new-order', [TokenController::class, 'newOrder'])->whereNumber('id')->name('tokens.new-order');
    Route::get('/app/token-purchases', [TokenController::class, 'purchases'])->name('token-purchases.index');
    Route::post('/app/token-purchases', [TokenController::class, 'store'])->name('token-purchases.store');
    Route::get('/app/token-purchases/{orderId}', [TokenController::class, 'show'])->where('orderId', 'SOA-[0-9a-f-]{36}')->name('token-purchases.show');
    Route::get('/app/token-purchases/{orderId}/checkout', [TokenController::class, 'checkout'])->where('orderId', 'SOA-[0-9a-f-]{36}')->name('token-purchases.checkout');
    Route::middleware(EnsureAdministrator::class)->prefix('app/admin')->name('admin.')->where(['id' => '[0-9]+'])->group(function () {
        Route::resource('token-bundles', AdminTokenBundleController::class)->except('show')->parameters(['token-bundles' => 'id'])->names('bundles');
        Route::resource('categories', AdminCategoryController::class)->except('show')->parameters(['categories' => 'id']);
    });
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/pengeluaran', fn () => redirect()->route('expenses.index', request()->query()));
    Route::redirect('/pengeluaran/tambah', '/app/transactions/create');
});

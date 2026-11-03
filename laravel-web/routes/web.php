<?php

use App\Http\Controllers\AppController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Middleware\EnsureLocalPreview;
use Illuminate\Support\Facades\Route;

Route::middleware(EnsureLocalPreview::class)->group(function (): void {
    Route::get('/', DashboardController::class)->name('dashboard');
    Route::get('/pengeluaran', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::get('/pengeluaran/tambah', [ExpenseController::class, 'create'])->name('expenses.create');
    Route::post('/pengeluaran', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::get('/pengeluaran/{id}/edit', [ExpenseController::class, 'edit'])->whereNumber('id')->name('expenses.edit');
    Route::patch('/pengeluaran/{id}', [ExpenseController::class, 'update'])->whereNumber('id')->name('expenses.update');
    Route::delete('/pengeluaran/{id}', [ExpenseController::class, 'destroy'])->whereNumber('id')->name('expenses.destroy');
    Route::get('/anggaran', [BudgetController::class, 'index'])->name('budgets.index');
    Route::get('/anggaran/{id}', [BudgetController::class, 'show'])->whereNumber('id')->name('budgets.show');
    Route::get('/kategori', CategoryController::class)->name('categories.index');
    Route::get('/aplikasi', AppController::class)->name('application');
});

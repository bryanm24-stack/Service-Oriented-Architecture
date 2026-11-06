@extends('layouts.app')
@section('title', $expense ? 'Edit transaksi' : 'Tambah transaksi')
@section('content')
    <div class="page-heading">
        <div><a class="back-link" href="{{ route('expenses.index') }}"><x-icon name="left" />Kembali ke transaksi</a>
            <h1>{{ $expense ? 'Edit transaksi' : 'Catat transaksi' }}</h1>
            <p class="subtitle">Pilih pemasukan atau pengeluaran sesuai catatan Anda.</p>
        </div>
    </div>
    <div class="form-layout">
        <section class="panel form-panel">
            <div class="section-heading">
                <h2>Detail transaksi</h2><span class="section-icon"><x-icon name="receipt" /></span>
            </div>
            <form method="post"
                action="{{ $expense ? route('expenses.update', $expense['id_transaction']) : route('expenses.store') }}"
                data-mutation>@csrf @if ($expense)
                    @method('PATCH')
                @endif
                <div class="field"><label for="type">Jenis transaksi</label><select id="type" name="type"
                        required>
                        <option value="expense" @selected(old('type', $expense['type'] ?? 'expense') === 'expense')>Pengeluaran</option>
                        <option value="income" @selected(old('type', $expense['type'] ?? 'expense') === 'income')>Pemasukan</option>
                    </select>
                    @error('type')
                        <p class="field-error">{{ $message }}</p>
                    @enderror
                </div>
                <div class="field"><label for="nominal">Nominal (Rp)</label>
                    <div class="currency-input"><span>Rp</span><input id="nominal" name="nominal" type="text"
                            inputmode="decimal" value="{{ old('nominal', $expense['nominal'] ?? '') }}" required maxlength="16"
                            placeholder="15000" aria-describedby="nominal-help"
                            @error('nominal') aria-invalid="true" @enderror></div>
                    <p id="nominal-help" class="field-help">Tanpa pemisah ribuan. Contoh: 15000 atau 15000.50. Nol
                        diperbolehkan.</p>
                    @error('nominal')
                        <p class="field-error">{{ $message }}</p>
                    @enderror
                </div>
                <div class="field"><label for="id_category">Kategori</label><select id="id_category" name="id_category"
                        required>
                        <option value="">Pilih kategori</option>
                        @foreach ($categories as $category)
                            <option value="{{ $category['id'] }}" @selected((string) old('id_category', $expense['id_category'] ?? '') === (string) $category['id'])>{{ $category['name'] }}
                            </option>
                        @endforeach
                    </select>
                    @error('id_category')
                        <p class="field-error">{{ $message }}</p>
                    @enderror
                </div>
                <div class="field"><label for="catatan">Catatan <span class="muted">(opsional)</span></label>
                    <textarea id="catatan" name="catatan" rows="4" maxlength="10000" placeholder="Untuk apa transaksi ini?">{{ old('catatan', $expense['catatan'] ?? '') }}</textarea>
                    @error('catatan')
                        <p class="field-error">{{ $message }}</p>
                    @enderror
                </div>
                <div class="form-actions"><a class="button secondary" href="{{ route('expenses.index') }}">Batal</a><button
                        class="button" type="submit" @disabled(!count($categories))><x-icon name="check" />Simpan
                        transaksi</button></div>
            </form>
        </section>
        <aside class="form-aside"><span class="aside-icon"><x-icon name="wallet" /></span>
            <h2>Setiap catatan berarti.</h2>
            <p>Pemasukan dan pengeluaran dicatat terpisah agar perhitungan arus kas tetap jelas.</p>
            <div class="aside-tip"><x-icon name="info" />
                <p>Tanggal mengikuti waktu pencatatan. Ringkasan memakai zona waktu Asia/Jakarta.</p>
            </div>
        </aside>
    </div>
@endsection

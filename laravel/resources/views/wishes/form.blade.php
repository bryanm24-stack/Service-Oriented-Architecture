@extends('layouts.app')
@section('title', $wish ? 'Edit Wish' : 'Tambah Wish')
@section('content')
    <div class="page-heading">
        <div>
            <a class="back-link" href="{{ route('wishes.index') }}"><x-icon name="left" />Kembali ke Wish</a>
            <h1>{{ $wish ? 'Edit Wish' : 'Tambah Wish' }}</h1>
            <p class="subtitle">Masukkan barang dan pilih metode pembayarannya.</p>
        </div>
    </div>
    <div class="form-layout">
        <section class="panel form-panel">
            <div class="section-heading"><h2>Detail pembelian</h2><span class="section-icon"><x-icon name="sparkle" /></span></div>
            <form method="post" action="{{ $wish ? route('wishes.update', $wish['id_wish']) : route('wishes.store') }}" data-mutation>
                @csrf
                @if ($wish) @method('PUT') @endif
                <div class="field">
                    <label for="name">Nama barang</label>
                    <input id="name" name="name" type="text" maxlength="180" required value="{{ old('name', $wish['name'] ?? '') }}" placeholder="Contoh: Laptop baru">
                    @error('name')<p class="field-error">{{ $message }}</p>@enderror
                </div>
                <div class="field">
                    <label for="price">Harga barang (Rp)</label>
                    <input id="price" name="price" type="number" min="0.01" step="0.01" required value="{{ old('price', $wish['price'] ?? '') }}" placeholder="15000000">
                    @error('price')<p class="field-error">{{ $message }}</p>@enderror
                </div>
                <div class="field">
                    <label for="payment_method">Metode pembayaran</label>
                    <select id="payment_method" name="payment_method" required>
                        <option value="cash" @selected(old('payment_method', $wish['payment_method'] ?? 'cash') === 'cash')>Cash</option>
                        <option value="installment" @selected(old('payment_method', $wish['payment_method'] ?? '') === 'installment')>Cicilan</option>
                    </select>
                    @error('payment_method')<p class="field-error">{{ $message }}</p>@enderror
                </div>
                <div id="installment-fields" @if(old('payment_method', $wish['payment_method'] ?? 'cash') !== 'installment') hidden @endif>
                    <div class="field">
                        <label for="down_payment">Uang muka (Rp)</label>
                        <input id="down_payment" name="down_payment" type="number" min="0" step="0.01" value="{{ old('down_payment', $wish['down_payment'] ?? '0.00') }}" placeholder="3000000">
                        @error('down_payment')<p class="field-error">{{ $message }}</p>@enderror
                    </div>
                    <div class="field">
                        <label for="tenor_type">Jenis tenor</label>
                        <select id="tenor_type" name="tenor_type">
                            <option value="months" @selected(old('tenor_type', 'months') === 'months')>Bulan</option>
                            <option value="years" @selected(old('tenor_type') === 'years')>Tahun</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="tenor_value">Lama tenor</label>
                        <input id="tenor_value" name="tenor_value" type="number" min="1" max="120" value="{{ old('tenor_value', isset($wish['tenor_months']) ? $wish['tenor_months'] : '') }}" placeholder="12">
                        <p class="field-help">Maksimal 120 bulan atau 10 tahun. Jadwal cicilan dibuat otomatis setiap bulan.</p>
                        @error('tenor_value')<p class="field-error">{{ $message }}</p>@enderror
                    </div>
                </div>
                <div class="form-actions">
                    <a class="button secondary" href="{{ route('wishes.index') }}">Batal</a>
                    <button class="button" type="submit"><x-icon name="check" />{{ $wish ? 'Simpan perubahan' : 'Simpan Wish' }}</button>
                </div>
            </form>
        </section>
        <aside class="form-aside">
            <span class="aside-icon"><x-icon name="wallet" /></span>
            <h2>Rencanakan sebelum membeli.</h2>
            <p>Cash menyimpan harga barang sebagai rencana pembayaran. Cicilan menyimpan uang muka, tenor, dan snapshot nominal untuk setiap periode.</p>
            <div class="aside-tip"><x-icon name="info" /><p>Saat tombol Bayar digunakan, aplikasi membuat transaksi pengeluaran dan menyimpan ID transaksi sebagai referensi pembayaran.</p></div>
        </aside>
    </div>
    <script>
        (() => {
            const method = document.getElementById('payment_method');
            const fields = document.getElementById('installment-fields');
            const down = document.getElementById('down_payment');
            const tenor = document.getElementById('tenor_value');
            const type = document.getElementById('tenor_type');
            const sync = () => {
                const installment = method.value === 'installment';
                fields.hidden = !installment;
                down.required = installment;
                tenor.required = installment;
                down.disabled = !installment;
                tenor.disabled = !installment;
                type.disabled = !installment;
            };
            method.addEventListener('change', sync);
            sync();
        })();
    </script>
@endsection

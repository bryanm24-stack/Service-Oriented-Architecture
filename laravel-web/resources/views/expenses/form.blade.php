@extends('layouts.app')
@section('title', $expense ? 'Edit pengeluaran' : 'Tambah pengeluaran')
@section('content')
    <div class="page-heading">
        <div><a class="back-link" href="{{ route('expenses.index') }}"><x-icon name="left" />Kembali ke catatan</a>
            <h1>{{ $expense ? 'Edit pengeluaran' : 'Catat pengeluaran' }}</h1>
            <p class="subtitle">Satu catatan hari ini membantu rencana esok.</p>
        </div>
    </div>
    <div class="form-layout">
        <section class="panel form-panel">
            <div class="section-heading">
                <h2>Detail pengeluaran</h2><span class="section-icon"><x-icon name="receipt" /></span>
            </div>
            <form method="post"
                action="{{ $expense ? route('expenses.update', $expense['id_transaction']) : route('expenses.store') }}"
                data-mutation>@csrf @if ($expense)
                    @method('PATCH')
                @endif
                <div class="field"><label for="nominal">Nominal pengeluaran <span class="required">*</span></label>
                    <div class="currency-input"><span>Rp</span><input id="nominal" name="nominal" type="text"
                            inputmode="decimal" value="{{ old('nominal', $expense['nominal'] ?? '') }}" placeholder="15000"
                            required maxlength="16" aria-describedby="nominal-help"
                            @error('nominal') aria-invalid="true" @enderror></div>
                    <p class="field-help" id="nominal-help">Tanpa pemisah ribuan. Contoh: 15000 atau 15000.50.</p>
                    @error('nominal')
                        <p class="field-error">{{ $message }}</p>
                    @enderror
                </div>
                <div class="field"><label for="id_category">Kategori <span class="required">*</span></label><select
                        id="id_category" @if (!$expense) name="id_category" required @else disabled @endif
                        @error('id_category') aria-invalid="true" @enderror>
                        <option value="">Pilih kategori</option>
                        @foreach ($categories as $category)
                            <option value="{{ $category['id'] }}" @selected((string) old('id_category', $expense['id_category'] ?? '') === (string) $category['id'])>{{ $category['name'] }}
                            </option>
                        @endforeach
                    </select>
                    @if ($expense)
                        <p class="field-help">Kategori catatan ini dipertahankan.</p>
                    @elseif(!count($categories))
                        <p class="field-help">Kategori belum tersedia. Siapkan kategori melalui API terlebih dahulu.</p>
                    @endif @error('id_category')
                    <p class="field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="field"><label for="catatan">Catatan <span class="optional">opsional</span></label>
                <textarea id="catatan" name="catatan" rows="3" maxlength="10000" placeholder="Contoh: makan siang di kampus">{{ old('catatan', $expense['catatan'] ?? '') }}</textarea>
                @error('catatan')
                    <p class="field-error">{{ $message }}</p>
                @enderror
            </div>
            <div class="form-actions"><a class="button secondary" href="{{ route('expenses.index') }}">Batal</a><button
                    class="button" type="submit" @disabled(!$expense && !count($categories))><x-icon
                        name="check" />{{ $expense ? 'Simpan perubahan' : 'Simpan pengeluaran' }}</button></div>
        </form>
    </section>
    <aside class="form-aside"><span class="aside-icon"><x-icon name="sparkle" /></span>
        <h2>Kebiasaan kecil, dampak besar.</h2>
        <p>Catat pengeluaran saat masih ingat. Anggaran lebih mudah dijaga ketika setiap catatan tersusun rapi.</p>
        <div class="aside-tip"><x-icon name="info" />
            <p>Tanggal mengikuti waktu pencatatan pada sistem.</p>
        </div>
    </aside>
</div>
@endsection

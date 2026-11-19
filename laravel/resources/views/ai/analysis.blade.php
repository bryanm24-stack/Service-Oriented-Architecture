@extends('layouts.app')
@section('title', 'Analisis AI')
@section('content')
<div class="page-heading"><div><p class="eyebrow">Asisten keuangan pribadi</p><h1>Analisis AI</h1><p class="subtitle">Ajukan pertanyaan berdasarkan transaksi keuangan milik akun ini.</p></div><a class="button secondary" href="{{ route('tokens.wallet') }}">Lihat kuota AI</a></div>
<div class="ai-layout">
    <section class="panel ai-form-panel">
        <div class="section-heading"><div><h2>Tanyakan kondisi keuanganmu</h2><p class="muted small">Konteks transaksi diambil otomatis dari akunmu.</p></div></div>
        <div class="ai-balance"><div><span class="small-label">Saldo tersedia</span><strong>{{ number_format((int) $wallet['available_tokens'], 0, ',', '.') }} <small>token</small></strong></div><a href="{{ route('tokens.index') }}" class="text-link">Beli token <x-icon name="arrow" /></a></div>
        @if((int) $wallet['available_tokens'] < 1)
            <div class="catalog-notice"><x-icon name="info" /><div><strong>Saldo token tidak mencukupi</strong><p>Beli paket token terlebih dahulu sebelum meminta analisis.</p><a href="{{ route('tokens.index') }}" class="text-link">Buka katalog token <x-icon name="arrow" /></a></div></div>
        @endif
        <form method="post" action="{{ route('ai.analyze') }}" class="stack-form">
            @csrf
            <input type="hidden" name="idempotency_key" value="{{ (string) \Illuminate\Support\Str::uuid() }}">
            <label><span class="small-label">Periode keuangan</span><input type="month" name="period" value="{{ old('period', $period) }}" required></label>
            <label><span class="small-label">Pertanyaan</span><textarea name="question" rows="6" maxlength="6000" placeholder="Contoh: Mengapa pengeluaran bulan ini meningkat dan kategori apa yang perlu saya kendalikan?" required>{{ old('question', $question ?? '') }}</textarea><small class="muted">Jangan masukkan password, nomor rekening, atau informasi rahasia.</small></label>
            <fieldset class="answer-length"><legend class="small-label">Panjang jawaban</legend>
                <label><input type="radio" name="answer_length" value="short" @checked(old('answer_length', $answerLength ?? 'normal') === 'short')><span><strong>Singkat</strong><small>Ringkasan inti</small></span></label>
                <label><input type="radio" name="answer_length" value="normal" @checked(old('answer_length', $answerLength ?? 'normal') === 'normal')><span><strong>Normal</strong><small>Insight dan saran</small></span></label>
                <label><input type="radio" name="answer_length" value="detailed" @checked(old('answer_length', $answerLength ?? 'normal') === 'detailed')><span><strong>Rinci</strong><small>Analisis lebih lengkap</small></span></label>
            </fieldset>
            <button class="button full" type="submit" @disabled((int) $wallet['available_tokens'] < 1)>Analisis keuangan <x-icon name="arrow" /></button>
            <p class="muted small">Penggunaan token dihitung dari input dan output aktual yang dilaporkan provider. Permintaan ambigu tidak otomatis dikirim ulang.</p>
        </form>
    </section>
    <aside class="panel ai-info-panel"><h2>Bagaimana kuota dihitung?</h2><ul><li>Kuota ditahan sebelum permintaan dikirim.</li><li>Setelah provider merespons, debit dihitung dari input + output aktual.</li><li>Sisa reservasi dikembalikan ke saldo tersedia.</li><li>Jika hasil provider tidak pasti, status menjadi perlu pemeriksaan dan saldo tetap ditahan.</li></ul><a class="text-link" href="{{ route('tokens.wallet') }}">Buka riwayat kuota <x-icon name="arrow" /></a></aside>
</div>
@if($result)
<section class="panel ai-result-panel">
    @if(($result['status'] ?? '') === 'needs_reconciliation')
        <div class="catalog-notice"><x-icon name="info" /><div><strong>Permintaan perlu pemeriksaan</strong><p>{{ $result['message'] ?? 'Provider telah memproses permintaan, tetapi metadata pemakaian belum dapat dipastikan. Kuota tetap ditahan sementara.' }}</p></div></div>
    @else
        <div class="section-heading"><div><p class="eyebrow">Hasil analisis</p><h2>Jawaban asisten</h2></div><span class="tag">{{ number_format((int) ($result['usage']['actual_tokens'] ?? 0), 0, ',', '.') }} token digunakan</span></div>
        <div class="ai-answer">{{ $result['answer'] ?? '' }}</div>
        @if(isset($result['usage']))
        <div class="ai-usage-result"><div><span class="muted small">Input aktual</span><strong>{{ number_format((int) $result['usage']['input_tokens'], 0, ',', '.') }} token</strong></div><div><span class="muted small">Output aktual</span><strong>{{ number_format((int) $result['usage']['output_tokens'], 0, ',', '.') }} token</strong></div><div><span class="muted small">Sisa kuota tersedia</span><strong>{{ number_format((int) $result['wallet']['available_tokens'], 0, ',', '.') }} token</strong></div></div>
        @endif
    @endif
    <a class="text-link" href="{{ route('tokens.wallet') }}">Lihat riwayat penggunaan <x-icon name="arrow" /></a>
</section>
@endif
@endsection

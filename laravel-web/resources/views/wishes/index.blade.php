@extends('layouts.app')
@section('title', 'Wish / Cicilan')
@section('content')
    <div class="page-heading">
        <div>
            <p class="eyebrow">Rencana pembelian</p>
            <h1>Wish / Cicilan</h1>
            <p class="subtitle">Rencanakan pembelian secara cash atau cicilan, lalu pantau jadwal pembayarannya.</p>
        </div>
        <a class="button" href="{{ route('wishes.create') }}"><x-icon name="plus" />Tambah Wish</a>
    </div>

    @php
        $totalPlanned = $wishes->where('status', 'planned')->count();
        $totalPaid = $wishes->where('status', 'paid')->count();
        $totalValue = $wishes->sum(fn ($wish) => (float) ($wish['price'] ?? 0));
    @endphp
    <div class="cash-flow-grid">
        <section class="panel metric"><p class="muted small">Total rencana</p><strong>{{ $wishes->count() }}</strong><span class="small muted">Wish tersimpan</span></section>
        <section class="panel metric"><p class="muted small">Belum lunas</p><strong class="expense-value">{{ $totalPlanned }}</strong><span class="small muted">Status Planned</span></section>
        <section class="panel metric"><p class="muted small">Sudah lunas</p><strong class="income-value">{{ $totalPaid }}</strong><span class="small muted">Status Paid</span></section>
    </div>

    <section class="panel">
        <div class="section-heading"><div><h2>Daftar wishlist</h2><p class="muted small">Total nilai rencana {{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $totalValue)) }}</p></div></div>
        @forelse ($wishes as $wish)
            <article class="panel" style="margin-bottom:16px">
                <div class="section-heading">
                    <div>
                        <h2>{{ $wish['name'] }}</h2>
                        <p class="muted small">{{ $wish['payment_method'] === 'cash' ? 'Pembayaran cash' : 'Pembayaran cicilan' }} · Dibuat {{ \Carbon\CarbonImmutable::parse($wish['createdAt'])->locale('id')->translatedFormat('d M Y') }}</p>
                    </div>
                    <span class="transaction-type {{ $wish['status'] === 'paid' ? 'income-tag' : 'expense-tag' }}">{{ $wish['status'] === 'paid' ? 'Paid' : 'Planned' }}</span>
                </div>
                <div class="cash-flow-grid">
                    <div><p class="muted small">Harga barang</p><strong>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $wish['price'])) }}</strong></div>
                    @if ($wish['payment_method'] === 'installment')
                        <div><p class="muted small">Uang muka</p><strong>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $wish['down_payment'])) }}</strong></div>
                        <div><p class="muted small">Tenor</p><strong>{{ $wish['tenor_months'] }} bulan</strong></div>
                    @endif
                </div>
                @if ($wish['payment_method'] === 'installment')
                    <div class="table-scroll" style="margin-top:16px">
                        <table class="expense-table">
                            <thead><tr><th>Periode</th><th>Jatuh tempo</th><th>Nominal</th><th>Status</th><th>Aksi</th></tr></thead>
                            <tbody>
                                @foreach (($wish['installment_schedules'] ?? []) as $schedule)
                                    <tr>
                                        <td>Cicilan {{ $schedule['period_number'] }}</td>
                                        <td>{{ \Carbon\CarbonImmutable::parse($schedule['due_date'])->locale('id')->translatedFormat('d M Y') }}</td>
                                        <td>{{ \App\Support\Money::rupiah(\App\Support\Money::cents((string) $schedule['amount_snapshot'])) }}</td>
                                        <td><span class="transaction-type {{ $schedule['status'] === 'paid' ? 'income-tag' : 'expense-tag' }}">{{ $schedule['status'] === 'paid' ? 'Paid' : 'Planned' }}</span></td>
                                        <td>
                                            @if ($schedule['status'] === 'planned')
                                                <form method="post" action="{{ route('wishes.installments.pay', [$wish['id_wish'], $schedule['id_installment']]) }}" data-mutation>
                                                    @csrf<button class="button secondary compact-button" type="submit">Bayar</button>
                                                </form>
                                            @else
                                                <span class="muted small">Transaksi #{{ $schedule['transaction_id'] }}</span>
                                            @endif
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    @if ($wish['status'] === 'planned')
                        <form method="post" action="{{ route('wishes.pay', $wish['id_wish']) }}" style="margin-top:16px" data-mutation>
                            @csrf<button class="button" type="submit"><x-icon name="check" />Bayar cash</button>
                        </form>
                    @elseif (!empty($wish['paid_transaction_id']))
                        <p class="muted small">Transaksi pembayaran #{{ $wish['paid_transaction_id'] }}</p>
                    @endif
                @endif
                <div class="row-actions" style="margin-top:14px">
                    @if ($wish['status'] === 'planned' && collect($wish['installment_schedules'] ?? [])->where('status', 'paid')->isEmpty())
                        <a class="button secondary compact-button" href="{{ route('wishes.edit', $wish['id_wish']) }}"><x-icon name="edit" />Edit</a>
                        <form method="post" action="{{ route('wishes.destroy', $wish['id_wish']) }}" data-confirm>
                            @csrf @method('DELETE')<button class="button secondary compact-button" type="submit"><x-icon name="trash" />Hapus</button>
                        </form>
                    @endif
                </div>
            </article>
        @empty
            <x-empty-state title="Belum ada wishlist" description="Tambahkan barang yang ingin dibeli dan tentukan metode pembayaran cash atau cicilan." />
            <a class="button empty-action" href="{{ route('wishes.create') }}"><x-icon name="plus" />Buat Wish pertama</a>
        @endforelse
    </section>
@endsection
